# Ad Rock UTM Builder

Versão standalone do `UTM Builder`, preparada para ser destacada deste repositório e virar um projeto próprio.

## Objetivo

Entregar uma instalação `single-tenant` por cliente, mantendo uma base reutilizável da Ad Rock para novas implantações do UTM Builder.

## O que esta pasta já contém

- frontend standalone com o módulo atual de geração e validação de UTMs
- backend próprio com autenticação, usuários, campanhas e links
- área administrativa para cadastros, presets de canal e logo do topo
- documentação de produto, arquitetura e deploy genérico
- governança orientada por `spec-kit`
- plano de separação em 3 fases

## Estrutura

- `src/`: app frontend standalone
- `server/`: scaffold do backend próprio
- `docs/`: visão de produto, arquitetura, deploy genérico e roadmap
- `.specify/`: constituição do projeto
- `specs/`: specs por fase

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run dev:api
```

## Estado funcional atual

- setup inicial do administrador da instalação
- login próprio
- health check com PostgreSQL
- CRUD básico de usuários
- CRUD básico de campanhas
- persistência de links gerados no UTM Builder
- vínculo opcional entre link pontual e campanha
- estrutura de mídia para campanhas: campanha, grupo de anúncio e tipo de anúncio
- cadastros administrativos para tipos de ação, destino, tipo de anúncio, tipos/status de campanha e canais GA4
- logo do topo customizável pela área administrativa
- exportação CSV de links e campanhas
- auditoria de autenticação e alterações principais
- hardening de produção com headers de segurança, rate limit e logs HTTP
- templates de deploy para Nginx, systemd, backup e GitHub Actions
- encurtamento opcional de links salvos via Bitly
- área de documentos para salvar URLs de planilhas modelo e materiais de apoio

## Variáveis de ambiente

- frontend: [`.env.example`](./.env.example)
- backend: [`server/.env.example`](./server/.env.example)
- produção frontend: [`.env.production.example`](./.env.production.example)
- produção backend: [`server/.env.production.example`](./server/.env.production.example)

## Diretriz de produto

O UTM Builder standalone deve evoluir de gerador para produto governado com:

- admin e gestão de usuários
- campanhas, grupos de anúncio e tipos de anúncio
- histórico de links
- cadastros operacionais configuráveis por cliente
- edição, exclusão, exportação e auditoria
- encurtamento opcional via Bitly para materiais offline e eventos
- instalação dedicada por cliente

## Referências

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Roadmap](./docs/ROADMAP.md)
- [Deploy no cliente](./docs/CLIENT_DEPLOYMENT.md)
- [Filtros do catálogo de links](./docs/LINK_CATALOG_FILTERS.md)
- [Integração Bitly](./docs/BITLY_INTEGRATION.md)
- [Constituição](./.specify/constitution.md)
