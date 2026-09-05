# Migracao para AWS Lightsail

Este guia prepara a migracao da instalacao atual em DigitalOcean para um servidor AWS Lightsail mantendo o banco ja populado com usuarios, campanhas, links, documentos, Bitlys e configuracoes.

Enquanto a AWS Lightsail nao estiver pronta, a DigitalOcean continua sendo a producao operacional. Como a equipe segue criando links diariamente, a migracao para AWS deve usar um backup novo tirado na janela final de troca, e nao um dump antigo.

## Dados de acesso do Lightsail Porvir

- usuario SSH: `ubuntu`
- IP fixo da instancia: `56.126.38.231`
- subdominio configurado com entrada A: `utms.porvir.org`
- chave publica atual do Mac para liberacao SSH: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOeaDPRcbOC07KuwQaATKilznqXTFv1VkXW4VVF7woW3 rafael@adrockers.com.br`
- comando base de acesso:

```bash
ssh ubuntu@56.126.38.231
```

Se o acesso exigir chave `.pem` especifica do Lightsail, use:

```bash
ssh -i /caminho/para/chave-lightsail.pem ubuntu@56.126.38.231
```

Com a chave publica do Mac atual, o comando esperado e:

```bash
ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes ubuntu@56.126.38.231
```

## Registro operacional de acesso externo

Este projeto possui governanca por `spec-kit` em `.specify/` e `specs/`, mas dados de acesso de servidor externo devem ficar nesta documentacao operacional. Nao registrar chaves privadas, tokens, senhas, dumps de banco ou conteudo de `server/.env`.

Historico do acesso Lightsail:

- instancia informada pelo cliente: AWS Lightsail para `utms.porvir.org`
- usuario informado: `ubuntu`
- IP fixo informado: `56.126.38.231`
- DNS informado: entrada A de `utms.porvir.org` apontada para a instancia
- chave publica atual validada via `ssh-keygen -y -f ~/.ssh/id_ed25519`: `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOeaDPRcbOC07KuwQaATKilznqXTFv1VkXW4VVF7woW3 rafael@adrockers.com.br`
- observacao: a chave publica enviada anteriormente ao cliente tinha outro corpo (`...IMj3yy...`), portanto pode haver divergencia entre a chave liberada no servidor e a chave privada usada pelo Mac atual
- fingerprint da chave local testada: `SHA256:7meICKwUA6TqAIPozU7adGriGEDd+rWy+1Bs0UiDe2c`
- fingerprint do host vista no primeiro contato SSH: `SHA256:ENyFOJhbaH82367zKfAvD/Job9pgmve1U4KiB3uOqQE`
- status do ultimo teste: acesso SSH confirmado com sucesso apos atualizacao da chave publica no Lightsail

Diagnostico usado para validar o acesso:

```bash
ssh -i ~/.ssh/id_ed25519 -o IdentitiesOnly=yes -o BatchMode=yes ubuntu@56.126.38.231 "whoami && hostname && lsb_release -d"
```

Resultado confirmado:

- usuario remoto: `ubuntu`
- hostname interno: `ip-172-26-1-248`
- sistema operacional: `Ubuntu 24.04.4 LTS`

Diagnostico inicial do servidor:

- home inicial: `/home/ubuntu`
- Node.js: `v20.20.2`
- npm: `10.8.2`
- Nginx: `1.24.0`
- Git: `2.43.0`
- PostgreSQL client: `16.14`

Antes de iniciar a instalacao, ainda confirmar se o IP fixo `56.126.38.231` continua anexado a instancia correta no painel AWS Lightsail.

## Decisao importante

Nao versionar dump de banco no GitHub.

Motivos:

- o dump pode conter dados do cliente, usuarios, emails, links reais e historico operacional
- o dump pode expor configuracoes internas
- GitHub deve guardar codigo, documentacao e templates, nao backup operacional sensivel

O caminho correto e gerar um backup `.dump` com `pg_dump`, transferir por canal seguro para o Lightsail e restaurar no PostgreSQL de destino. Se for necessario arquivar um backup fora do servidor, use armazenamento privado como S3 com criptografia ou cofre seguro do cliente.

## Arquitetura recomendada no Lightsail

Para primeira instalacao do cliente:

- uma instancia Lightsail Ubuntu LTS
- Nginx servindo o frontend
- Node.js rodando a API via systemd
- PostgreSQL local na propria instancia, se o cliente quiser simplicidade

Para producao mais robusta:

- Lightsail para aplicacao
- banco gerenciado separado ou RDS PostgreSQL
- backup diario do PostgreSQL
- backup dos arquivos criticos do UTM Builder, sem snapshot da instancia inteira quando ela hospedar outros projetos

## O que sera migrado do banco

O backup leva:

- usuarios
- campanhas
- links com UTMs
- Bitlys salvos
- documentos cadastrados
- cadastros administrativos
- logo/nome do sistema
- auditoria

Nao leva:

- arquivos do repositorio
- `node_modules`
- `dist`
- segredos fora do banco, como `server/.env`

## Registro da migracao para Lightsail

Status em `2026-07-21`:

- backup novo gerado na DigitalOcean a partir do banco atual de producao
- dump restaurado no PostgreSQL do Lightsail
- codigo atualizado no Lightsail ate o commit `73930f3`
- frontend rebuildado para subdominio raiz com `VITE_APP_BASE_PATH=/` e `VITE_API_BASE_PATH=/api`
- API reiniciada via `utm-builder-api.service`
- Nginx validado e recarregado
- dominio validado: `https://utms.porvir.org`
- health check validado: `https://utms.porvir.org/api/health`
- dumps temporarios removidos da maquina local, DigitalOcean e Lightsail apos validacao
- configuracao Bitly aplicada no `server/.env` do Lightsail sem versionar token:
  - `BITLY_ENABLED=true`
  - `BITLY_GROUP_GUID` configurado
  - `BITLY_DOMAIN=bit.ly`
  - `BITLY_ACCESS_TOKEN` presente apenas no servidor

