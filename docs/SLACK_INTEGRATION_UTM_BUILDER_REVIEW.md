# Slack Integration - UTM Builder Review

## Status

Esta nota registra a avaliacao da proposta `SLACK_INTEGRATION_ARCHITECTURE.md` como possibilidade futura para o UTM Builder / Campaign Intelligence Builder.

Ela nao autoriza implementacao imediata.

Decisao recomendada: manter no roadmap futuro, avaliar custo/beneficio depois da modularizacao base e testar primeiro na instancia Ad Rock antes de qualquer movimento no Porvir.

## Veredito

A integracao com Slack e tecnicamente viavel, mas a proposta precisa ser ajustada para ser fiel ao produto atual.

O ponto mais sensivel e que o Slack nao pode ter uma logica propria de montagem de UTM. Para funcionar bem, ele precisaria consumir uma UTM Engine canonica no backend, capaz de aplicar as mesmas regras da interface web atual.

Isso aumenta o escopo e cria risco se for feito diretamente em producao. Por isso, a recomendacao e:

- nao mexer no fluxo vigente do Porvir no primeiro momento;
- nao trocar a geracao atual da interface web de uma vez;
- criar a UTM Engine no backend em paralelo;
- validar paridade com links reais antes de colocar em uso;
- testar a integracao somente na instancia Ad Rock / DigitalOcean;
- usar o Slack da Ad Rock para homologacao;
- habilitar para Porvir apenas depois de estabilidade comprovada.

## O que a proposta precisa respeitar

A experiencia no Slack deve refletir o fluxo atual do UTM Builder, nao apenas um fluxo unico de campanhas.

Ao iniciar o comando ou atalho no Slack, a primeira pergunta deve ser:

```text
Que tipo de link voce quer criar?

1. Link pontual
2. Link de campanha
```

Essa decisao muda as perguntas seguintes.

## Fluxo - Link pontual

Para link pontual, o Slack deve permitir criar um link sem selecionar campanha cadastrada.

Perguntas/campos esperados:

- URL base;
- preset/canal GA4, quando aplicavel;
- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_term`;
- `utm_content`;
- `utm_id`;
- nome interno;
- tipo de acao;
- tipo de anuncio/peca;
- tipo de destino;
- observacoes;
- opcao de gerar Bitly depois de salvar.

Esse fluxo deve continuar aceitando preenchimento manual, como a interface atual permite.

## Fluxo - Link de campanha

Para link de campanha, o Slack deve trabalhar com campanhas existentes e permitir criacao quando faltar cadastro, respeitando permissao.

Perguntas/campos esperados:

- selecionar campanha existente;
- se nao existir, solicitar criacao de campanha;
- usar o slug da campanha como `utm_campaign`;
- solicitar grupo/anuncio/conjunto para preencher `utm_term`, quando aplicavel;
- solicitar `utm_content`;
- solicitar `utm_id`;
- nome interno;
- tipo de acao;
- tipo de anuncio/peca;
- tipo de destino;
- observacoes;
- opcao de gerar Bitly depois de salvar.

O Slack nao deve assumir que todo link pertence a campanha. O fluxo pontual precisa continuar existindo.

## Fontes de dados obrigatorias

A integracao deve buscar opcoes diretamente do banco atual e das APIs existentes, nao de listas duplicadas no app Slack.

Fontes atuais a preservar:

- `utm_campaigns`;
- `utm_links`;
- `select_options`;
- `utm_channel_presets`;
- `users`;
- `audit_logs`.

Categorias atuais de `select_options` que devem alimentar as perguntas:

- `action_type`;
- `destination_type`;
- `campaign_type`;
- `campaign_status`;
- `client_name`;
- `ad_type`;
- `utm_content`;
- `utm_term`;
- `utm_id`.

O Slack deve usar essas opcoes como catalogo operacional.

## Quando o valor nao existir

Quando o usuario digitar um valor que nao existe no cadastro, o Slack deve oferecer uma decisao clara:

```text
Esse valor ainda nao existe no cadastro.

