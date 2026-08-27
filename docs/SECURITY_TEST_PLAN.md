# Plano de testes de seguranca

Este documento define a bateria inicial de seguranca para o UTM Builder em producao (`https://utms.porvir.org`).

## Objetivo

Reduzir risco de invasao, vazamento de dados, alteracao indevida de links, abuso de login, exposicao de segredos e falhas de permissao.

## Principios

- Nao rodar teste destrutivo em producao.
- Nao fazer carga agressiva contra a instancia Lightsail.
- Nao testar senhas reais de usuarios.
- Nao publicar tokens, dumps ou `.env`.
- Registrar achados com severidade, impacto e correcao.
- Corrigir primeiro falhas de autenticacao, permissao e exposicao de dados.

## Superficies de risco

Principais areas do sistema:

- login e sessao
- perfis `admin`, `editor` e `viewer`
- superusuario `rafael@adrock.com.br`
- gestao de usuarios
- campanhas
- links
- documentos
- cadastros administrativos
- upload de logo e GIF
- integracao Bitly
- exportacao CSV
- auditoria
- Nginx
- systemd
- PostgreSQL
- arquivos `.env`

## Preparacao

Antes de testar:

```bash
curl -s https://utms.porvir.org/api/health
sudo systemctl status utm-builder-api --no-pager
sudo nginx -t
```

Tambem confirmar que existe backup recente:

```bash
sudo ls -lh /var/backups/utm_builder | tail
```

Se nao houver backup valido, rodar backup manual antes dos testes.

## Testes de dependencias

No repositorio local ou no servidor:

```bash
npm audit
cd server
npm audit
```

Classificacao:

- `critical`: corrigir antes de qualquer proximo deploy
- `high`: corrigir o quanto antes, especialmente se afetar servidor, build, upload ou parsing
- `moderate`: avaliar impacto real
- `low`: registrar e corrigir quando seguro

Evitar `npm audit fix --force` sem revisar breaking changes.

## Testes de autenticacao

Validar:

- login com usuario inexistente mostra alerta
- login com senha errada mostra alerta
- usuario inativo nao entra
- token ausente nao acessa API protegida
- token invalido nao acessa API protegida
- logout remove sessao local
- sessao expirada e rejeitada pela API

Comandos seguros:

```bash
curl -i https://utms.porvir.org/api/users
curl -i -H "Authorization: Bearer token-invalido" https://utms.porvir.org/api/users
```

Esperado:

- `401` para token ausente/invalido
- nenhum dado sensivel no corpo da resposta

## Testes de permissao

Criar ou usar usuarios de teste com os perfis:

- `viewer`
- `editor`
- `admin`

Validar:

```text
viewer:
  nao deve criar/editar usuarios
  nao deve alterar cadastros
  nao deve acessar auditoria

editor:
  pode trabalhar em links/campanhas se esse for o fluxo definido
  nao deve gerenciar usuarios
  nao deve alterar marca do topo

admin:
  pode gerenciar usuarios, links, campanhas e cadastros
  nao deve alterar logo, nome do sistema e GIF se nao for rafael@adrock.com.br

superusuario rafael@adrock.com.br:
  pode alterar logo, nome do sistema e GIF
```

Rotas sensiveis para testar:

- `/api/users`
- `/api/settings/brand`
- `/api/settings/brand-logo`
- `/api/settings/brand-fun-gif`
- `/api/audit-logs`
- `/api/exports/utm-links.csv`

## Testes de input malicioso

Testar em campos de texto:

```text
<script>alert(1)</script>
' OR '1'='1
../../../../etc/passwd
https://exemplo.com/?x=<script>alert(1)</script>
texto com 5.000 caracteres
```

Validar:

- interface nao executa script
- API nao quebra
- banco nao aceita payloads fora do limite esperado
- erros nao mostram stack trace
- exportacao CSV nao vira formula maliciosa quando aberta em planilha

## Testes de upload

Logo:

- PNG/JPG/WebP valido
- arquivo acima do limite
- arquivo `.txt` renomeado para `.png`

GIF:

- GIF valido abaixo de 3 MB
- GIF acima de 3 MB
- PNG enviado no campo de GIF

Validar:

- API rejeita formato invalido
- Nginx nao retorna erro opaco para arquivo dentro do limite
- somente superusuario consegue alterar logo/GIF

## Testes de headers e Nginx

Comandos:

```bash
curl -I https://utms.porvir.org
curl -I https://utms.porvir.org/api/health
```

Verificar:

- HTTPS ativo
- sem directory listing
- sem stack trace
- headers basicos de seguranca enviados pelo Helmet na API
- `client_max_body_size 10m` no Nginx
- proxy so expoe `/api` necessario

## Testes de rate limit

Objetivo: garantir que login e API nao aceitam abuso sem limite.

Teste leve:

```bash
for i in {1..20}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://utms.porvir.org/api/health
done
```

Nao fazer teste agressivo em producao. Se precisar testar limite real, fazer em janela combinada.

## Testes de PostgreSQL

No servidor:

```bash
sudo ss -ltnp | grep 5432 || true
sudo -u postgres psql -c "\du"
sudo -u postgres psql -d adrock_utm_builder -c "\dt"
```

Validar:

- PostgreSQL nao esta exposto publicamente
- usuario da aplicacao nao e superuser
- banco tem senha forte
- backups nao ficam legiveis por usuarios indevidos

## Testes de arquivos e segredos

No servidor:

```bash
ls -la /var/www/utm_builder/server/.env
grep -R "BITLY_ACCESS_TOKEN\\|JWT_SECRET\\|DATABASE_URL" -n . --exclude-dir=node_modules --exclude-dir=.git
git status --short
```

Validar:

- `.env` nao esta versionado
- token Bitly nao aparece no GitHub
- `JWT_SECRET` existe e e forte
- arquivos sensiveis nao sao world-readable

## Ferramentas recomendadas

Rodar primeiro de forma passiva/segura:

- `npm audit`
- revisao manual das rotas Express
- `curl` para rotas protegidas
- OWASP ZAP baseline scan, sem ataque ativo agressivo

Exemplo futuro com ZAP baseline:

```bash
docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t https://utms.porvir.org -r zap-report.html
```

Antes de rodar ZAP em producao, confirmar janela de teste.

## Severidade dos achados

```text
Critico:
  acesso sem login a dados privados
  bypass de admin/superusuario
  segredo exposto
  SQL injection exploravel

Alto:
  XSS persistente
  upload perigoso
  reset de senha inseguro
  backup legivel por usuario indevido

Medio:
  erro detalhado demais
  header ausente
  validacao fraca de input

Baixo:
  texto ruim de erro
  melhoria de UX de seguranca
  dependencia low sem explorabilidade clara
```

## Entregaveis da bateria

Ao finalizar os testes, gerar:

- lista de testes executados
- evidencias principais
- achados por severidade
- plano de correcao
- itens corrigidos
- riscos aceitos temporariamente

## Criterio de conclusao

A bateria inicial pode ser considerada concluida quando:

- backup recente existe antes dos testes
- autenticacao e permissoes principais foram validadas
- uploads foram testados
- segredos e arquivos sensiveis foram revisados
- Nginx e API responderam sem vazamento de stack trace
- achados criticos e altos foram corrigidos ou explicitamente bloqueados
