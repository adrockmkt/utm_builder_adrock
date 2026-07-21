# Arquitetura

## Visão geral

O projeto standalone é dividido em duas camadas:

- `frontend`: React + Vite + TypeScript + Tailwind
- `backend`: Node.js + Express + PostgreSQL

## Estado atual

Hoje a pasta já contém:

- frontend funcional do gerador e validador
- autenticação própria
- setup inicial de admin
- backend funcional com rotas para usuários, campanhas e links
- cadastros administrativos para selects, canais GA4 e logo do topo
- estrutura de mídia em links de campanha: campanha, grupo de anúncio e tipo de anúncio
- specs do produto

## Estado alvo

### Frontend

- login
- dashboard simples
- UTM Builder
- campanhas com estrutura de mídia
- histórico de links
- administração de usuários
- cadastros operacionais e marca do topo

### Backend

- autenticação
- gestão de usuários
- CRUD de campanhas
- CRUD de links
- filtros do catalogo de links para leitura por `utm_campaign`, `utm_content`, `utm_id`, canal, periodo e Bitly
- CRUD de cadastros administrativos
- area de documentos para armazenar URLs de planilhas modelo e materiais de apoio
- auditoria mínima
- exportação
- integracao opcional com Bitly para encurtar links salvos

### Integracao Bitly

A integracao fica somente no backend, usando token seguro da conta Bitly do cliente. O frontend nunca recebe `BITLY_ACCESS_TOKEN`.

Fluxo alvo:

- usuario gera e salva link com UTMs
- frontend sugere o nome curto usando apenas `utm_campaign`
- usuario pode editar o nome curto desejado
- backend chama a API Bitly usando `BITLY_DOMAIN=bit.ly`
- backend trata conflito de nome ja usado
- backend salva o `bit.ly/nome-do-link` junto do link original

Detalhes operacionais: [Integracao Bitly](./BITLY_INTEGRATION.md)

## Banco recomendado

PostgreSQL.

SQLite só para protótipo local.
