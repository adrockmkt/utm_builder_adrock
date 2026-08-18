# Auditoria de seguranca - 2026-07-23

Ambiente avaliado:

- Producao AWS Lightsail
- URL: `https://utms.porvir.org`
- Data: 2026-07-23

## Resumo executivo

A bateria segura inicial nao encontrou exposicao direta de rotas protegidas sem token, PostgreSQL publico ou arquivos sensiveis com permissao aberta.

Foram identificados e corrigidos dois hardenings:

- frontend estatico nao retornava os mesmos headers de seguranca da API
- arquivos `.dump` de backup podiam ser lidos pelo grupo `www-data`; agora ficam `600`

O `npm audit` foi executado apos aprovacao explicita. Frontend de producao nao apresentou vulnerabilidades. Backend apresentou uma vulnerabilidade baixa em dependencia transitiva (`body-parser`), corrigida com `npm audit fix` sem `--force`.

## Testes executados

### Health checks

Resultado:

```json
{"status":"ok","service":"adrock-utm-builder-api","database":"connected","backup":{"status":"ok"}}
```

Status:

- API ativa
- banco conectado
- ultimo backup local registrado

### Rotas protegidas sem token

Rotas testadas:

- `/api/users`
- `/api/audit-logs`
- `/api/utm-links`
- `/api/utm-campaigns`
- `/api/documents`
- `/api/exports/utm-links.csv`

Resultado esperado e observado:

```text
401 {"error":"Token ausente."}
```

Status: aprovado.

### Endpoint publico de marca

Resultado:

```text
/api/settings/public-brand -> 200
/api/settings -> 401
```

Status: aprovado.

### Metodos indevidos sem token

Metodos testados em `/api/users`:

- `POST`
- `PUT`
- `PATCH`
- `DELETE`

Resultado esperado e observado:

```text
401
```

Status: aprovado.

### Login invalido

Teste com usuario inexistente e senha invalida:

```text
401 {"error":"Credenciais inválidas."}
```

Status: aprovado.

### Headers

API ja retornava headers de seguranca via Helmet:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- rate limit headers

Achado:

- O frontend estatico retornava apenas headers basicos do Nginx.

Correcao:

- Adicionados headers de seguranca aos templates Nginx:
  - `Content-Security-Policy`
  - `Permissions-Policy`
  - `Referrer-Policy`
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`

Status: corrigido no codigo; aplicar/revalidar no servidor.

### PostgreSQL

Resultado:

```text
127.0.0.1:5432
```

Status:

- PostgreSQL escutando apenas em localhost.
- Aprovado.

### Arquivos sensiveis

Arquivos encontrados com referencias a segredos:

- documentacao e exemplos versionados sem valores reais
- `server/.env`
- `server/.env.backup_20260721_182056`

Permissoes no servidor:

```text
-rw------- ubuntu:ubuntu /var/www/utm_builder/server/.env
-rw------- ubuntu:ubuntu /var/www/utm_builder/server/.env.backup_20260721_182056
```

Status:

- arquivos reais restritos a `600`
- aprovado

Observacao:

- O arquivo `.env.backup_20260721_182056` contem provaveis segredos antigos. Como esta `600`, nao e exposicao aberta, mas pode ser removido ou movido para uma area de backup administrativa se nao for mais necessario.

### Backup local

Resultado:

```text
/var/backups/utm_builder
postgres:www-data
dump: postgres:www-data
```

Achado:

- Arquivos `.dump` estavam `640`, legiveis pelo grupo `www-data`.

Correcao:

- Ajustado para `600`.
- Health check continua lendo metadados do ultimo backup sem ler o conteudo do dump.

Status: corrigido no servidor e no script.

### Disco

Resultado:

```text
/dev/root 38G total, 5.0G usado, 33G livre, 14%
```

Status: aprovado para backup local com retencao inicial de 30 dias.

### Dependencias npm

Frontend completo:

```text
2 vulnerabilidades em devDependencies relacionadas a Vite/esbuild.
```

Classificacao:

- impacto ligado ao servidor de desenvolvimento do Vite
- nao afeta o build estatico servido em producao
- correcao indicada pelo npm exige `npm audit fix --force` e salto para `vite@8`, com breaking change

Frontend producao (`npm audit --omit=dev`):

```text
found 0 vulnerabilities
```

Backend completo/producao:

```text
body-parser <1.20.6
Severity: low
corrigido para body-parser 1.20.6
```

Classificacao:

- baixa severidade
- dependencia transitiva do backend
- correcao automatica aplicada em etapa controlada, sem `--force`

## Achados

### Medio - Frontend sem headers de seguranca no Nginx

Impacto:

- Navegador recebia menos protecoes no HTML estatico do app.

Correcao:

- Headers adicionados aos templates Nginx.

Status:

- Corrigido no codigo.
- Aplicado no `/etc/nginx/sites-available/utms.porvir.org` via snippet `/etc/nginx/snippets/utm-builder-security-headers.conf`.
- Revalidado com `curl -I https://utms.porvir.org`.

### Baixo - Dump de backup legivel pelo grupo `www-data`

Impacto:

- Em caso de comprometimento do processo da API, o dump poderia ser lido diretamente.

Correcao:

- Arquivos `.dump` ajustados para `600`.

Status:

- Corrigido no servidor e no script.

### Baixo - Arquivo `.env.backup_20260721_182056` preservado no servidor

Impacto:

- Nao esta aberto, mas aumenta superficie de segredos armazenados.

Recomendacao:

- Remover se nao houver necessidade operacional, ou mover para local administrativo fora da pasta da aplicacao.

Status:

- Pendente de decisao operacional.

### Baixo - Vulnerabilidade transitiva no backend (`body-parser`)

Impacto:

- Possivel denial of service em cenario especifico de limite invalido no parser.

Status:

- Identificado pelo `npm audit`.
- Corrigido via `npm audit fix` no backend.
- `npm audit --omit=dev --audit-level=low` retornou 0 vulnerabilidades no backend.

### Controlado - Vite/esbuild em devDependencies

Impacto:

- Vulnerabilidade associada ao servidor de desenvolvimento.
- Producao serve frontend estatico via Nginx, nao o dev server do Vite.

Status:

- `npm audit --omit=dev` no frontend retornou 0 vulnerabilidades.
- Nao aplicar `npm audit fix --force` sem planejar migracao de Vite, pois a sugestao instala `vite@8` com breaking change.

## Proximos passos recomendados

1. Decidir destino do `server/.env.backup_20260721_182056`.
2. Rodar testes autenticados por perfil (`viewer`, `editor`, `admin`) com usuarios de teste.
3. Em janela combinada, rodar OWASP ZAP baseline sem ataque ativo agressivo.
