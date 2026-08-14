# Proposta de Arquitetura para Integração com Slack

## Status

Documento de proposta técnica para análise. Nenhuma implementação está prevista por este arquivo.

## Objetivo

Adicionar o Slack como uma nova interface operacional do Ad Rock UTM Builder, permitindo que usuários criem URLs parametrizadas sem precisar abrir a interface web e sem precisar conhecer diretamente a taxonomia de UTMs.

A integração deve reutilizar o backend, as regras de validação, os cadastros e a persistência já existentes no projeto.

O Slack não deve possuir uma implementação paralela da lógica de geração de UTMs.

## Princípio arquitetural

O UTM Builder deve continuar sendo a fonte central de regras e dados.

A arquitetura proposta é:

```text
                  PostgreSQL
                      |
                      v
              UTM Builder API
              Node.js + Express
                /           \
               /             \
              v               v
      React Web App        Slack App
       UTM Builder          Bolt JS
```

O frontend web e o Slack passam a ser clientes da mesma API.

Essa separação evita duplicação de regras e permite que futuras interfaces, como Microsoft Teams, extensão de navegador ou aplicativo mobile, também reutilizem o mesmo motor.

## Objetivos funcionais

A integração deve permitir:

- iniciar a criação de uma UTM pelo Slack;
- coletar os campos necessários de forma guiada;
- carregar campanhas e cadastros existentes do UTM Builder;
- aplicar as mesmas regras de validação do sistema web;
- gerar a URL final com UTMs;
- salvar o link no histórico atual do UTM Builder;
- vincular o link a uma campanha existente quando aplicável;
- identificar que o link foi criado pelo Slack;
- registrar o usuário Slack responsável pela criação;
- opcionalmente encurtar o link usando a integração Bitly já existente no backend;
- permitir expansão futura para histórico e consulta de campanhas dentro do Slack.

## Experiência proposta

### Entrada principal

A primeira versão pode utilizar um Slash Command:

```text
/utm
```

Alternativamente:

```text
/utm-builder
```

O comando inicia o fluxo de criação de uma nova URL parametrizada.

## Estratégia de interação

Existem duas abordagens possíveis.

### Fluxo totalmente conversacional

O bot pergunta cada campo em sequência.

Exemplo:

```text
Usuário:
/utm

UTM Builder:
Vamos criar uma nova URL.
Qual é a URL de destino?

Usuário:
https://example.com/artigo

UTM Builder:
Qual é a origem?

[ Google ] [ Facebook ] [ Instagram ] [ LinkedIn ] [ Newsletter ] [ Outro ]
```

Vantagens:

- experiência simples;
- baixa curva de aprendizado;
- sensação de assistente operacional.

Desvantagens:

- exige gerenciamento de estado por conversa;
- pode gerar muitas mensagens;
- fluxos longos ficam mais lentos para usuários frequentes.

### Modal estruturado

O comando abre um modal Slack com os campos necessários.

Exemplo conceitual:

```text
URL de destino
Canal
Meio
Campanha
Grupo de anúncio
Tipo de anúncio
utm_source
utm_medium
utm_campaign
utm_term
utm_content
utm_id
```

Vantagens:

- fluxo compacto;
- validação mais simples;
- melhor para usuários frequentes;
- permite selects e campos estruturados.

### Abordagem recomendada

Utilizar um fluxo híbrido.

```text
/utm
  |
  v
Mensagem inicial do bot
  |
  v
Escolha do contexto
  |
  v
Modal estruturado
  |
  v
Validação pelo backend
  |
  v
UTM gerada
  |
  v
Persistência no PostgreSQL
  |
  v
Resultado retornado no Slack
```

O Slack pode usar mensagens para iniciar e orientar o processo, mas a coleta principal de dados deve ocorrer em modal.

## Fonte única de verdade

Os valores exibidos pelo Slack não devem ser mantidos manualmente dentro do Slack App.

Sempre que possível, devem vir dos cadastros do UTM Builder.

Exemplos:

- campanhas;
- canais GA4;
- tipos de ação;
- destinos;
- tipos de anúncio;
- tipos de campanha;
- status de campanha;
- grupos de anúncio;
- outros presets configuráveis por cliente.

Fluxo conceitual:

```text
Slack App
   |
   v
UTM Builder API
   |
   v
PostgreSQL
```

Isso garante que alterações feitas pela administração do UTM Builder sejam automaticamente refletidas no Slack.

## Responsabilidade de cada camada

### Slack App

Responsabilidades:

- receber comandos e interações;
- abrir modais;
- coletar dados do usuário;
- apresentar opções vindas da API;
- enviar os dados para validação;
- apresentar o resultado;
- encaminhar ações como salvar ou encurtar.

O Slack App não deve:

