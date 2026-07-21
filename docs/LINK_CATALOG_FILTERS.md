# Filtros do catalogo de links

## Objetivo

A tela de Links deve ajudar a encontrar rapidamente quais campanhas, pecas e identificadores internos foram usados, para depois comparar os mesmos parametros nos relatorios do GA4.

## Filtros implementados

- Busca geral: pesquisa nome interno, URL base, URL final, `utm_campaign`, `utm_content`, `utm_id`, `utm_source`, `utm_medium` e Bitly.
- `utm_campaign`: filtra campanhas usadas nos links salvos.
- `utm_content`: filtra pecas, criativos, formatos ou locais de veiculacao usados nos links.
- `utm_id`: filtra identificadores internos de campanhas, cursos, materiais ou landing pages.
- Canal GA4: deriva o canal a partir dos presets cadastrados e dos pares `utm_source` + `utm_medium`.
- Periodo de criacao: filtra links criados entre duas datas.
- Bitly: separa links com ou sem URL encurtada.

## Leitura recomendada

Para analise no GA4, o cruzamento mais util tende a ser:

```text
utm_campaign + utm_content + utm_id
```

`utm_campaign` mostra a campanha ou frente principal, `utm_content` mostra a peca ou contexto de veiculacao, e `utm_id` ajuda a separar identificadores internos do cliente.

## Observacoes operacionais

- Os filtros rodam no frontend sobre a lista ja carregada da API.
- A area de resultados tem rolagem propria abaixo dos filtros, para a tela continuar usavel mesmo com muitos links cadastrados.
- O CSV exportado continua trazendo a base completa; se for necessario exportar apenas os filtrados, isso deve virar uma melhoria posterior.
- O canal GA4 exibido e filtrado e uma inferencia local baseada nos presets cadastrados. Quando nao houver correspondencia exata, o sistema exibe `utm_source / utm_medium`.
