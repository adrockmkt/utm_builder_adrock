# AWS Deployment

## Perfil da primeira instalação

- cliente: `Porvir.org`
- modelo: `single-tenant`
- banco dedicado
- autenticação e usuários próprios

## Stack mínima recomendada

- `EC2` para aplicação
- `RDS PostgreSQL`
- `Nginx`
- `CloudWatch`
- `S3` opcional

## Lightsail

Se o cliente fornecer AWS Lightsail, use o guia dedicado:

- [Migracao para AWS Lightsail](./LIGHTSAIL_MIGRATION.md)

O banco atual da DigitalOcean deve ser migrado via `pg_dump`/`pg_restore`. Nao salve dumps de banco no GitHub.

## Topologia inicial

1. `EC2`
   - frontend build servido por Nginx
   - backend Node rodando em porta interna
2. `RDS PostgreSQL`
   - banco exclusivo da instalação
3. `CloudWatch`
   - logs do app e do proxy
4. `Route 53` e `ACM`
   - DNS e certificado quando aplicável

## Variáveis esperadas

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `DATABASE_SSL`
- `JWT_SECRET`
- `APP_BASE_URL`
- `CORS_ORIGIN`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

## Operação de produção incluída no repositório

- `deploy/nginx/utm-builder-subdomain.conf`: proxy reverso para `/api` e frontend estático em subdomínio
- `deploy/nginx/utm-builder.conf`: proxy reverso para `/utm-builder/api` e frontend em subpasta
- `deploy/systemd/utm-builder-api.service`: backend Node como serviço
- `deploy/systemd/utm-builder-backup.*`: backup diário com `pg_dump`
- `deploy/logrotate/utm-builder`: rotação dos logs do Nginx
- `.github/workflows/deploy.yml`: deploy automático por SSH a partir da branch `main`
- `docs/CLIENT_DEPLOYMENT.md`: passo a passo completo para instalação no cliente

## Evolução futura

Quando a operação crescer:

- migrar de `EC2` para `ECS/Fargate`
- adicionar `ALB`
- evoluir o pipeline para ambientes separados de homologação e produção