1. Usar apenas neste link
2. Cadastrar para uso futuro
```

Regras recomendadas:

- usuarios sem permissao administrativa podem usar valor manual somente no link;
- cadastro novo em `select_options` deve exigir permissao ou aprovacao;
- a primeira versao pode permitir apenas uso manual e deixar cadastro via interface web;
- uma versao posterior pode criar sugestoes pendentes para revisao.

Isso evita poluir o cadastro central com variacoes criadas rapidamente no Slack.

## UTM Engine canonica no backend

Hoje, parte importante da montagem e validacao da URL esta concentrada na interface web.

Para o Slack funcionar com seguranca, a regra deve ir para o backend em um servico canonico, por exemplo:

```text
server/src/services/utm-engine
```

Esse servico deve ser responsavel por:

- normalizar valores UTM;
- montar query string;
- preservar parametros existentes da URL base;
- aplicar regras de obrigatoriedade por contexto;
- validar link pontual;
- validar link de campanha;
- gerar preview antes de salvar;
- gerar URL final no backend;
- impedir divergencia entre web, API e Slack.

## Como reduzir risco

A UTM Engine nao deve substituir o fluxo atual de producao de uma vez.

Plano seguro recomendado:

1. Criar a engine no backend sem alterar o comportamento atual da interface.
2. Criar testes de paridade com exemplos reais de links ja gerados.
3. Criar endpoint de preview/generate em paralelo.
4. Usar esse endpoint primeiro somente no Slack em homologacao.
5. Depois validar se a interface web pode passar a consumir o mesmo endpoint.
6. So entao considerar ativacao para Porvir.

Links existentes continuam validos e nao devem ser migrados automaticamente.

## Ambiente de teste recomendado

A homologacao deve acontecer na instancia Ad Rock:

```text
https://mobiledelivery.com.br/utm-builder/
```

Workspace Slack recomendado para teste:

```text
Slack da Ad Rock
```

O Porvir deve ficar fora do teste inicial:

```text
https://utms.porvir.org/
```

Motivo: Porvir ja usa o sistema em producao e nao deve ser exposto a risco de fluxo novo, OAuth, permissao Slack, callback externo ou mudanca na geracao de UTM.

## Feature flag

A integracao precisa nascer desligada por padrao.

Flag conceitual:

```text
slack_integration_enabled = true/false
```

Regras:

- se desligada, nenhum endpoint Slack deve operar;
- ativacao deve ser por instalacao/cliente;
- token e secrets devem ser configurados por ambiente;
- Porvir deve permanecer `false` ate homologacao concluida;
- Ad Rock pode ser `true` apenas no ambiente de teste.

## Seguranca e auditoria

A integracao exige cuidado com autenticacao e rastreabilidade.

Itens minimos:

- validar Slack Signing Secret;
- armazenar Bot Token fora do repositorio;
- usar token de integracao entre Slack app e backend;
- registrar `created_via = slack`;
- registrar Slack user id;
- mapear Slack user para usuario interno quando possivel;
- manter auditoria no backend;
- limitar comandos por workspace autorizado;
- nao expor URLs internas, tokens ou dados sensiveis em mensagens publicas.

## Relacao com Campaign Intelligence

A integracao Slack pode ser util para acelerar operacao, mas nao e prerequisito do Campaign Intelligence.

Ela deve ser tratada como interface operacional opcional, nao como parte obrigatoria do MVP.

Ordem recomendada:

1. UTM Builder base protegido.
2. Modularizacao e feature flags.
3. Campaign Intelligence.
4. GA4 Performance.
5. UTM Engine canonica no backend, se a integracao Slack for aprovada.
6. Slack Integration em homologacao Ad Rock.
7. Avaliacao para Porvir.

## Decisoes pendentes

Antes de implementar, decidir:

1. Vale a pena investir na UTM Engine agora ou somente depois do Campaign Intelligence?
2. Slack sera vendido como modulo adicional ou usado apenas como ferramenta operacional interna?
3. Quem pode cadastrar novas opcoes pelo Slack?
4. Valores novos devem entrar direto em `select_options` ou virar sugestoes pendentes?
5. O Slack deve criar campanhas novas ou apenas selecionar campanhas existentes?
6. Como mapear usuarios Slack para usuarios do UTM Builder?
7. O primeiro teste sera limitado ao workspace Slack da Ad Rock?
8. Quais exemplos reais serao usados nos testes de paridade da UTM Engine?

## Recomendacao final

Nao implementar agora no Porvir.

Registrar como roadmap futuro e, se aprovado, construir primeiro no ambiente Ad Rock/DigitalOcean com feature flag, app Slack da Ad Rock e backend UTM Engine em paralelo ao fluxo atual.

