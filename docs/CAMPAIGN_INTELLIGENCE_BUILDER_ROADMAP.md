# Campaign Intelligence Builder - Arquitetura e Roadmap

Data da análise: 2026-08-10

## Objetivo

Este documento registra o diagnóstico do estado atual do `utm_builder` e propõe uma evolução incremental de UTM Builder para Campaign Intelligence Builder, preservando funcionalidades existentes e respeitando a governança por spec-kit já adotada no projeto.

Nenhuma implementação foi iniciada nesta análise. Este documento deve ser revisado e aprovado antes da criação de specs implementáveis, migrations, endpoints ou alterações de interface.

## Resumo executivo

O produto atual já deixou de ser apenas um gerador de UTMs: ele possui autenticação, usuários, campanhas, links persistidos, auditoria, cadastros administrativos, presets GA4, exportação CSV, documentos de apoio e integração Bitly. A arquitetura, porém, ainda é centrada em `utm_campaigns` e `utm_links`.

A nova visão exige uma entidade persistente de `Creative` como source of truth da peça criativa. Essa entidade deve ser introduzida de forma complementar, sem renomear ou quebrar as tabelas existentes. O caminho recomendado é criar uma camada Creative Core que se relacione com campanhas e links atuais, depois evoluir para taxonomia versionada, classificação, APIs de integração, sincronização GA4 e consumo pelo Report Hub.

O primeiro MVP recomendado inclui Creative, Creative ID, vínculo com campanha/link, taxonomia v1, classificação manual com revisão humana, auditoria mínima e API básica para integrações. GA4, Report Hub, OpenAI Analytics, hipóteses e experimentos devem ficar para fases posteriores.

## Estado atual relevante

### Arquitetura

- Frontend: React + Vite + TypeScript + Tailwind.
- Backend: Node.js + Express + PostgreSQL.
- Banco: schema único em `server/src/db/schema.sql`, aplicado por `ensureSchema()` na inicialização.
- Rotas Express com SQL direto via `pool.query`.
- Autenticação por sessão Bearer em tabela `sessions`.
- Perfis de usuário: `admin`, `editor`, `viewer`.
- Auditoria em tabela `audit_logs`.
- Deploy/documentação orientados a instalação single-tenant.

### Entidades existentes

- `users`: usuários operacionais do sistema.
- `sessions`: sessões de login do frontend.
- `utm_campaigns`: melhor representação atual de Campaign.
- `utm_links`: tracking links parametrizados com UTMs.
- `select_options`: cadastros operacionais para selects.
- `utm_channel_presets`: presets oficiais/operacionais de canais GA4.
- `audit_logs`: trilha mínima de eventos.
- `document_links`: links para planilhas modelo e materiais de apoio.
- `app_settings`: branding, logo e nome do sistema.

### APIs atuais

- `/api/auth`
- `/api/users`
- `/api/utm-campaigns`
- `/api/utm-links`
- `/api/settings`
- `/api/documents`
- `/api/audit-logs`
- `/api/exports`
- `/api/health`

O padrão atual é simples e consistente: cada domínio possui um router Express, usa `requireAuth` nas rotas protegidas e registra eventos relevantes via `logAudit`.

### Testes e migrations

Não há suíte de testes própria identificada no repositório. Também não há estrutura formal de migrations versionadas; o banco é evoluído por `schema.sql` com `create table if not exists`, `alter table add column if not exists` e inserts idempotentes.

Antes de implementar a evolução Creative, é recomendável decidir se o projeto continuará com `schema.sql` idempotente ou se passará a ter migrations versionadas. Para esta mudança, migrations versionadas são mais seguras.

## Partes da visão que já existem

- Governança de campanhas via `utm_campaigns`.
- Governança de links parametrizados via `utm_links`.
- Campos de mídia e classificação operacional leve: `action_type`, `destination_type`, `ad_group_name`, `ad_type`.
- Sugestões e cadastros para `utm_content`, `utm_term`, `utm_id`.
- Taxonomia UTM Porvir documentada em `docs/PORVIR_UTM_TAXONOMY.md`.
- Presets GA4 em `utm_channel_presets`.
- Auditoria mínima em `audit_logs`.
- Exportação CSV para links e campanhas.
- Segurança básica: Helmet, CORS configurável, rate limit, autenticação Bearer, roles.
- Integração Bitly para links salvos.

## Lacunas principais

- Não existe entidade Creative/Peça.
- Não existe `creative_id` persistente, imutável e independente de UTM.
- Não existe entidade `clients`; cliente hoje é texto em `utm_campaigns.client_name` e opção em `select_options`.
- Não existe taxonomia criativa versionada.
- Não existe classificação criativa com estados, revisão humana e histórico.
- Não existe API separada para agentes externos com scopes.
- Não existe suporte a idempotência de chamadas de integração.
- Não existe armazenamento/referência formal de ativos criativos.
- Não existe ingestão ou persistência de performance GA4.
- Não existe camada de mapping legado entre UTMs e Creative.
- Não existe registro versionado de prompts, outputs de IA ou custos.
- Specs e tasks existentes estão parcialmente desatualizados em relação ao código implementado.

## Conflitos e duplicações potenciais

### `select_options` vs Creative Taxonomy

`select_options` é útil para cadastros operacionais simples, mas não deve virar a tabela de taxonomia criativa. Ela não preserva versão histórica, aplicabilidade por tipo de peça, obrigatoriedade, opções por atributo nem vínculo confiável com classificações antigas.

Recomendação: reaproveitar padrões de UI/admin de `select_options`, mas criar tabelas próprias para Creative Taxonomy.

### `ad_type` vs Creative Type

`ad_type` hoje descreve formato/tipo de anúncio ou peça no contexto do link. Pode ser fonte inicial para Creative Types, mas não deve ser confundido automaticamente com a entidade futura `creative_types`.

Recomendação: criar `creative_types` e migrar/adaptar valores progressivamente, mantendo `utm_links.ad_type` por compatibilidade.

### `utm_id` vs Creative ID

`utm_id` já é usado como identificador manual de campanha/elemento e pode ser lido pelo GA4. A visão nova pede um Creative ID permanente. Usar `utm_id` diretamente pode ser bom para matching futuro, mas arriscado para histórico e padrões já adotados.

Recomendação: Creative ID deve ser chave interna permanente. A estratégia de exposição em UTM deve ser decidida por spec específica de Tracking Mapping.

### `client_name` vs Client