- definir taxonomia própria;
- guardar regras de nomenclatura duplicadas;
- acessar diretamente o PostgreSQL;
- armazenar token Bitly;
- gerar UTMs com regras diferentes das usadas pela aplicação web.

### UTM Builder API

Responsabilidades:

- autenticar ou autorizar requisições do Slack App;
- fornecer campanhas e cadastros;
- validar entradas;
- normalizar valores;
- aplicar regras de taxonomia;
- montar a URL final;
- persistir links;
- registrar auditoria;
- executar integração Bitly;
- retornar erros de domínio de forma padronizada.

### PostgreSQL

Continua sendo a fonte persistente de dados do produto.

Não deve existir um banco separado para UTMs criadas no Slack.

## Reutilização da engine de UTM

Antes da implementação do Slack App, a lógica central de geração e validação de UTMs deve estar disponível no backend de maneira reutilizável.

Caso alguma regra ainda esteja restrita ao frontend React, ela deve ser extraída para uma camada compartilhada ou reproduzida no backend de forma canônica antes da integração.

Objetivo:

```text
Web -> API -> UTM Engine
Slack -> API -> UTM Engine
```

Evitar:

```text
Web -> regra A
Slack -> regra B
```

## Autenticação e autorização

A integração precisa distinguir dois contextos:

1. autenticação do Slack App perante a API;
2. identidade do usuário Slack que executou a ação.

Uma possibilidade é utilizar uma credencial de serviço específica da instalação Slack para comunicação com a API.

O payload interno pode carregar dados como:

```json
{
  "source": "slack",
  "slack_user_id": "U12345678",
  "slack_team_id": "T12345678"
}
```

A associação entre usuário Slack e usuário interno do UTM Builder pode ser adicionada posteriormente.

### Primeira fase

Permitir que membros autorizados do workspace utilizem a integração e registrar a identidade Slack na auditoria.

### Evolução futura

Mapear:

```text
Slack User <-> UTM Builder User
```

Isso permitiria aplicar permissões internas, histórico individual e restrições por perfil.

## Modelo de auditoria

Links criados pelo Slack devem ser identificáveis.

Campos conceituais possíveis:

```text
created_via = slack
slack_user_id
slack_team_id
slack_channel_id
slack_trigger_id
```

Não é necessário adicionar todos esses campos inicialmente.

O mínimo recomendado é:

```text
created_via
slack_user_id
```

O objetivo é permitir respostas para perguntas como:

- quem criou este link;
- quando foi criado;
- qual interface foi utilizada;
- a qual campanha pertence;
- quais parâmetros foram utilizados.

## Persistência

Uma UTM criada pelo Slack deve aparecer no mesmo catálogo de links já existente no UTM Builder.

O Slack não deve manter histórico próprio como fonte oficial.

Fluxo:

```text
Slack
  |
  v
API
  |
  v
links
  |
  v
PostgreSQL
  |
  +--> Web App
  +--> Exportação CSV
  +--> Auditoria
  +--> Slack
```

## Integração com campanhas

O fluxo deve permitir dois modos.

### Link avulso

O usuário informa os parâmetros necessários e salva o link sem vínculo obrigatório com campanha.

### Link associado a campanha

O usuário seleciona uma campanha existente.

A partir dela, o sistema pode fornecer ou limitar opções relacionadas, como:

- grupo de anúncio;
- tipo de anúncio;
- status;
- canal;
- outros metadados configurados.

Isso preserva a estrutura já existente no produto.

## Taxonomia governada

A principal vantagem da integração não é simplesmente montar query strings.

O objetivo é reduzir erros humanos na criação de UTMs.

Em vez de exigir que o usuário saiba escrever:

```text
utm_source=whatsapp
utm_medium=social_media
utm_campaign=ec_2026_agosto
utm_term=ec_canal
utm_content=canal_53_trilha_bncc_computacao_p2
utm_id=curso
```

O Slack pode perguntar conceitos de negócio:

```text
Canal: WhatsApp
Campanha: EC Agosto 2026
Distribuição: Canal
Peça: Trilha BNCC Computação
Variação: P2
Destino: Curso
```

O backend converte essas escolhas para a taxonomia oficial.

Isso transforma o UTM Builder em uma camada de governança de tracking e não apenas em um gerador de URL.

## Integração Bitly

O Slack pode oferecer uma ação opcional após a geração:

```text
[ Copiar URL ]
[ Salvar ]
[ Encurtar com Bitly ]
[ Criar outra ]
```

O Slack nunca deve receber o token Bitly.

Fluxo:

```text
Slack App
   |
   v
UTM Builder API
   |
   v
Bitly API
```

A integração existente no backend deve continuar sendo a única camada responsável pela credencial Bitly.

## App Home no Slack

Uma evolução posterior pode adicionar uma Home própria para o aplicativo.

Exemplo conceitual:

