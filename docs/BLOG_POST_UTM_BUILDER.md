---
slug: ideia-simples-utm-builder-produto-real-ga4
meta_description: Como uma ideia simples de UTM Builder evoluiu para um produto real de governança de campanhas, organização de UTMs, GA4, Looker Studio, Bitly, auditoria e backup.
---

# Como uma ideia simples de UTM Builder virou um produto real de governança para GA4

Toda ferramenta boa nasce de um incômodo recorrente.

No meu caso, o problema parecia pequeno: criar URLs parametrizadas com UTMs de forma mais organizada. Mas, na prática, esse “problema pequeno” aparece em quase todo projeto de marketing digital, especialmente quando várias pessoas participam da operação.

Um escreve `instagram`, outro escreve `ig`.

Um usa `paid-social`, outro usa `social_paid`.

Um muda o nome da campanha no meio do caminho.

Outro cria o link direto na planilha, copia errado, esquece um parâmetro, mistura source com medium, ou usa uma nomenclatura que depois ninguém consegue ler direito no GA4.

No fim, o relatório no Looker Studio, antigo Data Studio, fica mais difícil do que deveria. A coleta até acontece, mas a leitura vira uma bagunça.

Foi assim que uma ideia simples virou um produto real.

## A ideia inicial

A primeira versão era apenas um gerador de links com UTMs.

O objetivo era simples:

- preencher uma URL base
- escolher canal, source e medium
- informar campanha, content e id
- gerar uma URL final já parametrizada

Só que, quando comecei a testar com uso real, ficou claro que gerar URL era apenas uma parte do problema.

O ponto central não era “montar uma URL”.

O ponto central era criar governança.

## O problema real: padronizar antes de medir

GA4 e Looker Studio dependem de dados consistentes.

Se cada pessoa cria UTM do seu jeito, você até coleta dados, mas perde comparabilidade. O mesmo canal pode aparecer quebrado em várias linhas. Campanhas semelhantes podem ficar espalhadas. Relatórios podem exigir tratamentos manuais demais.

Na prática, o sistema precisava responder perguntas como:

- qual campanha originou este link?
- qual foi o canal GA4 estimado?
- qual `utm_source` e `utm_medium` foram usados?
- esse link foi criado de forma pontual ou ligado a uma campanha maior?
- quem criou ou alterou informações importantes?
- quais links já existem?
- quais parâmetros foram usados em cada um?
- e se alguém precisar corrigir um link depois?

Foi nesse ponto que o projeto deixou de ser apenas um builder e virou um produto.

## O produto que nasceu

O sistema evoluiu para um UTM Builder standalone, single-tenant, instalado para um cliente específico.

Ele passou a ter:

- login próprio
- gestão de usuários
- perfis de acesso
- criação de campanhas
- criação de links pontuais
- criação de links vinculados a campanhas
- catálogo histórico de links
- filtros por campanha, canal, content, id, período e Bitly
- exportação CSV
- auditoria
- área de documentos
- configurações administrativas
- customização de logo, nome do sistema e elementos visuais
- integração opcional com Bitly
- backup local diário
- health check de banco e último backup

O que nasceu como uma tela para montar UTM virou uma camada operacional para organizar a criação de campanhas e melhorar a leitura posterior no GA4.

## A lógica de campanhas e links

Uma decisão importante foi separar dois fluxos:

1. Link pontual
2. Link vinculado a campanha

Nem todo link precisa nascer dentro de uma campanha formal. Existem casos rápidos: um link para WhatsApp, um post isolado, uma ação específica, um disparo pequeno.

Mas quando existe uma campanha maior, o link precisa carregar contexto.

Na vida real, campanhas de mídia seguem estruturas como:

```text
Google Ads
Campanha -> grupo de anúncio -> anúncio

Meta Ads
Campanha -> conjunto/grupo de anúncio -> anúncio

LinkedIn, TikTok, X e outros canais
Campanha -> agrupamento -> formato/peça/anúncio
```

Por isso, o sistema passou a tratar campos como:

- `utm_campaign`
- `utm_term`
- `utm_content`
- `utm_id`
- nome interno do link
- tipo de ação
- destino
- canal GA4 guiado

Isso ajuda o time a criar links com mais consistência e, ao mesmo tempo, manter flexibilidade para a realidade de cada canal.

## Taxonomia guiada para GA4

Um dos pontos mais importantes foi transformar parte da nomenclatura em escolhas guiadas.

O usuário não precisa lembrar, do zero, qual source ou medium usar. O sistema sugere padrões por canal GA4.

Exemplo:

```text
Canal GA4: Organic Social
Sources comuns: instagram, facebook, linkedin, whatsapp
Medium: social_media
```

