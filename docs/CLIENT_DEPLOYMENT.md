# Deploy no cliente

Este guia prepara uma instalacao `single-tenant` do Ad Rock UTM Builder em servidor Linux com Nginx, Node.js e PostgreSQL.

## O que a versao atual entrega

- Frontend React/Vite buildado em `dist/`
- Backend Express com autenticacao propria
- Usuarios, campanhas, links e historico governado
- Fluxo de UTMs para campanhas com campanha, grupo de anuncio e tipo de anuncio
- Area administrativa para selects, canais GA4 e logo do topo
- Exportacao CSV de links e campanhas
- Auditoria de login, setup e alteracoes principais
- Headers de seguranca com Helmet
- Rate limit global configuravel
- Logs HTTP via Morgan e logs de proxy via Nginx
- Templates de Nginx, systemd, logrotate, backup e GitHub Actions
- Integracao opcional Bitly em `bit.ly/nome-do-link`
- Area de documentos para centralizar URLs de planilhas modelo e materiais de apoio

## Checklist antes de subir

- Dominio ou subdominio definido, por exemplo `utm.cliente.com.br`
- Servidor Linux com acesso SSH
- Node.js LTS instalado
- Nginx instalado
- PostgreSQL criado, local ou RDS
- Usuario do banco com permissao no database do projeto
- Certificado SSL configurado com Certbot ou ACM/ALB
- Secrets do GitHub configuradas se o deploy automatico for usado

## Variaveis de ambiente

Frontend, em `.env.production`:

```bash
VITE_API_PROXY_TARGET=https://utm.cliente.com.br
```

Backend, em `server/.env` no servidor:

```bash
NODE_ENV=production
PORT=5101
APP_BASE_URL=https://utm.cliente.com.br
CORS_ORIGIN=https://utm.cliente.com.br
DATABASE_URL=postgres://usuario:senha@host:5432/adrock_utm_builder
DATABASE_SSL=true
JWT_SECRET=gere-um-segredo-longo-com-openssl-rand-hex-32
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
BITLY_ENABLED=false
BITLY_ACCESS_TOKEN=
BITLY_GROUP_GUID=
BITLY_DOMAIN=bit.ly
```

Gerar segredo:

```bash
openssl rand -hex 32
```

## Primeiro deploy manual

No servidor:

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:www-data /var/www
cd /var/www
git clone https://github.com/adrockmkt/utm_builder_adrock.git
cd utm_builder_adrock
```

Criar os arquivos de ambiente:

```bash
cp .env.production.example .env.production
cp server/.env.production.example server/.env
```

Editar os valores reais:

```bash
nano .env.production
nano server/.env
```

Instalar e buildar:

```bash
npm ci
npm run build
cd server
npm ci --omit=dev
cd ..
```

Instalar o servico:

```bash
sudo cp deploy/systemd/utm-builder-api.service /etc/systemd/system/utm-builder-api.service
sudo systemctl daemon-reload
sudo systemctl enable utm-builder-api
sudo systemctl start utm-builder-api
sudo systemctl status utm-builder-api
```

Instalar Nginx:

```bash
sudo cp deploy/nginx/utm-builder-subdomain.conf /etc/nginx/sites-available/utm-builder.conf
sudo ln -s /etc/nginx/sites-available/utm-builder.conf /etc/nginx/sites-enabled/utm-builder.conf
sudo nginx -t
sudo systemctl reload nginx
```

Configurar SSL com Certbot:

```bash
sudo certbot --nginx -d utm.cliente.com.br
```

## Validacao pos-deploy

Abrir:

```text
https://utm.cliente.com.br
```

Validar:

- Tela de setup inicial aparece no primeiro acesso
- Admin inicial e criado
- Login funciona
- Health mostra banco conectado
- Campanha pode ser criada
- Link pode ser criado e salvo
- Link de campanha preenche `utm_campaign`, `utm_term` e `utm_content` a partir de campanha, grupo de anuncio e conteudo/peca
- Area `Cadastros` permite alterar tipos de acao, destinos, tipos de anuncio, canais GA4 e logo
- Exportacao CSV baixa arquivo
- Auditoria mostra login e alteracoes

## Integracao Bitly

A feature de encurtamento com Bitly esta implementada e documentada em [Integracao Bitly](./BITLY_INTEGRATION.md).

Decisao recomendada:

- usar `bit.ly/nome-do-link`
- nao usar dominio proprio
- nao mexer em DNS
- guardar o token Bitly somente no backend
- orientar uso para acoes offline, QR codes, eventos e materiais em que o link com UTM fique grande demais

Para ativar, o cliente precisa gerar um token API na conta Bitly e informar o `group_guid` correto da conta/workspace.

Health check direto:

```bash
curl -s https://utm.cliente.com.br/api/health
```

## Deploy automatico pelo GitHub Actions

O workflow esta em `.github/workflows/deploy.yml`.

Criar as secrets no GitHub:

- `DEPLOY_HOST`: IP ou host do servidor
- `DEPLOY_USER`: usuario SSH
- `DEPLOY_SSH_KEY`: chave privada SSH
- `DEPLOY_PORT`: porta SSH, opcional

Preparar o servidor para deploy automatico:

```bash
cd /var/www/utm_builder
git remote -v
sudo systemctl status utm-builder-api
```

O workflow esta configurado para execucao manual por `workflow_dispatch`. Quando acionado manualmente, ele:

- entra no servidor por SSH
- atualiza o repositorio
- roda `npm ci`
- roda `npm run build`
- roda `npm ci --omit=dev` no backend
- reinicia o backend
- testa e recarrega o Nginx

## Backups

Instalar o timer:

```bash
sudo cp deploy/systemd/utm-builder-backup.service /etc/systemd/system/utm-builder-backup.service
sudo cp deploy/systemd/utm-builder-backup.timer /etc/systemd/system/utm-builder-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now utm-builder-backup.timer
```

Rodar backup manual:

```bash
sudo systemctl start utm-builder-backup.service
```

Listar backups:

```bash
sudo ls -lh /var/backups/utm_builder
```

Restaurar backup:

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" /var/backups/utm_builder/arquivo.dump
```

Para RDS, tambem habilite automated backups e snapshot antes de mudancas grandes.

## Logs e monitoramento

Backend:

```bash
journalctl -u utm-builder-api -f
```

Nginx:

```bash
tail -f /var/log/nginx/utm_builder.access.log
tail -f /var/log/nginx/utm_builder.error.log
```

Instalar logrotate:

```bash
sudo cp deploy/logrotate/utm-builder /etc/logrotate.d/utm-builder
```

Em infraestrutura com monitoramento centralizado, enviar logs para o agente/servico escolhido pelo cliente.

## Rollback

Ver commits recentes:

```bash
git log --oneline -5
```

Voltar para um commit conhecido:

```bash
git checkout <commit>
npm ci
npm run build
cd server
npm ci --omit=dev
sudo systemctl restart utm-builder-api
sudo systemctl reload nginx
```

Depois, investigar e voltar para `main` quando a correcao estiver pronta:

```bash
git checkout main
git pull
```

## Pontos de atencao

- Nao commitar `.env` real.
- Nao usar `JWT_SECRET=change-me` em producao.
- Confirmar que `DATABASE_URL` aponta para o banco do cliente.
- Confirmar que `CORS_ORIGIN` bate exatamente com o dominio publico.
- Ativar SSL antes de entregar acesso ao cliente.
- Testar backup e restore antes de considerar a instalacao finalizada.
