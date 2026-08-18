# Deploy na DigitalOcean em /utm-builder

Este guia publica o sistema em:

```text
https://mobiledelivery.com.br/utm-builder/
```

O app foi preparado para rodar em subpasta usando:

- `VITE_APP_BASE_PATH=/utm-builder/`
- `VITE_API_BASE_PATH=/utm-builder/api`
- Nginx fazendo proxy de `/utm-builder/api/` para o backend interno em `127.0.0.1:5101/api/`

## Atualizar o ambiente atual

Use este bloco quando o codigo novo ja estiver no GitHub e o droplet ja estiver configurado:

```bash
cd /var/www/utm_builder
git fetch origin main
git reset --hard origin/main
npm ci
VITE_APP_BASE_PATH=/utm-builder/ VITE_API_BASE_PATH=/utm-builder/api npm run build
cd server
npm ci --omit=dev
cd ..
sudo systemctl restart utm-builder-api
sudo nginx -t
sudo systemctl reload nginx
```

O restart do `utm-builder-api` executa `server/src/db/schema.sql` novamente. Isso atualiza os presets oficiais de canais GA4 e inativa presets fora da lista oficial.

Validacao rapida:

```bash
curl -s https://mobiledelivery.com.br/utm-builder/api/health
```

## Git no droplet

Se o deploy for rodado como `root` e o Git reclamar de ownership:

```bash
git config --global --add safe.directory /var/www/utm_builder
```

O remote deve apontar para GitHub por SSH:

```bash
cd /var/www/utm_builder
git remote set-url origin git@github.com:adrockmkt/utm_builder.git
git remote -v
```

Para repositorio privado, configure uma deploy key somente leitura no GitHub em:

```text
adrockmkt/utm_builder > Settings > Deploy keys
```

No droplet, use uma chave dedicada:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
ssh-keygen -t ed25519 -C "adrock-bots utm_builder deploy" -f ~/.ssh/utm_builder_deploy -N ""
ssh-keyscan github.com >> ~/.ssh/known_hosts
cat ~/.ssh/utm_builder_deploy.pub
```

Cole a chave `.pub` como deploy key do repositorio. Depois configure o SSH:

```bash
cat > ~/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/utm_builder_deploy
  IdentitiesOnly yes
EOF

chmod 600 ~/.ssh/config ~/.ssh/utm_builder_deploy
ssh -T git@github.com
```

Se autenticar, `git fetch origin main` deve funcionar sem usuario/senha.

## 1. Requisitos no servidor

No droplet:

```bash
sudo apt update
sudo apt install -y nginx git postgresql-client
node -v
npm -v
```

Use Node.js LTS. Se ainda nao estiver instalado, instale pelo NodeSource ou pelo gerenciador que voce ja usa no servidor.

## 2. Clonar o projeto

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:www-data /var/www
cd /var/www
git clone https://github.com/adrockmkt/utm_builder.git
cd utm_builder
```

## 3. Configurar frontend

Criar `.env.production`:

```bash
cp .env.production.example .env.production
nano .env.production
```

Valores para `mobiledelivery.com.br/utm-builder`:

```bash
VITE_APP_BASE_PATH=/utm-builder/
VITE_API_BASE_PATH=/utm-builder/api
VITE_API_PROXY_TARGET=https://mobiledelivery.com.br
```

Build:

```bash
npm ci
VITE_APP_BASE_PATH=/utm-builder/ VITE_API_BASE_PATH=/utm-builder/api npm run build
```

## 4. Configurar backend

```bash
cp server/.env.production.example server/.env
nano server/.env
```

Exemplo:

```bash
NODE_ENV=production
PORT=5101
APP_BASE_URL=https://mobiledelivery.com.br/utm-builder
CORS_ORIGIN=https://mobiledelivery.com.br
DATABASE_URL=postgres://usuario:senha@host:5432/adrock_utm_builder
DATABASE_ALLOW_LOCAL=true
DATABASE_SSL=false
JWT_SECRET=cole-aqui-um-segredo-forte
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

Instalar dependencias do backend:

```bash
cd server
npm ci --omit=dev
cd ..
```

## 5. Subir backend com systemd

```bash
sudo cp deploy/systemd/utm-builder-api.service /etc/systemd/system/utm-builder-api.service
sudo systemctl daemon-reload
sudo systemctl enable utm-builder-api
sudo systemctl start utm-builder-api
sudo systemctl status utm-builder-api
```

Logs:

```bash
journalctl -u utm-builder-api -f
```

## 6. Configurar Nginx

O arquivo pronto esta em:

```text
deploy/nginx/utm-builder.conf
```

Se `mobiledelivery.com.br` ainda nao tiver um server block proprio:

```bash
sudo cp deploy/nginx/utm-builder.conf /etc/nginx/sites-available/utm-builder.conf
sudo ln -s /etc/nginx/sites-available/utm-builder.conf /etc/nginx/sites-enabled/utm-builder.conf
sudo nginx -t
sudo systemctl reload nginx
```

Se o dominio ja tiver um site configurado no Nginx, copie apenas estes blocos para dentro do `server { ... }` existente:

```nginx
location = /utm-builder {
  return 301 /utm-builder/;
}

location /utm-builder/api/ {
  proxy_pass http://127.0.0.1:5101/api/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}

location /utm-builder/ {
  alias /var/www/utm_builder/dist/;
  try_files $uri $uri/ /utm-builder/index.html;
}
```

Validar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Testar no navegador

Abra:

```text
https://mobiledelivery.com.br/utm-builder/
```

Teste tambem a API:

```bash
curl -s https://mobiledelivery.com.br/utm-builder/api/health
```

No primeiro acesso, o sistema deve pedir a criacao do administrador inicial.

Depois do login, valide tambem:

- Criacao de campanha
- Criacao de link pontual
- Criacao de link vinculado a campanha
- Preenchimento de grupo de anuncio e tipo de anuncio
- Exportacao CSV
- Area `Cadastros` para tipos de acao, destinos, tipos de anuncio, canais GA4 e logo do topo

## Integracao Bitly

A integracao Bitly esta implementada e documentada em:

```text
docs/BITLY_INTEGRATION.md
```

Para o ambiente atual, mantenha:

```bash
BITLY_ENABLED=false
BITLY_DOMAIN=bit.ly
```

Para ativar, configure `BITLY_ENABLED=true`, `BITLY_ACCESS_TOKEN`, `BITLY_GROUP_GUID` e `BITLY_DOMAIN=bit.ly` no `server/.env`, depois reinicie o `utm-builder-api`.

## 8. Atualizar depois de ajustes

```bash
cd /var/www/utm_builder
git fetch origin main
git reset --hard origin/main
npm ci
VITE_APP_BASE_PATH=/utm-builder/ VITE_API_BASE_PATH=/utm-builder/api npm run build
cd server
npm ci --omit=dev
cd ..
sudo systemctl restart utm-builder-api
sudo nginx -t
sudo systemctl reload nginx
```

Esse restart tambem reaplica o schema idempotente do banco, incluindo seeds oficiais como os canais GA4.

## 9. HTTPS

O ambiente atual usa HTTPS em `mobiledelivery.com.br`. Se precisar emitir ou renovar o certificado:

```bash
sudo certbot --nginx -d mobiledelivery.com.br
```

Confirme que estes valores estao nos arquivos de producao:

```bash
APP_BASE_URL=https://mobiledelivery.com.br/utm-builder
CORS_ORIGIN=https://mobiledelivery.com.br
VITE_API_PROXY_TARGET=https://mobiledelivery.com.br
```

Rode novo build e reinicie o backend.

## 10. Backup

Depois que o banco estiver configurado:

```bash
sudo cp deploy/systemd/utm-builder-backup.service /etc/systemd/system/utm-builder-backup.service
sudo cp deploy/systemd/utm-builder-backup.timer /etc/systemd/system/utm-builder-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now utm-builder-backup.timer
```

Backup manual:

```bash
sudo systemctl start utm-builder-backup.service
```
