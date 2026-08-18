# Filtros do catalogo de links

## Objetivo

A tela de Links deve ajudar a encontrar rapidamente quais clientes, campanhas, pecas e identificadores internos foram usados, para depois comparar os mesmos parametros nos relatorios do GA4.

## Filtros implementados

- Busca geral: pesquisa nome interno, cliente da campanha, nome da campanha, URL base, URL final, `utm_campaign`, `utm_content`, `utm_id`, `utm_source`, `utm_medium` e Bitly.
- Cliente: filtra links que estao vinculados a campanhas de um cliente cadastrado.
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

O cliente mostra para qual conta/projeto aquela campanha foi criada. `utm_campaign` mostra a campanha ou frente principal, `utm_content` mostra a peca ou contexto de veiculacao, e `utm_id` ajuda a separar identificadores internos do cliente.

## Observacoes operacionais

- Os filtros rodam no frontend sobre a lista ja carregada da API.
- Links pontuais sem campanha vinculada continuam funcionando, mas aparecem como `sem cliente vinculado` no catalogo.
- A area de resultados tem rolagem propria abaixo dos filtros, para a tela continuar usavel mesmo com muitos links cadastrados.
- Cada link salvo pode ser editado no proprio catalogo. Ao alterar URL base ou parametros UTM, a URL final e recalculada antes de salvar.
- Se o link salvo ja tiver Bitly, a edicao mostra uma opcao para atualizar tambem o destino do Bitly mantendo o mesmo nome curto.
- `utm_content` e `utm_id` seguem a taxonomia Porvir documentada em [Taxonomia UTM Porvir](./PORVIR_UTM_TAXONOMY.md).
- O CSV exportado continua trazendo a base completa; se for necessario exportar apenas os filtrados, isso deve virar uma melhoria posterior.
- O canal GA4 exibido e filtrado e uma inferencia local baseada nos presets cadastrados. Quando nao houver correspondencia exata, o sistema exibe `utm_source / utm_medium`.
