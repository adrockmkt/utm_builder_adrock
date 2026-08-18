# Ad Rock UTM Builder

Versão standalone do `UTM Builder`, preparada para ser destacada deste repositório e virar um projeto próprio.

## Objetivo

Entregar uma instalação `single-tenant` por cliente, começando pelo caso do `Porvir.org`, com operação hospedada em infraestrutura AWS do cliente.

## O que esta pasta já contém

- frontend standalone com o módulo atual de geração e validação de UTMs
- backend próprio com autenticação, usuários, campanhas e links
- área administrativa para cadastros, presets de canal e logo do topo
- documentação de produto, arquitetura e AWS
- governança orientada por `spec-kit`
- plano de separação em 3 fases

## Estrutura

- `src/`: app frontend standalone
- `server/`: scaffold do backend próprio
- `docs/`: visão de produto, arquitetura, AWS e roadmap
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
- [AWS Deployment](./docs/AWS_DEPLOYMENT.md)
- [Migração AWS Lightsail](./docs/LIGHTSAIL_MIGRATION.md)
- [Plano de backup local diário](./docs/LOCAL_BACKUP_PLAN.md)
- [Plano de testes de segurança](./docs/SECURITY_TEST_PLAN.md)
- [Auditoria de segurança 2026-07-23](./docs/SECURITY_AUDIT_2026-07-23.md)
- [Deploy no cliente](./docs/CLIENT_DEPLOYMENT.md)
- [Deploy DigitalOcean em /utm-builder](./docs/DIGITALOCEAN_DEPLOYMENT.md)
- [Filtros do catálogo de links](./docs/LINK_CATALOG_FILTERS.md)
- [Taxonomia UTM Porvir](./docs/PORVIR_UTM_TAXONOMY.md)
- [Integração Bitly](./docs/BITLY_INTEGRATION.md)
- [Procedimentos de manutenção](./docs/MAINTENANCE_PROCEDURES.md)
- [Constituição](./.specify/constitution.md)
