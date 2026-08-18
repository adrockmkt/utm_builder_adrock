---
slug: utm-builder-slack-feature-opcional-governanca-campanhas
meta_description: A próxima evolução do UTM Builder da Ad Rock: uma integração opcional com Slack para criar links parametrizados com governança, sem perder controle, histórico e padronização de UTMs.
---

# UTM Builder no Slack: o próximo passo para criar links de campanha sem perder governança

No post anterior, contei como uma ideia simples de UTM Builder virou um produto real de governança para GA4.

O projeto nasceu para resolver uma dor muito comum em marketing digital: criar URLs parametrizadas de forma consistente, sem depender de planilhas soltas, padrões improvisados ou memória individual de cada pessoa do time.

Com o tempo, o UTM Builder deixou de ser apenas um gerador de links e virou uma camada operacional para campanhas:

- criação de links pontuais;
- links vinculados a campanhas;
- histórico;
- filtros;
- padrões de `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` e `utm_id`;
- integração opcional com Bitly;
- auditoria;
- backup;
- estrutura preparada para leitura posterior no GA4 e em relatórios.

Agora estamos estudando um próximo passo: levar parte dessa experiência para o Slack.

Não como substituto do sistema.

Mas como uma interface operacional opcional para criar links de campanha direto no fluxo de trabalho do time.

## Por que pensar em Slack?

Na prática, muitas decisões de campanha nascem em conversas.

Um time decide publicar uma peça.

Alguém pede um link para uma landing page.

Outra pessoa precisa de uma URL parametrizada para um disparo, post, mídia paga, QR code ou ação pontual.

Esse pedido muitas vezes aparece no Slack, WhatsApp, e-mail ou em alguma conversa rápida.

O problema é que, quando a criação do link acontece fora do sistema de governança, a chance de erro volta.

Alguém pode criar a URL manualmente.

Outro pode copiar um padrão antigo.

Um terceiro pode inventar uma nomenclatura nova.

E aquele problema inicial reaparece: o GA4 até coleta os dados, mas depois a análise fica quebrada.

A ideia da integração com Slack é reduzir esse atrito sem abrir mão do controle.

## A regra principal: Slack não pode virar atalho bagunçado

Uma integração desse tipo só faz sentido se ela respeitar as regras do UTM Builder.

O Slack não pode ser apenas um comando que monta qualquer URL.

Ele precisa consultar os campos existentes no banco, respeitar os padrões cadastrados e seguir a mesma lógica da interface web.

Isso significa que o fluxo no Slack deve começar com uma pergunta simples:

```text
Que tipo de link você quer criar?

1. Link pontual
2. Link de campanha
```

Essa separação é importante porque nem todo link nasce de uma campanha formal.

Existem links rápidos, ações isoladas, posts pontuais e URLs que precisam ser parametrizadas sem fazer parte de uma estrutura maior.

Ao mesmo tempo, quando o link pertence a uma campanha, ele precisa carregar esse contexto corretamente.

## Link pontual pelo Slack

No fluxo de link pontual, o Slack deve guiar o usuário pelos mesmos campos que já existem no UTM Builder.

Exemplo de informações solicitadas:

- URL base;
- canal ou preset de GA4;
- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_term`;
- `utm_content`;
- `utm_id`;
- nome interno;
- tipo de ação;
- tipo de peça ou anúncio;
- destino;
- observações;
- opção de gerar Bitly depois de salvar.

A diferença é que o usuário faria isso a partir de uma conversa ou modal no Slack.

Mas o link final continuaria salvo no catálogo do UTM Builder.

## Link de campanha pelo Slack

No fluxo de campanha, a integração precisa ser ainda mais cuidadosa.

O Slack deve permitir escolher uma campanha existente e usar a estrutura dela para preencher o link corretamente.

O fluxo esperado seria algo como:

- selecionar campanha existente;
- usar o slug da campanha como `utm_campaign`;
- informar grupo, conjunto ou variação para `utm_term`, quando aplicável;
- informar `utm_content`;
- informar `utm_id`;
- preencher dados operacionais como tipo de ação, destino e observações;
- salvar tudo no catálogo central;
- gerar Bitly se fizer sentido.

Se a campanha ainda não existir, a integração pode oferecer a criação de uma nova campanha.

Mas isso precisa respeitar permissões.

Nem todo usuário deve poder criar novos cadastros ou alterar padrões de nomenclatura.

## O desafio dos campos cadastrados

Um ponto essencial dessa evolução é que o Slack precisa buscar os campos atuais do banco.

Nada de manter uma lista paralela dentro do app Slack.

As opções devem vir das mesmas fontes usadas pelo UTM Builder:

- campanhas cadastradas;
- presets de canal;
- tipos de ação;
- destinos;
- tipos de peça;
- sugestões de `utm_content`;
- sugestões de `utm_term`;
- sugestões de `utm_id`;
- usuários;
- auditoria.

Isso mantém uma única fonte da verdade.

Se um campo existe no sistema, ele aparece no Slack.

Se não existe, a integração precisa decidir o que fazer.

## E quando o valor não existir?

Esse é um detalhe pequeno que muda tudo.

Imagine que alguém digite no Slack um novo tipo de peça ou uma nova variação de `utm_content`.

O sistema pode simplesmente aceitar?

Pode cadastrar automaticamente?

Pode bloquear?

A resposta mais segura é dar duas opções:

```text
Esse valor ainda não existe no cadastro.

