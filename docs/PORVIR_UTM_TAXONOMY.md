# Taxonomia UTM Porvir

Este documento registra a organizacao sugerida a partir da planilha `Canais e categorias Porvir - Categorias.csv`.

Importante: a taxonomia Porvir entra como camada adicional de sugestoes. O sistema continua mantendo uma camada de `Padroes gerais` para atender outros clientes, como Escolas Conectadas, e qualquer instalacao futura.

## Regra de uso

Use os campos assim:

- `utm_content`: categoria, bloco, posicao ou contexto do link dentro do canal.
- `utm_term`: segmentacao, origem operacional ou grupo usado para separar a acao.
- `utm_id`: elemento clicavel, variacao ou identificador especifico daquela peca.

Exemplos:

```text
Newsletter semanal
utm_content=destaque1
utm_id=botao_01
```

```text
Instagram
utm_content=stories
utm_id=img_01
```

```text
WhatsApp
utm_content=comunidade_tecnologia
utm_id=canal
```

## UI implementada

No builder, `utm_content`, `utm_term` e `utm_id` usam um box de sugestoes com:

- seletor de contexto
- lista interna com rolagem
- altura controlada para evitar dropdowns gigantes
- campo manual abaixo, para casos que ainda nao estejam cadastrados

O objetivo e guiar o time sem bloquear casos novos.

O primeiro contexto de `utm_content` e `Padroes gerais`, com formatos e valores reaproveitaveis por multiplos clientes. Os grupos Porvir aparecem depois como atalhos especificos.

`utm_term` tambem ganhou sugestoes cadastraveis. A lista inicial foi montada a partir dos valores mais usados no catalogo real de links, preservando campo manual para novos grupos ou segmentacoes.

## Padroes gerais de `utm_content`

- `text_ad`
- `image_ad`
- `story_ad`
- `lead_ad`
- `video_ad`
- `display_ad`
- `shopping_ad`
- `infografico`
- `materia`
- `ebook`
- `webstory`
- `podcast`
- `jogo`
- `webinario`
- `landing_page`
- `whatsapp_canal`
- `whatsapp_comunidade_socioemocional`
- `whatsapp_comunidade_antirracista`
- `whatsapp_comunidade_tecnologia`
- `whatsapp_comunidade_metodologias_ativas`
- `newsletter_semanal`
- `newsletter_gestao`
- `newsletter_comercial`
- `instagram`
- `facebook`
- `linkedin`
- `video`

## Grupos de `utm_content`

### WordPress

- `blog`
- `materia`
- `reportagem`
- `artigo`
- `agenda`
- `gestao`
- `biblioteca`
- `glossario`
- `festival`
- `premio`
- `video`

### Instagram

- `link_bio`
- `stories`
- `reels`
- `manychat`
- `timeline`
- `botao`

### Facebook

- `feed`

### Newsletter semanal

- `texto_abertura`
- `destaque1`
- `destaque2`
- `miniatura1`
- `miniatura2`
- `miniatura3`
- `aspas`
- `dica_leitura1`
- `dica_leitura2`
- `story1`
- `story2`
- `story3`
- `agenda`
- `banner1`
- `banner2`
- `banner3`

### Newsletter gestao

- `texto_abertura`
- `destaque1`
- `miniatura1`
- `miniatura2`
- `banner_parceiro`
- `banner2`
- `agenda`

### Newsletter premio

- `texto_abertura`
- `banner_abertura`
- `botao1`
- `botao2`

### WhatsApp

- `canal`
- `comunidade_socioemocional`
- `comunidade_antirracista`
- `comunidade_tecnologia`
- `comunidade_metodologias_ativas`

## Sugestoes de `utm_id`

O `utm_id` fica mais util como identificador da variacao clicavel:

- `texto_01`
- `texto_02`
- `img_01`
- `img_02`
- `botao_01`
- `botao_02`
- `banner_01`
- `banner_02`
- `catalogo`
- `canal`

Tambem permanecem disponiveis os identificadores especificos ja cadastrados anteriormente, como cursos, materiais e landing pages.

## Sugestoes de `utm_term`

Valores comuns carregados inicialmente:

- `ec_canal`
- `ec_relacionamento`
- `ec_grupo_ea`
- `ec_facebook`
- `ec_grupo_es`
- `ec_grupo_crm`
- `newsletter_premio`
- `ec_aquisicao`
- `email_58_trap_texto_d1`
- `email_58_trap_texto_d2`
- `coluna_debora_garofalo`
- `abertura_inscricoes`
- `agosto_datas`
- `alfabetizacao_algoritmica`
- `atualidades_curriculo`
- `banner_premio_site`
- `bncc_computacao1`
- `dicas_escola`
- `entrevista_gustavo_estanislau`
- `formulario_premio`
- `site_efemerides_agosto`
- `site_porvir`
- `stories_premio`

Novos valores podem ser criados em `Cadastros > utm_term`.

## Normalizacao aplicada

Os valores foram normalizados para ficarem sem acento, em caixa baixa e com `_` quando necessario:

- `matéria` -> `materia`
- `gestão` -> `gestao`
- `prêmio` -> `premio`
- `vídeo` -> `video`
- `comunidade socioemcoional` -> `comunidade_socioemocional`
- `comunidade metodologias ativas` -> `comunidade_metodologias_ativas`
- `textabertura` / `textoabertura` -> `texto_abertura`
- `dicaleitura1` -> `dica_leitura1`