O sistema é single-tenant por instalação, mas já possui `client_name` em campanhas para separar clientes/projetos operacionais. A nova visão multi-client do Porvir exige um conceito mais forte de cliente.

Recomendação: criar `clients` como entidade futura, mas sem migrar tudo de imediato. Inicialmente, `creatives.client_id` pode apontar para `clients`, e campanhas legadas podem ser associadas progressivamente.

## Arquitetura futura recomendada

### Princípio

Adicionar novos domínios ao redor do núcleo atual, sem reescrever `utm_campaigns` e `utm_links`.

Modelo conceitual:

```text
Client
  -> Campaign
    -> Creative
      -> CreativeClassification
      -> CreativeTrackingLink
        -> utm_links
      -> CreativePerformanceDaily
      -> CreativeAnalysis
      -> CreativeLearning
```

### Domínios propostos

1. Client Core
   - Normaliza clientes/projetos.
   - Evita dependência exclusiva de texto em `client_name`.

2. Creative Core
   - Cria a entidade `Creative`.
   - Gera e preserva `creative_id`.
   - Relaciona Creative com cliente, campanha e links.

3. Tracking Mapping
   - Define como Creative se associa a `utm_links`.
   - Preserva links legados.
   - Permite matching por Creative ID em novos links.

4. Creative Taxonomy
   - Taxonomias versionadas.
   - Atributos, opções, obrigatoriedade e aplicabilidade.

5. Classification
   - Classificações com estados: `draft`, `ai_suggested`, `human_reviewed`, `approved`.
   - Valores por atributo.
   - Histórico e revisão humana.

6. Integration API
   - API externa versionada.
   - Scopes, rate limits, idempotência, logs e autenticação própria para agentes.

7. Asset Reference
   - Referência segura ao ativo original.
   - Pode começar com URL externa/Drive e evoluir para storage próprio.

8. GA4 Performance
   - ETL/sync idempotente.
   - Persistência diária agregada.
   - Matching determinístico e legado.

9. Report Hub Contract
   - APIs de leitura para Report Hub.
   - Campaign Intelligence Builder continua WRITE/GOVERNANCE/SOURCE OF TRUTH.
   - Report Hub continua READ/ANALYTICS/INTELLIGENCE.

10. AI Governance
   - Prompts versionados.
   - Logs de modelo, prompt, input controlado, output, aprovação humana e custo.

## Estratégia recomendada para Creative ID

Creative ID deve ser:

- único;
- permanente;
- independente do id técnico UUID;
- criado antes da publicação;
- imutável por padrão;
- exposto para integrações e analytics;
- não dependente de campos UTM mutáveis.

Recomendação inicial:

- manter `id` como UUID técnico;
- criar `creative_id` como texto único;
- gerar por serviço centralizado;
- armazenar componentes de geração quando necessário;
- não renomear links antigos;
- permitir campo de mapping para UTMs legadas.

Exemplo conceitual aceitável para estudo, ainda não definitivo:

```text
crt_{client_code}_{year}_{sequence}
crt_ec_2026_000184
```

Decisão pendente: confirmar se o prefixo deve carregar cliente/campanha ou se deve ser opaco. IDs com semântica ajudam leitura humana, mas podem criar custo quando cliente/nomenclatura muda.

## Estratégia para UTMs e tracking

O modelo recomendado é:

```text
Creative
  -> Tracking Link
    -> UTM Parameters
```

No banco atual, `utm_links` já representa Tracking Link. Portanto, a evolução mais compatível é adicionar associação opcional entre Creative e `utm_links`, sem exigir que todo link tenha Creative no primeiro ciclo.

Opções avaliadas:

- usar `utm_id`: bom para GA4, mas pode conflitar com usos atuais;
- incorporar em `utm_content`: não recomendado como padrão, pois `utm_content` já descreve contexto/peça;
- manter chave interna e mapear para UTMs: mais seguro para transição;
- criar camada de mapping: recomendado para histórico e flexibilidade.

Recomendação: começar com mapping explícito e decidir, em spec própria, quando novos links devem gravar `creative_id` em `utm_id`.

## Taxonomia criativa

Taxonomia criativa deve ser persistida em tabelas próprias, versionável e histórica.

Modelo conceitual recomendado:

- `creative_taxonomies`
- `creative_taxonomy_versions`
- `creative_attributes`
- `creative_attribute_options`
- `creative_type_attribute_rules`
- `client_taxonomy_extensions` ou equivalente futuro

Classificações devem sempre apontar para a versão usada. Uma classificação feita com v1 não deve ser reinterpretada automaticamente como v2.

## Classificação

Modelo conceitual recomendado:

- `creative_classifications`
- `creative_classification_values`
- `creative_classification_events` ou uso expandido de `audit_logs`

Fluxo obrigatório:

```text
AI suggestion -> human review -> approved classification
```

A IA nunca deve ser autoridade final. Toda aprovação deve registrar usuário, timestamp, versão da taxonomia, origem da sugestão e alterações feitas.

## Auditoria

`audit_logs` pode ser reaproveitada para eventos de alto nível, como criação de Creative, vínculo com link e aprovação de classificação.

Para histórico granular de classificação, recomenda-se tabela específica de eventos ou revisões. Guardar apenas snapshots no `audit_logs.metadata` tende a dificultar diffs, reclassificação e trilha de revisão.

## API para Custom GPT e integrações

Não é recomendado usar sessões normais de usuário para Custom GPT.

Recomendação:

- criar credenciais de integração próprias;
- usar API keys ou OAuth conforme avaliação;
- hashear tokens no banco;
- definir scopes por consumidor;
- registrar `last_used_at`, status, dono, expiração opcional;
- exigir idempotency key em operações de escrita externas;
- limitar por rate limit específico.

Scopes iniciais possíveis:

- `classifier.read_clients`
- `classifier.read_creative_types`
- `classifier.read_taxonomy`
- `classifier.create_creative`
- `classifier.create_classification`
- `classifier.update_classification`
- `reporthub.read_creatives`
- `reporthub.read_classifications`
- `reporthub.read_performance`

## Preservação de links existentes

Links existentes devem continuar válidos, exportáveis e editáveis.

Estratégia recomendada:

- `utm_links` permanece como tabela source para links existentes.
- associação com Creative deve ser opcional no início.
- links sem Creative aparecem como `unassigned` ou equivalente.
- nenhum campo UTM histórico deve ser sobrescrito por migração automática.
- mapping legado deve permitir reconstrução por `utm_campaign`, `utm_content`, `utm_term`, `utm_id`, `utm_source`, `utm_medium`.
- exports atuais devem continuar funcionando.

