# Plano de backup local diario

Este documento define o plano inicial de backup sem custo adicional para a instalacao de producao em AWS Lightsail (`https://utms.porvir.org`).

## Objetivo

Evitar perda operacional dos dados do UTM Builder em caso de erro humano, deploy com problema, alteracao indevida no banco ou necessidade de voltar a um estado anterior.

## Escopo do backup

O backup local deve cobrir somente o UTM Builder. Como a instancia pode hospedar outros projetos do cliente, nao faz parte deste plano criar snapshot completo da instancia Lightsail.

O banco PostgreSQL do UTM Builder contem:

- usuarios
- campanhas
- links parametrizados
- documentos
- cadastros administrativos
- configuracoes de marca
- auditoria
- dados de Bitly salvos no catalogo

O codigo nao precisa entrar no backup do banco, pois fica versionado no GitHub.

Arquivos criticos do UTM Builder que devem ser considerados em uma etapa posterior de backup local complementar:

- `/var/www/utm_builder/server/.env`
- `/etc/systemd/system/utm-builder-api.service`
- `/etc/systemd/system/utm-builder-backup.service`
- `/etc/systemd/system/utm-builder-backup.timer`
- `/etc/nginx/sites-available/utms.porvir.org`

Esses arquivos nao devem ir para o GitHub porque podem conter segredos ou detalhes operacionais do servidor.

## Estrategia recomendada

Como o cliente pediu sem custo adicional, o primeiro ciclo sera:

- backup local diario do banco com `pg_dump`
- horario sugerido: 03:30 UTC, fora do horario normal de uso
- formato: `custom` (`.dump`) para permitir restore com `pg_restore`
- pasta local: `/var/backups/utm_builder`
- retencao recomendada: 30 dias
- permissao restrita ao usuario `postgres`, com grupo `www-data` apenas para a API conseguir ler metadados do ultimo backup
- teste manual apos instalar o timer
- teste de restauracao mensal em banco temporario

## Limitacoes importantes

Backup local protege contra erro de aplicacao e erro humano, mas nao protege totalmente contra:

- perda completa da instancia Lightsail
- disco corrompido
- invasao com acesso root
- apagamento malicioso dos backups locais

Snapshot completo da instancia nao sera usado nesta fase para evitar misturar outros projetos do cliente no mesmo processo de backup.

Quando o cliente aceitar custo adicional, o ideal e evoluir para backup externo em S3 privado, Google Drive corporativo, cofre seguro ou outro servidor.

## Politica de retencao

Plano inicial:

```text
Diario:
  manter os ultimos 30 backups locais

Mensal:
  testar restauracao de pelo menos um backup recente
```

Se o banco crescer muito, revisar a retencao para equilibrar seguranca e espaco em disco.

## Verificacoes antes de instalar

No servidor AWS:

```bash
df -h
du -sh /var/backups/utm_builder 2>/dev/null || true
cat /var/www/utm_builder/server/.env | grep '^DATABASE_URL='
which pg_dump
which pg_restore
```

Confirmar:

- ha espaco livre suficiente em disco
- `DATABASE_URL` esta correto
- `pg_dump` e `pg_restore` existem
- o arquivo `server/.env` nao esta exposto publicamente

## Implementacao planejada

O projeto ja possui:

- script: `scripts/backup-postgres.sh`
- service: `deploy/systemd/utm-builder-backup.service`
- timer: `deploy/systemd/utm-builder-backup.timer`

A implementacao deve ajustar a retencao para 30 dias antes de ativar no servidor:

```ini
Environment=RETENTION_DAYS=30
```

Depois, instalar:

```bash
cd /var/www/utm_builder
sudo cp deploy/systemd/utm-builder-backup.service /etc/systemd/system/utm-builder-backup.service
sudo cp deploy/systemd/utm-builder-backup.timer /etc/systemd/system/utm-builder-backup.timer
sudo mkdir -p /var/backups/utm_builder
sudo chown postgres:www-data /var/backups/utm_builder
sudo chmod 2750 /var/backups/utm_builder
sudo systemctl daemon-reload
sudo systemctl enable --now utm-builder-backup.timer
```

Rodar um backup manual:

```bash
sudo systemctl start utm-builder-backup.service
sudo chgrp -R www-data /var/backups/utm_builder
sudo chmod 2750 /var/backups/utm_builder
sudo find /var/backups/utm_builder -type f -name "utm_builder-*.dump" -exec chmod 600 {} \;
sudo ls -lh /var/backups/utm_builder
sudo systemctl status utm-builder-backup.service --no-pager
```

Validar timer:

```bash
systemctl list-timers | grep utm-builder-backup
```

## Teste de restauracao

Nunca considerar o backup valido sem testar restore.

Teste seguro em banco temporario:

```bash
sudo -u postgres createdb utm_builder_restore_test
sudo -u postgres pg_restore --dbname utm_builder_restore_test /var/backups/utm_builder/ARQUIVO.dump
sudo -u postgres psql -d utm_builder_restore_test -c "select count(*) from users;"
sudo -u postgres psql -d utm_builder_restore_test -c "select count(*) from utm_links;"
sudo -u postgres dropdb utm_builder_restore_test
```

Se o restore falhar, corrigir imediatamente a rotina de backup.

## Rotina operacional

Semanalmente:

```bash
sudo ls -lh /var/backups/utm_builder | tail
systemctl list-timers | grep utm-builder-backup
sudo journalctl -u utm-builder-backup.service -n 50 --no-pager
df -h
```

Mensalmente:

- escolher um backup recente
- restaurar em banco temporario
- validar tabelas principais
- registrar que o teste foi feito

## Criterio de sucesso

O plano de backup local esta valido quando:

- timer diario esta ativo
- backup manual cria um `.dump`
- backup automatico roda sozinho no horario previsto
- restore em banco temporario funciona
- backups antigos sao removidos pela retencao
- existe procedimento documentado para restauracao