1. Usar apenas neste link
2. Cadastrar para uso futuro
```

Na primeira versão, o mais prudente é permitir o uso manual no link e restringir o cadastro permanente a usuários com permissão.

Assim, o Slack ajuda a operação sem poluir a taxonomia central com variações criadas no improviso.

## O ponto técnico mais importante: uma UTM Engine no backend

Para essa integração funcionar direito, existe uma mudança técnica importante.

Hoje, parte da lógica de montagem da URL está na experiência web do UTM Builder.

Para o Slack gerar links com segurança, essa regra precisa existir também no backend, em uma camada canônica.

Chamamos isso de UTM Engine.

Essa engine deve ser responsável por:

- validar campos obrigatórios;
- normalizar valores;
- montar a URL final;
- preservar parâmetros existentes;
- aplicar regras diferentes para link pontual e link de campanha;
- gerar preview antes de salvar;
- garantir que web, API e Slack produzam o mesmo resultado.

Esse é o ponto que impede a integração de ser apenas um “atalho”.

O Slack deve conversar com a mesma inteligência de geração usada pelo produto, não criar uma lógica paralela.

## Como vamos testar sem afetar produção

Essa feature será opcional e precisa nascer desligada.

O plano mais seguro é começar pela instância da Ad Rock, usada como ambiente de homologação:

```text
https://mobiledelivery.com.br/utm-builder/
```

O teste inicial será feito com o Slack da Ad Rock.

Nada de começar pelo ambiente do cliente.

O Porvir, por exemplo, já usa o UTM Builder em produção. Então qualquer evolução precisa ser testada antes, com backup, feature flag e validação de paridade.

A ordem recomendada é:

1. criar a UTM Engine no backend em paralelo;
2. testar com exemplos reais de links já gerados;
3. validar que o resultado continua igual;
4. criar o app Slack no ambiente da Ad Rock;
5. testar os fluxos de link pontual e campanha;
6. corrigir pontos de operação;
7. só depois avaliar ativação para clientes.

## Vai funcionar no Slack Free?

Para o caso da Ad Rock, sim.

A ideia é usar um Slack App próprio, hospedado no nosso servidor, com slash command, modais e chamadas para a API do UTM Builder.

O Slack Free permite esse tipo de app, com algumas limitações.

A principal é o limite de apps e integrações instaladas no workspace gratuito.

Isso não deve atrapalhar o primeiro teste, porque o histórico real dos links não depende do Slack. Ele continua salvo no banco do UTM Builder.

O Slack será a interface de entrada.

O UTM Builder continuará sendo a fonte da verdade.

## Por que isso pode virar um módulo opcional

Nem todo cliente precisa criar links pelo Slack.

Alguns times preferem trabalhar direto na interface web.

Outros têm operação mais centralizada.

Outros usam Microsoft Teams, e-mail, WhatsApp ou sistemas internos.

Por isso, a integração com Slack não deve ser obrigatória.

Ela faz mais sentido como módulo opcional para clientes que já usam Slack no dia a dia e querem aproximar a governança de campanha da rotina operacional.

Na prática, o produto ficaria assim:

```text
Produto base:
UTM Builder

Módulos opcionais:
Campaign Intelligence
GA4 Performance
Report Hub Integration
OpenAI Analytics
Slack Operational Interface
```

O cliente pode usar apenas o UTM Builder.

Pode contratar a camada de Campaign Intelligence.

Pode evoluir para GA4 Performance.

E, se fizer sentido para a operação, pode ativar o Slack como interface adicional.

## O que muda para o time de marketing

Com o Slack integrado, o fluxo ideal ficaria mais simples:

```text
Preciso de um link
-> peço no Slack
-> escolho link pontual ou campanha
-> preencho campos guiados
-> recebo a URL final
-> o link fica salvo no catálogo
-> o GA4 recebe dados mais consistentes
```

O ganho não é apenas velocidade.

O ganho é reduzir o caminho entre operação e governança.

Em vez de escolher entre “fazer rápido” e “fazer certo”, a ferramenta tenta aproximar as duas coisas.

## O cuidado necessário

Existe uma tentação comum em automação: criar atalhos demais.

Mas, em dados de marketing, atalho sem governança vira problema.

Uma URL mal parametrizada hoje pode virar um relatório ruim daqui a 30 dias.

Uma nomenclatura inventada agora pode quebrar uma análise trimestral.

Uma campanha criada fora do padrão pode afetar a leitura de mídia, conteúdo, CRM e performance.

Por isso, a integração com Slack precisa seguir uma regra simples:

> Conversacional na entrada, governado na estrutura.

O usuário pode conversar com o sistema.

Mas o dado final precisa continuar organizado.

## Conclusão

O UTM Builder nasceu para resolver uma dor prática: criar links parametrizados com mais controle.

Agora, a integração com Slack aponta para uma evolução natural: levar essa criação para mais perto do lugar onde o trabalho acontece.

Mas sem transformar conveniência em bagunça.

A feature será opcional, testada primeiro no ambiente da Ad Rock e construída com cuidado para não afetar clientes que já usam o sistema em produção.

Se funcionar como esperamos, o Slack deixa de ser apenas um canal de conversa e passa a ser uma porta de entrada para uma operação de campanha mais organizada.

E esse é o tipo de evolução que faz sentido para o produto:

não adicionar tecnologia pela tecnologia,

mas aproximar governança, operação e dados em um fluxo mais simples para quem trabalha com marketing todos os dias.