O ambiente atual em AWS deve ser tratado como produção ativa. A evolução para Campaign Intelligence Builder deve ocorrer em camadas novas e aditivas, permitindo que melhorias normais no UTM Builder vigente continuem acontecendo em paralelo. A trilha atual de links, campanhas, Bitly, filtros, exports e ajustes de UI não deve ficar bloqueada pela trilha Creative.

Regras de proteção para produção:

- não alterar o comportamento atual de geração, edição, exportação e validação de links sem uma spec própria;
- não fazer renames técnicos de tabelas, rotas, pacotes ou env vars para viabilizar o novo nome de produto;
- não exigir associação retroativa imediata dos links existentes a Creative;
- testar migrations em staging com cópia recente do banco antes de produção;
- executar backup antes de qualquer deploy com alteração de banco;
- preferir feature flags ou navegação separada para módulos Creative até estabilização;
- garantir rollback simples: se a camada nova falhar, o fluxo atual de UTM Builder deve continuar disponível.

## Matching GA4 e Creative

Estratégia dupla:

1. Current: matching determinístico por Creative ID para novos links.
2. Legacy: matching por regras/mapping de UTMs existentes.

Para GA4, a recomendação inicial é usar a GA4 Data API sem BigQuery. Isso evita custos de armazenamento/processamento do BigQuery no primeiro ciclo e mantém o custo operacional mais previsível. O sistema deve consultar o GA4 sob demanda, acionado por usuário autorizado, e persistir localmente snapshots agregados para leitura posterior.

O fluxo recomendado é semanal sob demanda:

```text
Usuário escolhe cliente/campanha/período
  -> sistema consulta GA4 Data API
  -> sistema salva/atualiza métricas agregadas por peça/link/dia
  -> relatórios leem o banco local
  -> reprocessamento do mesmo período usa upsert e não duplica dados
```

Essa abordagem combina controle de cota, controle de custo e histórico comparável. Como o time acompanha evolução das peças semanalmente, a interface deve priorizar atualização dos últimos 7, 14 ou 30 dias e permitir reprocessar períodos anteriores quando necessário.

O Campaign Intelligence Builder deve armazenar performance agregada diária suficiente para governança, reconciliação e integração com Report Hub. A visualização pode ser semanal/mensal, mas a granularidade diária preserva flexibilidade para comparações futuras.

Modelo conceitual:

- `ga4_data_sources`
- `ga4_sync_runs`
- `creative_performance_daily`
- `creative_tracking_mappings`

Sincronizações devem ser idempotentes por chave composta, por exemplo data + client + creative/link + conjunto UTM + métrica.

### Multi-cliente e propriedades GA4

Como o Campaign Intelligence Builder deve atender múltiplos clientes, a integração GA4 precisa permitir várias propriedades GA4 e, no futuro, diferentes estratégias de credencial por cliente.

Recomendação para o MVP:

- usar um projeto Google Cloud central do Campaign Intelligence Builder;
- cadastrar múltiplas propriedades GA4 no sistema, uma ou mais por cliente;
- manter as permissões de acesso ao GA4 por propriedade/autorização;
- registrar cada conexão em `ga4_data_sources`;
- associar cada execução de consulta a um cliente, propriedade GA4, período e usuário;
- centralizar logs, erros, cotas e status das conexões no próprio sistema.

Esse modelo reduz complexidade operacional no início: um projeto Google Cloud controla a integração, enquanto o banco diferencia os clientes e propriedades conectadas.

Modelo conceitual de `ga4_data_sources`:

- `id`
- `client_id`
- `name`
- `ga4_property_id`
- `google_cloud_project_id`
- `credential_reference`
- `auth_type`
- `status`
- `last_sync_at`
- `created_at`
- `updated_at`

O schema deve permitir mais de uma credencial/projeto Google Cloud, mesmo que o MVP use apenas um projeto central. Isso evita acoplamento rígido e permite exceções futuras.

Quando considerar múltiplos projetos Google Cloud:

- cliente exige isolamento completo;
- cliente quer pagar/controlar o próprio Google Cloud;
- cotas do projeto central viram gargalo;
- contrato exige segregação por cliente;
- políticas de segurança impedem credencial compartilhada;
- integrações precisam de owners e faturamento separados.

Arquitetura alvo flexível:

```text
Cliente A -> GA4 property A -> projeto Google Cloud central
Cliente B -> GA4 property B -> projeto Google Cloud central
Cliente C -> GA4 property C -> projeto Google Cloud do cliente, se necessário
```

Portanto, a decisão de produto para o MVP é: começar com um projeto Google Cloud central, mas modelar `ga4_data_sources` para suportar múltiplos projetos e múltiplas credenciais sem refatoração estrutural.

### Volume e retenção de performance

O dimensionamento inicial deve considerar volume alto, não apenas o histórico atual. Referência de planejamento:

- 500 peças por mês;
- aproximadamente 6.000 peças por ano;
- 1 a 3 tracking links por peça;
- performance diária agregada por peça/link;
- retenção mínima de 12 meses para análise comparativa e leitura de longo prazo.

Mesmo no cenário máximo simplificado de 6.000 peças ativas por 365 dias, a tabela `creative_performance_daily` ficaria na ordem de poucos milhões de linhas por ano, volume administrável em PostgreSQL com índices adequados. Na prática, o volume tende a ser menor porque nem toda peça roda todos os dias.

Recomendações de armazenamento:

- não armazenar eventos brutos do GA4 no Campaign Intelligence Builder;
- armazenar métricas agregadas por dia, peça/link, cliente, campanha e conjunto UTM;
- criar índices por `client_id`, `campaign_id`, `creative_id`, `date` e chaves UTM usadas em matching;
- manter pelo menos 12 meses em granularidade diária;
- avaliar consolidação mensal para dados mais antigos após 12 ou 24 meses, se o volume crescer;
- registrar cada atualização em `ga4_sync_runs` com usuário, período, status, linhas atualizadas, erros e quota aproximada consumida.

BigQuery deve ser reavaliado apenas se houver necessidade de consultar eventos brutos, volumes muito maiores, cruzamentos complexos fora do app ou processamento analítico pesado.

## Custos de GA4 e OpenAI

### GA4