```text
UTM Builder

[ + Criar UTM ]

Minhas UTMs recentes

Instagram | Campanha Agosto
WhatsApp  | Curso PBL
Newsletter | Email 63

[ Ver minhas UTMs ]
[ Ver campanhas ]
[ Abrir UTM Builder Web ]
```

Essa funcionalidade não deve fazer parte obrigatoriamente do MVP.

## Arquitetura de código sugerida

Uma possibilidade de organização é:

```text
server/
  src/
    integrations/
      slack/
        app.js
        commands.js
        actions.js
        modals.js
        client.js
        auth.js
```

Ou manter o Slack como processo independente:

```text
slack-app/
  src/
    app.js
    commands/
    actions/
    views/
    api/
```

### Recomendação

Preferir um módulo ou serviço claramente separado da API principal.

O Slack App possui ciclo de eventos próprio e não deve misturar handlers Slack com regras HTTP de domínio do UTM Builder.

A decisão entre monólito modular e processo separado deve considerar o modelo atual de deploy.

## Tecnologia sugerida

Stack recomendada:

```text
Node.js
Slack Bolt for JavaScript
Slack Block Kit
UTM Builder REST API
PostgreSQL
```

A escolha por JavaScript mantém compatibilidade com a stack atual do backend.

## Eventos e componentes Slack esperados

O MVP provavelmente utilizará:

- Slash Commands;
- Modals;
- Block Kit;
- Buttons;
- Static Selects;
- External Selects ou selects carregados dinamicamente;
- View Submissions;
- mensagens efêmeras para retorno privado quando apropriado.

## Endpoints de API necessários

Os endpoints exatos devem ser definidos após auditoria das rotas atuais.

Conceitualmente, a integração precisará de operações equivalentes a:

```text
GET /api/campaigns
GET /api/channels
GET /api/admin-options
POST /api/utm/validate
POST /api/links
POST /api/links/:id/shorten
```

Não se deve criar endpoints duplicados apenas para Slack se os endpoints atuais puderem ser reutilizados com segurança.

## Validação

Toda validação definitiva deve ocorrer no backend.

O modal pode executar validações simples de preenchimento, porém o backend deve continuar responsável por:

- URL válida;
- campos obrigatórios;
- normalização;
- caracteres permitidos;
- regras de nomenclatura;
- vínculos válidos entre campanha e mídia;
- conflitos de dados;
- regras de Bitly.

## Segurança

A implementação deve considerar:

- verificação da assinatura das requisições Slack;
- armazenamento seguro de Slack Signing Secret e tokens;
- nenhuma credencial sensível no frontend;
- princípio de menor privilégio nos scopes do Slack App;
- rate limiting onde aplicável;
- logs sem exposição de segredos;
- separação entre credenciais de produção e desenvolvimento;
- validação de origem de todas as interações.

## Variáveis de ambiente previstas

Exemplo conceitual:

```text
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_APP_TOKEN=
UTM_BUILDER_API_URL=
UTM_BUILDER_SERVICE_TOKEN=
```

Os nomes finais devem seguir o padrão já adotado pelo projeto.

Nenhuma credencial real deve ser versionada.

## Tratamento de erros

O Slack App deve traduzir erros técnicos da API em mensagens operacionais claras.

Exemplo:

```text
Não foi possível criar a URL porque a campanha selecionada não está mais disponível.
Selecione outra campanha e tente novamente.
```

Evitar enviar stack traces, mensagens SQL ou detalhes internos ao usuário.

## Observabilidade

Registrar pelo menos:

- início de comando;
- submissão de modal;
- sucesso ou falha na geração;
- criação de link;
- chamada Bitly;
- erros de API;
- usuário e workspace envolvidos, respeitando requisitos de privacidade.

## Compatibilidade single-tenant

O projeto atual é orientado a instalações dedicadas por cliente.

A integração Slack deve respeitar o mesmo modelo.

Cada instalação do UTM Builder pode ter:

```text
1 instalação UTM Builder
1 banco PostgreSQL
1 Slack App ou configuração Slack autorizada
1 conjunto próprio de campanhas e cadastros
1 configuração Bitly opcional
```

A primeira implementação não precisa introduzir arquitetura multi-tenant.

## MVP proposto

### Escopo

- criar Slack App;
- configurar Slash Command `/utm`;
- abrir modal;
- carregar opções da API;
- gerar e validar UTMs pelo backend;
- salvar no histórico atual;
- retornar URL no Slack;
- registrar origem `slack`;
- registrar usuário Slack;
- permitir encurtamento Bitly quando configurado.

### Fora do MVP

- App Home completa;
- consulta avançada de histórico;
- edição de campanhas pelo Slack;
- administração de usuários pelo Slack;
- multi-workspace;
- inteligência artificial;
- linguagem natural livre para geração automática;
- Microsoft Teams;
- notificações automáticas.

