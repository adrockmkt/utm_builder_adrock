# Auditoria de seguranca - UTM em lote

Data: 2026-08-27

## Escopo

- Importacao XLSX de UTMs em lote.
- Download do modelo oficial XLSX.
- Validacao de campanha obrigatoria para lote.
- Salvamento em massa em `utm_links`.
- Exportacao CSV apos dados vindos de planilha.
- Limites de upload no Express e Nginx.
- Rotina diaria de backup PostgreSQL.

## Resultado

Status: aprovado para homologacao no ambiente Ad Rock/DigitalOcean.

## Testes executados

```bash
node --test server/src/utils/bulkUtmImport.test.js server/src/utils/csv.test.js src/utils/alphabeticalOptions.test.mjs src/utils/linkSearch.test.js server/src/middleware/auth.test.js
npm run build
node --input-type=module --eval "await import('./server/src/routes/utmLinks.js'); console.log('utmLinks route ok');"
npm audit --omit=dev
cd server && npm audit --omit=dev
```

## Cobertura validada

- Endpoints de lote protegidos por `requireAuth`.
- Inserts de lote feitos com queries parametrizadas.
- Lote exige campanha cadastrada/selecionada.
- `utm_campaign` da planilha e ignorado; o sistema usa o slug da campanha selecionada.
- Linhas duplicadas dentro do XLSX bloqueiam salvamento.
- Planilhas com mais de 500 linhas por lote sao bloqueadas.
- JSON do backend e Nginx ajustados para 10 MB.
- Arquivos XLSX invalidos retornam erro generico, sem stack trace do parser.
- Exportacao CSV passa a neutralizar valores iniciados por `=`, `+`, `-`, `@`, tab ou carriage return para reduzir risco de formula injection.
- Backup diario usa `pg_dump` do banco definido por `DATABASE_URL`; novos links em lote e eventos de auditoria entram nas tabelas ja cobertas pelo dump.

## Dependencias

- Frontend: `npm audit --omit=dev` retornou 0 vulnerabilidades.
- Backend: `npm audit --omit=dev` apontou 2 vulnerabilidades moderadas transitivas em `uuid`, herdadas por `exceljs`.
- O fix automatico exige `npm audit fix --force` e downgrade quebravel para `exceljs@3.4.0`; nao foi aplicado para evitar regressao no parser/gerador XLSX.

## Riscos residuais

- Manter acompanhamento da dependencia `exceljs` ate sair versao sem `uuid <11.1.1`.
- Para carga maior que 500 linhas, dividir em mais de um lote.
- Testes agressivos de rate limit ou scanner ativo devem ser feitos apenas em janela combinada.