Contagens validadas apos restauracao:

- `utm_links`: 44
- `utm_campaigns`: 0
- `document_links`: 2
- `users`: 10

Observacao: a DigitalOcean continuava operacional durante a migracao. Se algum usuario criar novos links na DigitalOcean depois deste ponto, sera necessario gerar um novo dump antes da virada definitiva.

## Pos-migracao DigitalOcean

Status em `2026-07-21` apos validacao da AWS pelo cliente:

- ambiente oficial de uso: `https://utms.porvir.org`
- DigitalOcean mantida apenas como ambiente legado/referencia operacional
- backup do banco da DigitalOcean gerado antes da limpeza de usuarios
- usuarios da DigitalOcean removidos, mantendo apenas `rafael@adrock.com.br`
- links e documentos da DigitalOcean preservados
- contagens apos limpeza na DigitalOcean:
  - `users`: 1
  - `utm_links`: 44
  - `document_links`: 2
- AWS validada sem alteracao dos usuarios migrados:
  - `users`: 10
  - `utm_links`: 44
  - `document_links`: 2

## Antes da janela de migracao

No servidor atual:

```bash
cd /var/www/utm_builder
git status --short --branch
curl -s https://mobiledelivery.com.br/utm-builder/api/health
```

No novo Lightsail:

```bash
node -v
npm -v
nginx -v
git --version
psql --version
```

Instale o projeto no Lightsail usando `docs/CLIENT_DEPLOYMENT.md` como base, mas pare antes de criar dados novos de producao.

## Gerar backup no servidor atual

No DigitalOcean:

```bash
cd /var/www/utm_builder
source server/.env

BACKUP_DIR=/var/backups/utm_builder_manual \
DATABASE_URL="$DATABASE_URL" \
./scripts/backup-postgres.sh
```

Listar o arquivo gerado:

```bash
sudo ls -lh /var/backups/utm_builder_manual
```

O arquivo tera formato parecido com:

```text
utm_builder-20260713-120000.dump
```

## Copiar backup para o Lightsail

Copie por `scp` usando a chave SSH do Lightsail.

Exemplo a partir do servidor atual:

```bash
scp /var/backups/utm_builder_manual/utm_builder-YYYYMMDD-HHMMSS.dump ubuntu@56.126.38.231:/tmp/utm_builder.dump
```

O usuario SSH informado para o Lightsail Porvir e `ubuntu`.

## Restaurar no PostgreSQL do Lightsail

No Lightsail, garanta que o banco e usuario ja existem.

Exemplo:

```bash
sudo -u postgres psql
```