## Fases sugeridas

### Fase 1. Auditoria da engine atual

Objetivo:

- localizar todas as regras de geração e validação;
- verificar o que está no frontend e o que está no backend;
- identificar endpoints reutilizáveis;
- definir quais ajustes de API são necessários.

Nenhum Slack App deve ser implementado antes dessa análise.

### Fase 2. Contrato da API

Definir:

- endpoints;
- schemas de entrada e saída;
- autenticação de serviço;
- erros de domínio;
- metadados de auditoria;
- integração com campanhas e cadastros.

### Fase 3. Protótipo Slack

Implementar:

- `/utm`;
- modal mínimo;
- geração de URL;
- resposta privada ao usuário;
- ambiente de desenvolvimento.

### Fase 4. Persistência e governança

Adicionar:

- gravação no histórico;
- campanha;
- usuário Slack;
- `created_via`;
- auditoria.

### Fase 5. Bitly

Adicionar ação opcional de encurtamento reutilizando a integração backend existente.

### Fase 6. Hardening

Executar:

- revisão de segurança;
- testes;
- tratamento de erros;
- logs;
- documentação de deploy;
- atualização de variáveis de ambiente;
- validação em workspace de teste.

### Fase 7. Evoluções

Avaliar:

- App Home;
- histórico no Slack;
- favoritos;
- duplicar UTM existente;
- templates;
- notificações;
- geração assistida por linguagem natural;
- outras interfaces.

## Critérios de sucesso do MVP

A integração pode ser considerada funcional quando:

1. um usuário autorizado executa `/utm`;
2. o Slack abre o fluxo de criação;
3. campanhas e opções são carregadas do UTM Builder;
4. o backend valida os dados;
5. a URL é gerada usando as mesmas regras do sistema web;
6. o link é salvo no mesmo histórico atual;
7. a auditoria identifica criação via Slack;
8. o usuário recebe a URL final;
9. o Bitly pode ser acionado quando configurado;
10. nenhuma regra de taxonomia precisa ser mantida duplicadamente no Slack.

## Riscos técnicos

### Duplicação de lógica

Risco mais importante.

Se o Slack implementar regras próprias, frontend e Slack podem gerar URLs diferentes.

Mitigação:

centralizar a lógica no backend.

### Estado conversacional

Fluxos totalmente conversacionais exigem controle de estado.

Mitigação:

usar modal como principal mecanismo de coleta.

### Permissões Slack

Scopes excessivos aumentam superfície de risco.

Mitigação:

usar apenas os scopes mínimos necessários.

### Acoplamento com estrutura atual

Alguns campos podem estar hoje implementados apenas no frontend.

Mitigação:

auditar antes de implementar e criar contratos canônicos de API.

### Instalação por cliente

Cada cliente pode possuir workspace e políticas Slack próprias.

Mitigação:

manter a integração configurável por instalação single-tenant.

## Decisões recomendadas

Para uma futura implementação, recomenda-se partir das seguintes decisões:

1. Slack será uma interface adicional, não um produto separado.
2. O backend do UTM Builder continuará sendo a fonte de verdade.
3. O Slack App não acessará o PostgreSQL diretamente.
4. A engine de UTM será compartilhada entre Web e Slack.
5. O MVP usará Slash Command mais modal.
6. A persistência continuará no catálogo atual de links.
7. O Bitly continuará exclusivamente no backend.
8. O modelo inicial continuará single-tenant.
9. A implementação começará somente após auditoria da lógica atual.
10. App Home e linguagem natural ficam como evoluções posteriores.

## Questões para análise antes da implementação

- Quais regras de geração ainda estão somente no frontend?
- O backend já expõe todas as opções administrativas necessárias?
- Existe endpoint específico para validação sem persistência?
- Como campanhas, grupos e tipos de anúncio estão relacionados atualmente?
- Qual modelo de autenticação de serviço será usado entre Slack App e API?
- Será necessário mapear usuários Slack para usuários internos já no MVP?
- A primeira instalação será somente no workspace da Ad Rock ou também será oferecida aos clientes?
- A resposta final deve ser privada ao usuário ou compartilhável em canal?
- O comando oficial será `/utm` ou `/utm-builder`?
- O Slack App será executado junto ao backend existente ou em processo separado?

## Conclusão

A integração com Slack é tecnicamente compatível com a arquitetura atual do UTM Builder e pode ampliar significativamente a adoção do produto dentro de equipes.

A principal diretriz é evitar que o Slack se transforme em uma segunda implementação do gerador.

O UTM Builder deve evoluir para uma engine central de governança de tracking, enquanto Web e Slack funcionam como interfaces sobre a mesma API, as mesmas regras, os mesmos cadastros e o mesmo histórico.
