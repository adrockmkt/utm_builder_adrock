# Roadmap

## Fase 1 - Standalone Foundation

- destacar o módulo do hub
- manter gerador e validador
- criar docs e governança
- preparar backend próprio
- preparar instalacao single-tenant por cliente

## Fase 2 - Governed Links

- usuários/admin
- campanhas com grupo de anúncio e tipo de anúncio
- CRUD de links
- cadastros administrativos para selects, canais GA4 e logo
- histórico e auditoria
- exportação

## Fase 3 - Public Productization

- rota pública opcional
- templates por cliente
- presets avançados
- encurtamento opcional via Bitly usando `bit.ly/nome-do-link`
- observabilidade e segurança reforçadas
- repetibilidade comercial de implantação

## Feature implementada - Bitly

- criar link curto depois que o link com UTM for gerado e salvo
- usar a conta Bitly do cliente
- manter `BITLY_DOMAIN=bit.ly`, sem dominio proprio nesta fase
- validar conflito quando o nome curto ja existir
- salvar no historico o link original com UTMs e o link Bitly

Detalhes: [Integracao Bitly](./BITLY_INTEGRATION.md)