O objetivo não é engessar completamente o time. O objetivo é evitar que cada pessoa invente uma taxonomia diferente.

Também foi criada uma camada administrativa para gerenciar itens usados em seleções, como tipos de ação, destinos, tipos de anúncio/formato, sugestões de `utm_content` e `utm_id`.

Isso permite adaptar a ferramenta ao cliente sem mexer no código a cada mudança operacional.

## Catálogo de links

Depois que o time começou a usar o sistema de verdade, o catálogo de links virou uma parte essencial.

Não bastava salvar. Era preciso encontrar.

O catálogo ganhou:

- filtros
- rolagem própria
- exibição dos parâmetros principais
- observações
- link completo
- opção de editar
- opção de excluir
- opção de exportar CSV
- opção de gerar Bitly depois

Isso muda a relação do time com UTMs.

Em vez de links espalhados em planilhas, conversas e históricos de navegador, o cliente passa a ter uma base organizada.

## Bitly para links offline

Outro ponto que apareceu no uso real foi o tamanho das URLs.

Uma URL com UTMs pode ficar longa. Em mídia digital isso geralmente não é problema. Mas em material offline, evento, QR code, folder ou apresentação, pode ser ruim.

Por isso entrou uma integração com Bitly.

O sistema permite:

- gerar o link parametrizado completo
- salvar esse link no catálogo
- opcionalmente encurtar com Bitly
- definir um back-half amigável
- armazenar o Bitly junto ao link original

A regra operacional ficou clara: encurtar apenas quando fizer sentido, especialmente para ações offline ou contextos em que uma URL longa atrapalha.

## Arquitetura técnica

O projeto foi separado como uma aplicação standalone.

No frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- componentes próprios

No backend:

- Node.js
- Express
- PostgreSQL
- autenticação por token de sessão
- Helmet para headers de segurança
- rate limit
- Morgan para logs HTTP

Na infraestrutura:

- AWS Lightsail
- Ubuntu
- Nginx como reverse proxy
- systemd para manter a API rodando
- PostgreSQL local
- Certbot/Let's Encrypt para HTTPS

O deploy ficou simples:

```bash
git pull
npm ci
VITE_APP_BASE_PATH=/ VITE_API_BASE_PATH=/api npm run build
cd server
npm ci --omit=dev
sudo systemctl restart utm-builder-api
sudo nginx -t
sudo systemctl reload nginx
```

## Backup e segurança

Quando o sistema virou produção real, backup deixou de ser opcional.

Foi configurado:

- backup local diário com `pg_dump`
- retenção de 30 dias
- pasta protegida em `/var/backups/utm_builder`
- teste real de restauração em banco temporário
- health check exibindo data/hora do último backup

O teste de restore foi feito sem tocar no banco ativo:

```text
Banco ativo: adrock_utm_builder
Banco temporário: utm_builder_restore_test
```

O backup foi restaurado, as tabelas principais foram validadas e o banco temporário foi removido.

Também foi feita uma primeira rodada de segurança:

- rotas protegidas sem token
- login inválido
- headers
- PostgreSQL escutando somente em localhost
- permissões de `.env`
- permissões dos dumps
- `npm audit`
- hardening de Nginx

Foram adicionados headers como:

- Content-Security-Policy
- Permissions-Policy
- Referrer-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options

## O impacto no cliente

O ganho não está apenas em gerar links mais rápido.

O ganho está em criar uma rotina mais confiável.

Antes, cada link podia nascer de um jeito.

Agora, o time tem:

- um lugar único para criar links
- histórico do que já foi feito
- padrões de nomenclatura
- menos erro manual
- melhor leitura no GA4
- melhor organização para relatórios no Looker Studio
- exportação dos dados
- governança de campanha

Isso facilita a vida de quem cria campanhas e também de quem analisa os resultados depois.

## O aprendizado

Esse projeto reforçou uma coisa que eu acredito muito: produto bom nasce quando uma dor operacional pequena é observada com profundidade.

No começo era:

> Preciso montar uma URL com UTM.

Depois virou:

> Preciso garantir que uma empresa inteira consiga criar UTMs de forma consistente, segura e reutilizável.

Essa mudança de perspectiva transforma uma ferramenta simples em produto.

## Conclusão

Hoje o UTM Builder não é apenas um gerador de links.

Ele é uma camada de governança para campanhas digitais.

Ele ajuda uma empresa a organizar como cria, registra, edita, exporta e analisa links parametrizados. E isso tem impacto direto na qualidade da leitura dentro do GA4 e dos relatórios no Looker Studio.

Foi uma ideia simples que cresceu porque encontrou um problema real.

E, quando um problema real aparece muitas vezes, talvez ele não seja apenas uma tarefa.

Talvez ele seja um produto esperando para existir.