No primeiro ciclo, a estratégia recomendada é evitar BigQuery e usar GA4 Data API sob demanda. A Data API exige projeto Google Cloud, credenciais e respeito a cotas, mas não introduz o modelo de cobrança do BigQuery por armazenamento e processamento de consultas.

Custos diretos relevantes só entram se o projeto decidir usar BigQuery Export ou outros serviços pagos do Google Cloud. O BigQuery pode ser útil no futuro, mas não é requisito para o MVP nem para relatórios semanais de peças quando o sistema armazena snapshots agregados no PostgreSQL.

### OpenAI

Análises com LLM devem ser feature opcional e posterior, depois que Creative, taxonomia, classificação e performance já estiverem funcionando. Assinatura de ChatGPT do cliente não deve ser assumida como cobertura para uso de API. A OpenAI API possui faturamento separado e cobra por uso/tokens.

Recomendações para fase futura:

- habilitar análises por LLM apenas por configuração;
- executar análise manualmente, não automaticamente em todas as telas;
- registrar custo estimado por execução;
- impor limite mensal por cliente/instalação;
- usar modelos mais baratos para resumos simples;
- reservar modelos mais fortes para análises profundas;
- cachear análises por dataset/período;
- versionar prompts e structured outputs;
- manter a regra de não afirmar causalidade sem evidência experimental.

## Fronteira entre UTM Builder e Report Hub

A evolução Campaign Intelligence Builder deve nascer dentro do sistema atual em:

```text
https://utms.porvir.org/
```

Esse ambiente é a camada de operação, governança e source of truth. Portanto, ficam no UTM Builder/Campaign Intelligence Builder:

- criação e cadastro de peças;
- geração de Creative ID;
- relacionamento entre cliente, campanha, peça e tracking links;
- classificação criativa;
- revisão e aprovação de classificação;
- governança de taxonomia;
- geração, validação e associação de UTMs;
- consulta sob demanda ao GA4;
- persistência de snapshots de performance;
- histórico e auditoria;
- APIs de integração para GPT Classifier, automações e Report Hub.

O Report Hub permanece em:

```text
https://relatorios.porvir.org/
```

Esse ambiente é a camada de leitura, visualização e inteligência analítica. Portanto, ficam no Report Hub:

- dashboards;
- rankings;
- comparações;
- performance por atributo criativo;
- visão executiva por cliente/campanha;
- análises de tendência;
- insights e análises com LLM quando a feature futura for aprovada;
- consumo read-only dos dados governados pelo Campaign Intelligence Builder.

Divisão conceitual:

```text
utms.porvir.org
= cadastrar, governar, classificar, parametrizar, sincronizar e auditar

relatorios.porvir.org
= visualizar, comparar, analisar e gerar inteligência
```

Na experiência do usuário, os dois produtos podem parecer um ecossistema integrado. Tecnicamente, porém, a fronteira deve ser preservada: o Campaign Intelligence Builder produz e governa os dados; o Report Hub consome e interpreta esses dados sem editar taxonomia, classificação ou tracking.

## Dashboards e visualizações

Os dashboards devem ser especificados em dois níveis, respeitando a fronteira entre sistemas.

### Dashboard operacional no Campaign Intelligence Builder

Local:

```text
https://utms.porvir.org/
```

Objetivo: mostrar se o processo de governança está completo e saudável.

Perguntas que deve responder:

- quantas peças existem por cliente/campanha;
- quais peças ainda não foram classificadas;
- quais classificações aguardam revisão humana;
- quais peças possuem Creative ID;
- quais peças possuem tracking link/UTM associado;
- quais links estão sem Creative;
- quais peças não possuem performance importada;
- quando a performance GA4 foi atualizada pela última vez;
- quais execuções GA4 falharam ou ficaram incompletas;
- qual a cobertura de classificação e tracking por cliente/campanha.

Componentes recomendados:

- cards de KPI operacional;
- funil de completude;
- tabela de pendências;
- lista de últimas execuções GA4;
- filtros por cliente, campanha, tipo de peça, status de classificação, status de tracking e período;
- alertas de dados incompletos.

KPIs operacionais iniciais:

- peças cadastradas;
- peças com Creative ID;
- peças classificadas;
- peças aprovadas;
- peças sem classificação;
- peças com UTM/link válido;
- peças sem tracking válido;
- peças com performance importada;
- última atualização GA4;
- erros de sync GA4.

Gráficos operacionais recomendados:

- funil: criada -> classificada -> aprovada -> UTM gerada -> performance importada;
- barras empilhadas por status de classificação;
- barras por cliente/campanha com cobertura de tracking;
- tabela de pendências priorizada por campanha e data;
- timeline simples de execuções GA4 e erros.

Esse dashboard não deve tentar substituir o Report Hub. Ele deve ajudar o time a completar o fluxo e corrigir lacunas de governança.

### Dashboard analítico no Report Hub

Local:

```text
https://relatorios.porvir.org/
```

Objetivo: comparar performance de peças, campanhas e atributos criativos.

Perguntas que deve responder:

- como usuários, sessões, conversões e taxa de conversão evoluíram por semana;
- quais peças tiveram melhor performance no período;
- quais peças tiveram bom tráfego e baixa conversão;
- quais atributos criativos aparecem associados a melhor ou pior performance;
- quais canais/campanhas concentram conversões;
- quais peças ainda não podem ser analisadas por falta de classificação ou tracking;
- quais comparações são apenas observacionais e não devem ser tratadas como causalidade.

Componentes recomendados:

- cards de KPI analítico;
- evolução semanal;
- ranking de peças;
- performance por atributo;
- comparação entre atributos;
- dispersão tráfego x conversão;
- tabela detalhada de peças;
- listas de oportunidades e lacunas de dados.

KPIs analíticos iniciais:

- peças analisadas;
- peças com conversão;
- usuários;
- sessões;
- sessões engajadas;
- conversões/key events;
- taxa de conversão;
- melhor peça por objetivo;
- atributo com melhor desempenho observado;
- peças sem classificação;
- peças sem tracking válido.

Gráficos analíticos recomendados:

- cards: usuários, sessões, conversões, CVR, peças analisadas;
- linha temporal semanal: usuários, sessões, conversões e CVR;
- tabela ranking: imagem/referência da peça, campanha, canal, atributos principais, usuários, conversões e CVR;
- barras horizontais: performance por atributo criativo;
- matriz/heatmap simples: atributo x métrica;
- dispersão: tráfego x conversão por peça;
- comparação lado a lado: presença humana vs sem presença humana, CTA por tipo, headline por tipo, formato por tipo;
- lista de peças com alto tráfego e baixa conversão;
- lista de peças com baixa amostra para evitar conclusões fracas.