```sql
create user utm_builder_user with password 'SENHA_FORTE_AQUI';
create database adrock_utm_builder owner utm_builder_user;
grant all privileges on database adrock_utm_builder to utm_builder_user;
\q
```

Restaurar:

```bash
export DATABASE_URL='postgres://utm_builder_user:SENHA_FORTE_AQUI@127.0.0.1:5432/adrock_utm_builder'
pg_restore --clean --if-exists --dbname "$DATABASE_URL" /tmp/utm_builder.dump
```

Validar:

```bash
PGPASSWORD='SENHA_FORTE_AQUI' psql -h 127.0.0.1 -U utm_builder_user -d adrock_utm_builder -c 'select count(*) from utm_links;'
PGPASSWORD='SENHA_FORTE_AQUI' psql -h 127.0.0.1 -U utm_builder_user -d adrock_utm_builder -c 'select count(*) from document_links;'
```

## Configurar o server/.env no Lightsail

No Lightsail:

```bash
cd /var/www/utm_builder
nano server/.env
```

Campos principais:

```bash
NODE_ENV=production
PORT=5101
APP_BASE_URL=https://utms.porvir.org
CORS_ORIGIN=https://utms.porvir.org
DATABASE_URL=postgres://utm_builder_user:SENHA_FORTE_AQUI@127.0.0.1:5432/adrock_utm_builder
DATABASE_SSL=false
DATABASE_ALLOW_LOCAL=true
JWT_SECRET=GERAR_UM_SEGREDO_FORTE
SETUP_TOKEN=GERAR_UM_TOKEN_TEMPORARIO_PARA_SETUP
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
BITLY_ENABLED=true
BITLY_ACCESS_TOKEN=TOKEN_BITLY_DO_CLIENTE
BITLY_GROUP_GUID=GROUP_GUID_DO_CLIENTE
BITLY_DOMAIN=bit.ly
```

Gerar `JWT_SECRET`:

```bash
openssl rand -hex 32
```

## Build e start no Lightsail

```bash
cd /var/www/utm_builder
npm ci
VITE_APP_BASE_PATH=/ VITE_API_BASE_PATH=/api npm run build

cd server
npm ci --omit=dev

sudo cp ../deploy/systemd/utm-builder-api.service /etc/systemd/system/utm-builder-api.service
sudo systemctl daemon-reload
sudo systemctl enable utm-builder-api
sudo systemctl restart utm-builder-api
```

Validar API:

```bash
curl -s http://127.0.0.1:5101/api/health
```

## Nginx para o subdominio

Para `https://utms.porvir.org`, use o template de subdominio como base:

```bash
sudo cp deploy/nginx/utm-builder-subdomain.conf /etc/nginx/sites-available/utms.porvir.org
sudo nano /etc/nginx/sites-available/utms.porvir.org
```

No arquivo, ajuste:

```nginx
server_name utms.porvir.org;
root /var/www/utm_builder/dist;
client_max_body_size 4m;
```

Ativar:

```bash
sudo ln -s /etc/nginx/sites-available/utms.porvir.org /etc/nginx/sites-enabled/utms.porvir.org
sudo nginx -t
sudo systemctl reload nginx
```

Depois do DNS apontar para o Lightsail, emitir HTTPS com Certbot/Let's Encrypt para `utms.porvir.org`.

## Backup recorrente no Lightsail

Depois da migracao, instalar timer de backup:

```bash
cd /var/www/utm_builder
sudo cp deploy/systemd/utm-builder-backup.service /etc/systemd/system/utm-builder-backup.service
sudo cp deploy/systemd/utm-builder-backup.timer /etc/systemd/system/utm-builder-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now utm-builder-backup.timer
```

Rodar teste manual:

```bash
sudo systemctl start utm-builder-backup.service
sudo ls -lh /var/backups/utm_builder
```

## Checklist final

- [ ] dominio apontado para o Lightsail
- [ ] `utms.porvir.org` configurado no Nginx
- [ ] HTTPS ativo
- [ ] Nginx validado com `sudo nginx -t`
- [ ] API com `database: connected`
- [ ] login funcionando
- [ ] links antigos aparecem no catalogo
- [ ] documentos antigos aparecem em Documentos
- [ ] Bitly testado com um link sem conflito
- [ ] backup manual testado
- [ ] timer de backup ativo
- [ ] escopo de backup limitado ao UTM Builder validado
