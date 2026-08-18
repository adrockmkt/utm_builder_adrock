# Procedimentos de manutencao

Este documento registra cuidados obrigatorios antes de commitar mudancas no UTM Builder.

## Atualizar novidades do sistema

Sempre que uma mudanca afetar a experiencia do usuario, o fluxo de trabalho, campos visiveis, regras de preenchimento, administracao, catalogo, exportacao, Bitly, campanhas, documentos ou auditoria, atualize tambem a area `Novidades do sistema`.

Hoje essa area fica versionada no frontend em:

```text
src/App.tsx
releaseNotes
```

Antes de commitar, verificar:

- A mudanca e visivel para usuarios finais ou administradores?
- Ela altera algum texto, label, campo, botao, fluxo, validacao ou layout?
- Ela muda comportamento de links, campanhas, Bitly, catalogo, documentos, auditoria ou cadastros?
- Ela precisa orientar o time depois de um deploy?

Se a resposta for sim para qualquer item, incluir uma linha objetiva em `releaseNotes`.

Exemplo:

```text
2026-07-22
- Cadastros agora aparecem separados por categoria, com rolagem propria em cada bloco.
- Rotulo padronizado para Tipo de anuncio/formato.
```

## Quando nao precisa virar novidade

Nao precisa atualizar `Novidades do sistema` para mudancas internas sem impacto direto no uso, como:

- refactor invisivel
- ajuste de comentario
- organizacao de documentacao sem mudanca operacional
- correcao de typo em arquivo tecnico que nao aparece na interface
- melhoria de build ou dependencia sem efeito percebido pelo usuario

## Checklist antes do commit

Antes de `git commit`, sempre rodar:

```bash
npm run build
git diff --check
git status --short
```

Quando houver backend alterado, tambem validar sintaxe dos arquivos Node alterados, por exemplo:

```bash
node --check server/src/routes/settings.js
```

## Checklist depois do deploy

Depois de atualizar o AWS/Lightsail, validar:

```bash
curl -s http://127.0.0.1:5101/api/health
curl -s https://utms.porvir.org/api/health
sudo systemctl status utm-builder-api --no-pager
```

O esperado e `database":"connected"` nos health checks e servico `active (running)`.