Filtros analíticos recomendados:

- cliente;
- campanha;
- período;
- semana;
- canal;
- objetivo da peça;
- tipo de peça;
- status de classificação;
- atributo criativo;
- valor do atributo;
- status de tracking;
- legacy mapping vs Creative ID determinístico.

### Tecnologia recomendada para dashboards

Backend/dados:

- PostgreSQL para snapshots agregados;
- APIs read-only do Campaign Intelligence Builder para o Report Hub;
- endpoints agregados por cliente, campanha, período, peça e atributo;
- cache simples por consulta agregada quando necessário;
- `ga4_sync_runs` para explicar atualização e falhas de performance;
- `creative_performance_daily` como base diária para visualizações semanais/mensais.

Frontend:

- React, mantendo a stack atual;
- Recharts para MVP, se a prioridade for velocidade e simplicidade;
- Apache ECharts como alternativa se o Report Hub exigir dashboards mais densos, heatmaps melhores, datasets maiores e interações mais avançadas;
- filtros persistidos em URL/query string;
- tabelas com ordenação, busca e exportação;
- estados explícitos para dados ausentes, baixa amostra, loading e erro.

Recomendação técnica inicial:

- usar Recharts no MVP dos dashboards por simplicidade;
- manter uma camada de componentes de gráfico isolada para permitir trocar para ECharts no Report Hub se a complexidade crescer;
- não colocar visualizações pesadas no Campaign Intelligence Builder;
- priorizar consultas agregadas no backend, evitando processar grandes volumes no navegador.

### Limites de interpretação

Todo dashboard analítico deve diferenciar:

- observação;
- correlação;
- hipótese;
- evidência experimental.

O dashboard não deve afirmar causalidade a partir de dados observacionais. Quando comparar atributos, a UI deve usar linguagem como "apresentou maior CVR no período" e não "converteu mais por causa de".

Comparações devem considerar:

- tamanho de amostra;
- objetivo da peça;
- canal;
- período;
- campanha;
- diferenças de distribuição;
- tracking legado vs determinístico.

### Escopo recomendado para o primeiro dashboard

Primeiro dashboard operacional no CIB:

- KPIs de cobertura;
- funil de completude;
- pendências de classificação/tracking;
- status de atualização GA4.

Primeiro dashboard analítico no Report Hub:

- KPIs do período;
- evolução semanal;
- ranking de peças;
- performance por atributo;
- peças com lacunas de dados.

Fora do primeiro dashboard:

- análise automática por LLM;
- causalidade;
- significância estatística avançada;
- recomendações automáticas de criação;
- dashboards em tempo real;
- exploração livre de eventos brutos.

## Integração com Report Hub

O Report Hub deve consumir dados estruturados do Campaign Intelligence Builder, não editar taxonomias ou classificações.

Contrato recomendado:

- endpoints de leitura versionados;
- filtros por cliente, campanha, período, objetivo e status de classificação;
- payloads prontos para dashboards e análises;
- sinalização de `legacy_mapping`;
- separação clara entre dados governados e interpretações analíticas.

## Rebranding

Separar duas frentes:

### Rename de produto

Pode evoluir em UI, documentação, título e app settings. Risco baixo/moderado.

### Rename técnico

Não recomendado no curto prazo para tabelas, pacotes, rotas, env vars e namespaces. O custo e risco de churn são altos e não desbloqueiam a arquitetura Creative.

Recomendação: adotar Campaign Intelligence Builder como nome conceitual/produto e manter nomes técnicos existentes até haver motivo específico.

## Modularização comercial e rollout

Campaign Intelligence Builder deve ser tratado como módulo habilitável, não como substituição obrigatória do UTM Builder. O mesmo código-base deve permitir vender somente o UTM Builder ou vender módulos adicionais conforme maturidade e necessidade do cliente.

Modelo comercial recomendado:

```text
Produto base:
UTM Builder

Módulos opcionais:
+ Campaign Intelligence
+ GA4 Performance
+ Report Hub Integration
+ OpenAI Analytics
+ Slack Operational Interface, futuro/opcional
```

### Plano base - UTM Builder

Sempre ativo em instalações comerciais.

Inclui:

- clientes/campanhas;
- geração e validação de UTMs;
- catálogo de links;
- filtros;
- exportação;
- Bitly opcional;
- usuários;
- auditoria básica;
- documentos de apoio;
- cadastros operacionais.

### Add-on - Campaign Intelligence

Habilitável por instalação/cliente.

Inclui:

- cadastro de peças;
- Creative ID;
- vínculo entre peça, campanha e tracking links;
- tipos de peça;
- taxonomia criativa;
- classificação manual;
- revisão e aprovação;
- histórico de classificação;
- indicadores de completude.

### Add-on - GA4 Performance

Habilitável depois do Campaign Intelligence.

Inclui:

- conexões GA4 por cliente/propriedade;
- atualização sob demanda;
- snapshots agregados;
- histórico mínimo de 12 meses;
- evolução semanal;
- matching por Creative ID e legado.

### Add-on - Report Hub Integration

Habilitável quando o cliente contratar camada analítica.

Inclui:

- APIs read-only;
- contratos para dashboards;
- rankings;
- performance por atributo;
- payloads preparados para o Porvir Report Hub ou outra camada de relatórios.

### Add-on futuro - OpenAI Analytics

Habilitável somente depois dos dados governados e de performance estarem consolidados.

Inclui:

- análise com LLM;
- prompts versionados;
- structured outputs;
- logs de custo;
- limites por execução/cliente;
- regra explícita contra causalidade inventada.

### Add-on futuro - Slack Operational Interface

Habilitável somente depois de decisao explicita, pois exige UTM Engine canonica no backend e aumenta a superficie de integracao externa.

Inclui:

- criacao guiada de link pontual via Slack;
- criacao guiada de link de campanha via Slack;
- leitura de campanhas, presets e cadastros existentes;
- tratamento seguro de valores ainda nao cadastrados;
- auditoria de usuario Slack;
- feature flag por instalacao;
- teste inicial apenas na instancia Ad Rock/DigitalOcean com Slack da Ad Rock.

Referencia: `docs/SLACK_INTEGRATION_UTM_BUILDER_REVIEW.md`.

### Feature flags

A implementação deve introduzir feature flags por instalação, para que uma mesma versão do código suporte diferentes pacotes comerciais.

Modelo conceitual:

```text
utm_builder_enabled = true
campaign_intelligence_enabled = true/false
ga4_performance_enabled = true/false
report_hub_integration_enabled = true/false
ai_analytics_enabled = true/false
slack_integration_enabled = true/false
```

Essas flags podem começar em `app_settings` ou tabela dedicada `feature_flags`. A decisão deve ser tomada na spec implementável, mas os requisitos são:

- módulo desligado não aparece na navegação;
- endpoints de módulo desligado devem responder com permissão/feature indisponível;
- módulos dependentes não podem ser habilitados sem pré-requisitos;
- configuração deve ser auditável;
- mudança de plano comercial não deve exigir fork de código;
- deploy novo não deve ativar automaticamente módulo pago em clientes existentes.
- integracoes externas futuras, como Slack, devem nascer desligadas por padrao.

Dependências comerciais:

```text
UTM Builder
  -> Campaign Intelligence
    -> GA4 Performance
      -> Report Hub Integration
      -> OpenAI Analytics
      -> Slack Operational Interface
```

OpenAI Analytics também depende de governança de prompts, custos e aprovação comercial separada.

### Estratégia de rollout

A evolução deve ser desenvolvida e estabilizada primeiro na instância Ad Rock:

```text
https://mobiledelivery.com.br/utm-builder/
```

Objetivo da instância Ad Rock:

- validar UX;
- validar fluxo de Creative;
- validar feature flags;
- testar migrations aditivas;
- testar compatibilidade com o UTM Builder base;
- testar backup/deploy antes de impactar cliente ativo;
- preparar demonstração comercial.

Depois que a versão Ad Rock estiver 100%, o módulo deve ser habilitado no Porvir:

```text
https://utms.porvir.org/
```

Objetivo do Porvir:

- ser o piloto completo;
- validar Campaign Intelligence com uso real;
- incluir GA4 Performance;
- validar histórico semanal;
- validar integração futura com Report Hub;
- produzir prova comercial do produto modular.

Após validação do piloto Porvir, vender por módulos para novos clientes. Clientes inicialmente na reta comercial:

- Sistema FIEP;
- A Pública.

Estratégia recomendada para esses clientes:

- demonstrar primeiro o UTM Builder base;
- oferecer Campaign Intelligence como módulo adicional;
- oferecer GA4 Performance como add-on quando houver maturidade de dados;
- deixar OpenAI Analytics como fase posterior/opcional com custo separado;
- deixar Slack Operational Interface como fase futura, somente se houver ganho operacional claro;
- evitar prometer Report Hub/LLM como parte obrigatória do primeiro contrato.

### Regra de compatibilidade comercial

Toda nova funcionalidade deve responder a duas perguntas antes de entrar em implementação:

1. Funciona para quem contratou apenas UTM Builder?
2. Pode ficar invisível/inativa para quem não contratou Campaign Intelligence?

Se a resposta for não, a feature precisa ser redesenhada ou protegida por flag.

## Specs afetadas

### `001-standalone-foundation`

Afetada apenas em documentação de visão. A base standalone permanece válida.

### `002-governed-links`

É a base mais impactada. Precisa ser reconciliada porque tasks ainda aparecem pendentes apesar de boa parte estar implementada. Deve ser atualizada para refletir o estado real antes de specs novas dependerem dela.

### `003-public-productization`

Continua relevante para templates, rota pública, segurança e observabilidade, mas deve ganhar dependências explícitas com APIs externas, scopes e integração com Report Hub.

## Specs novas recomendadas

### `004-current-state-reconciliation`

Objetivo: reconciliar specs/tasks/documentação com o estado real do código.

Entregáveis:

- atualizar tasks de `002` conforme implementado;
- registrar lacunas reais;
- definir padrão de migrations;
- registrar baseline de testes;
- atualizar roadmap geral.

### `005-commercial-modularity-and-feature-flags`

Objetivo: definir modelo modular comercial e mecanismo de feature flags para habilitar Campaign Intelligence e add-ons por instalação.

Entregáveis:

- matriz de planos e módulos;
- dependências entre módulos;
- modelo de feature flags;
- regras de navegação/UI para módulos desligados;
- regras de API para módulos desligados;
- auditoria de alterações de flags;
- estratégia de rollout Ad Rock -> Porvir -> novos clientes.

### `006-campaign-intelligence-rebranding`

Objetivo: introduzir o nome Campaign Intelligence Builder na camada de produto sem rename técnico destrutivo.

Entregáveis:

- app name/documentação;
- critérios para UI;
- decisão sobre manter rotas/tabelas técnicas;
- plano de comunicação.

### `007-creative-core`

Objetivo: criar Creative, Creative ID, Creative Types e vínculo com campanhas/links.

Entregáveis:

- modelo de dados;
- geração de Creative ID;
- associação opcional com `utm_links`;
- auditoria básica;
- UI mínima ou API interna.

### `008-creative-taxonomy`

Objetivo: persistir taxonomia criativa versionada.

Entregáveis:

- taxonomias;
- versões;
- atributos;
- opções;
- aplicabilidade por tipo;
- admin UI.

### `009-creative-classification`

Objetivo: classificar peças com revisão humana.

Entregáveis:

- classificação manual;
- estados;
- valores;
- histórico;
- aprovação;
- completude/gamificação leve não competitiva, se aprovado.

### `010-integration-api-and-gpt-classifier`

Objetivo: expor contratos seguros para Custom GPT e outras integrações.

Entregáveis:

- autenticação de integração;
- scopes;
- endpoints de leitura e escrita;
- idempotência;
- logs;
- compatibilidade com GPT Actions.

### `011-creative-assets`

Objetivo: definir armazenamento ou referência de ativos criativos.

Entregáveis:

- asset reference;
- URLs externas ou storage;
- hash;
- privacidade;
- limites de tamanho;
- thumbnails, se necessário.

### `012-ga4-performance-sync`

Objetivo: consultar performance GA4 sob demanda e salvar snapshots agregados de forma idempotente.

Entregáveis:

- fontes GA4;
- sync runs acionados por usuário;
- performance diária;
- backfill;
- atualização semanal dos últimos 7, 14 ou 30 dias;
- retenção mínima de 12 meses;
- matching atual e legado.

### `013-report-hub-contract`

Objetivo: definir APIs/payloads para consumo pelo Porvir Report Hub.

Entregáveis:

- endpoints read-only;
- filtros;
- payloads de rankings;
- performance por atributo;
- contratos para evolução semanal;
- contratos para comparação de atributos;
- sinalização de baixa amostra e lacunas de dados;
- sinalização de mapping legado.

### `014-ai-analytics-governance`

Objetivo: preparar análises por OpenAI API com prompts versionados e rastreabilidade.

Entregáveis:

- prompt templates;
- structured outputs;
- logs de execução;
- política anti-causalidade inventada;
- custo/cache/reprocessamento.

### `015-creative-learning-loop`

Objetivo: hipóteses, experimentos e aprendizados criativos.

Entregáveis:

- hipóteses;
- variantes;
- experimentos;
- resultados;
- aprendizados;
- distinção observacional vs experimental.

### `016-slack-operational-interface`

Objetivo: avaliar e, se aprovado, implementar interface Slack para criacao guiada de links UTM sem romper a experiencia atual do UTM Builder.

Entregáveis:

- decisao de viabilidade comercial/operacional;
- UTM Engine canonica no backend;
- testes de paridade com links existentes;
- fluxo Slack para link pontual;
- fluxo Slack para link de campanha;
- leitura de campos atuais do banco;
- regra para cadastrar ou apenas usar valores novos;
- autenticacao e auditoria Slack;
- feature flag por instalacao;
- homologacao inicial apenas no ambiente Ad Rock/DigitalOcean.

Referencia: `docs/SLACK_INTEGRATION_UTM_BUILDER_REVIEW.md`.

## Roadmap técnico recomendado

### Fase 0 - Discovery, reconciliação e arquitetura

- Consolidar este documento com revisão humana.
- Atualizar specs/tasks existentes conforme estado real.
- Decidir padrão de migrations.
- Definir baseline de testes.
- Mapear dados atuais de produção antes de qualquer alteração.

### Fase 1 - Rebranding conceitual

- Ajustar nome de produto onde fizer sentido.
- Evitar renames técnicos.
- Atualizar documentação e release notes.

### Fase 2 - Modularização comercial e feature flags

- Definir matriz de módulos comerciais.
- Criar mecanismo de feature flags por instalação.
- Garantir que o UTM Builder base continue sempre disponível.
- Garantir que módulos desligados fiquem invisíveis/inacessíveis.
- Preparar rollout Ad Rock -> Porvir -> novos clientes.
- Manter Slack Integration desligada ate decisao futura.

### Fase 3 - Creative Core

- Criar Creative e Creative ID.
- Criar Creative Types.
- Relacionar Creative com campanha e links.
- Manter links sem Creative como válidos.

### Fase 4 - Creative Taxonomy

- Criar taxonomia versionada.
- Criar atributos e opções.
- Definir aplicabilidade por tipo de peça.
- Criar administração inicial.

### Fase 5 - Classification

- Criar classificação manual.
- Criar fluxo de revisão/aprovação.
- Criar histórico.
- Criar indicadores de completude.

### Fase 6 - Integration API

- Criar autenticação de integrações.
- Criar scopes.
- Criar endpoints para clientes, tipos, taxonomia, creatives e classificações.
- Adicionar idempotência e logs.

### Fase 7 - GPT Classifier

- Conectar Custom GPT à API.
- Ler clientes, tipos e taxonomia.
- Receber sugestão.
- Exigir revisão humana antes de aprovar.
- Registrar auditoria de IA.

### Fase 8 - Asset Reference

- Decidir storage ou URL externa.
- Registrar asset original.
- Avaliar hash, thumbnails, privacidade e expiração.

### Fase 9 - GA4 Performance

- Configurar fonte GA4 via Data API.
- Criar atualização sob demanda acionada por usuário.
- Registrar execuções em `ga4_sync_runs`.
- Criar performance diária agregada.
- Preservar histórico mínimo de 12 meses.
- Implementar matching por Creative ID e legado.

### Fase 10 - Report Hub Integration

- Expor APIs read-only.
- Entregar payloads de Creative Intelligence.
- Validar separação source of truth vs analytics.

### Fase 11 - OpenAI Analytics

- Criar prompts versionados.
- Usar structured outputs.
- Registrar análises, custos e limitações.
- Aplicar regra anti-causalidade.

### Fase 12 - Creative Learning

- Registrar hipóteses.
- Associar hipóteses a peças.
- Registrar aprendizados.
- Evoluir para experimentos controlados.

## Dependências entre fases

```text
Fase 0 -> todas
Fase 1 -> independente, não bloqueia Creative Core
Fase 2 -> todas as fases de módulos opcionais
Fase 3 -> Fases 4, 5, 9, 10
Fase 4 -> Fase 5
Fase 5 -> Fases 6, 7, 10, 11
Fase 6 -> Fase 7 e integrações futuras
Fase 9 -> Fases 10, 11, 12
Fase 10 -> consumo analítico pelo Report Hub
Fase 11 -> Creative Learning analítico
```

## MVP recomendado

O MVP mais útil e seguro deve conter:

- Creative.
- Creative ID.
- Creative Types.
- vínculo com `utm_campaigns`.
- vínculo opcional com `utm_links`.
- taxonomia criativa v1.
- classificação manual.
- estados de classificação.
- revisão/aprovação humana.
- auditoria mínima.
- API básica para leitura de clientes, tipos e taxonomia.
- API básica para criação de Creative e classificação.
- compatibilidade total com links existentes.

## Fora do MVP

- Sincronização/consulta GA4.
- Report Hub dashboards.
- OpenAI Analytics.
- Slack Operational Interface.
- UTM Engine canonica no backend, salvo se virar prerequisito aprovado para integracao externa.
- Geração automática de insights.
- Hipóteses criativas.
- Experimentos A/B.
- Significância estatística.
- Ranking competitivo entre usuários.
- Autoaprovação por IA.
- Upload/storage definitivo de ativos, salvo se bloqueador do GPT.
- Renomeação técnica de tabelas, rotas, pacotes ou repositório.
- Migração retroativa obrigatória de todos os links.
- BigQuery.
- Automação diária obrigatória de performance.

## Riscos técnicos

- Specs atuais não refletem integralmente o código implementado.
- Ausência de testes automatizados próprios.
- Ausência de migrations versionadas.
- `client_name` como texto dificulta modelo multi-client robusto.
- Deletes físicos em campanhas/links podem conflitar com histórico/auditoria futura.
- `select_options` pode induzir modelagem inadequada para taxonomia versionada.
- Usar `utm_id` como Creative ID sem plano pode quebrar padrões existentes.
- Integrações externas exigem auth/scopes diferentes das sessões atuais.
- Slack Integration exige UTM Engine canonica no backend; se feita sem paridade com o fluxo web atual, pode gerar URLs diferentes das usadas em producao.
- Testes de Slack no Porvir antes de homologacao na Ad Rock podem afetar um cliente ativo.
- Upload de ativos aumenta superfície de segurança e custo.
- GA4 pode ter dados atrasados, amostragem/limites, cotas e mudanças de schema.
- Matching legado por UTM pode ser ambíguo.
- Renames técnicos podem gerar churn sem ganho.

## Dependências externas

- PostgreSQL.
- GA4 Data API, em fase futura.
- BigQuery, apenas se volume/complexidade justificar posteriormente.
- Google Cloud project central para MVP de GA4, com suporte futuro a projetos/credenciais por cliente.
- Bitly, já existente para links.
- OpenAI API, em fase futura de analytics/classificação se aprovada.
- Slack API/Bolt, apenas se a Slack Operational Interface for aprovada como fase futura.
- Custom GPT/GPT Actions.
- Possível Google Drive ou storage externo para ativos.
- Porvir Report Hub como consumidor read-only.

## Decisões pendentes antes de codificar

1. Criar entidade `clients` agora ou apenas preparar transição?
2. Qual padrão definitivo de `creative_id`?
3. `creative_id` deve ser gravado em `utm_id` para novos links?
4. Como tratar links existentes sem Creative?
5. Qual padrão de migrations será adotado?
6. Qual baseline de testes é obrigatório por spec?
7. Quais atributos entram na Taxonomy v1?
8. Taxonomia será global com extensões por cliente ou separada por cliente?
9. Quais Creative Types iniciais entram no MVP?
10. O MVP precisa de asset upload ou basta asset reference por URL?
11. Custom GPT usará API key, OAuth ou outro modelo?
12. Quais scopes mínimos por integração?
13. Quais roles podem revisar e aprovar classificação?
14. O sistema deve permitir reclassificação de peça aprovada?
15. Onde termina Campaign Intelligence Builder e começa Report Hub em termos de performance?
16. Performance GA4 será armazenada no CIB ou só sincronizada para outro destino? Recomendação: consultar GA4 sob demanda e armazenar agregados diários no CIB.
17. Qual política de retenção de inputs/outputs de IA?
18. Qual nível de rebranding será aprovado nesta etapa?
19. Quem aprova mudanças de taxonomia?
20. Como versionar prompts e schemas de IA?
21. O MVP usará um projeto Google Cloud central para GA4? Recomendação: sim, mantendo schema preparado para múltiplos projetos/credenciais por cliente.
22. O módulo Campaign Intelligence Builder nasce em `utms.porvir.org` ou `relatorios.porvir.org`? Recomendação: nasce em `utms.porvir.org`; Report Hub consome dados read-only em `relatorios.porvir.org`.
23. Vale a pena investir na Slack Operational Interface agora ou ela deve esperar maturidade do Campaign Intelligence?
24. A UTM Engine canonica no backend sera criada apenas para Slack ou tambem substituirá gradualmente a geracao da interface web?
25. Quais links reais serao usados como testes de paridade antes de qualquer mudanca na geracao de UTM?
26. O primeiro app Slack sera limitado ao workspace da Ad Rock e ao ambiente DigitalOcean?
27. Usuarios sem permissao administrativa poderao cadastrar novas opcoes pelo Slack ou apenas usar valores manuais no link?

## Respostas objetivas às questões da visão

1. A arquitetura atual é React/Vite frontend, Express backend, PostgreSQL, schema SQL idempotente, auth por sessão Bearer e auditoria mínima.
2. Reutilizáveis: `utm_campaigns`, `utm_links`, `users`, `audit_logs`, `select_options` como padrão administrativo, `utm_channel_presets`, `document_links`.
3. Campaign hoje é melhor representada por `utm_campaigns`.
4. Tracking Links estão em `utm_links`, com `base_url`, parâmetros UTM, `final_url`, Bitly e vínculo opcional com campanha.
5. Não existe conceito equivalente a Creative.
6. Governança de UTM está no UTMBuilder frontend, `utils/utm`, `select_options`, `utm_channel_presets`, `utm_links` e docs de taxonomia.
7. Specs afetadas: 001 em visão, 002 fortemente, 003 em produto/segurança/observabilidade.
8. Specs novas recomendadas: 004 a 015 descritas acima.
9. Creative ID deve ser campo único textual, independente de UUID e UTM, gerado centralmente e imutável por padrão.
10. Taxonomia deve ficar em tabelas próprias, não em `select_options`.
11. Versionar taxonomia com entidade de versão e vínculo histórico na classificação.
12. Representar classificação com cabeçalho de classificação e valores por atributo, com status e revisão.
13. Auditoria deve combinar `audit_logs` para eventos macro e histórico específico para classificação.
14. Padrão de API atual: routers Express, JSON, `requireAuth`, `pool.query`, erros com `{ error }`, auditoria.
15. Custom GPT deve usar credenciais de integração com scopes, não sessão de usuário.
16. Preservar links existentes mantendo `utm_links` intacta e Creative opcional.
17. Mapear UTMs históricas com camada de mapping legado.
18. Melhor estratégia GA4: consulta sob demanda via GA4 Data API, idempotente, com snapshots diários agregados e leitura semanal/mensal.
19. CIB deve armazenar performance agregada suficiente para governança e integração, não depender só de consulta externa.
20. Report Hub deve consumir APIs read-only e produzir dashboards/análises sem editar taxonomia/classificação.
21. Riscos principais: specs defasadas, sem testes, sem migrations, modelagem de cliente, matching legado, auth externa.
22. Dependências externas: GA4, Google Cloud, Bitly, OpenAI, Custom GPT, possível Drive/storage, Report Hub.
23. Roadmap recomendado: Fases 0 a 11 acima.
24. MVP recomendado: Creative Core + Taxonomy v1 + Classification manual/revisada + API básica + auditoria + compatibilidade.
25. Decisões humanas pendentes estão listadas na seção anterior.

## Próximo passo recomendado

Revisar este documento e aprovar a decomposição geral. Depois disso, criar primeiro a spec `004-current-state-reconciliation` para alinhar governança, tasks, migrations e baseline de testes antes de qualquer mudança funcional.
