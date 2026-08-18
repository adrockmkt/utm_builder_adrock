# Integracao Bitly

Esta feature permite que o usuario, depois de salvar um link com UTMs, tambem crie uma versao curta `bit.ly/nome-do-link` usando a conta Bitly do cliente.

## Objetivo

O caso principal e uso em materiais offline, eventos, QR codes, folders e pecas onde uma URL com UTMs fica longa demais.

Fluxo desejado:

1. Usuario gera o link parametrizado no UTM Builder.
2. Usuario confere o link gerado.
3. Usuario informa um nome curto desejado, por exemplo `curso-digital-porvir`.
4. Sistema chama a API do Bitly com o token da conta do cliente.
5. Bitly cria o link curto no formato `bit.ly/curso-digital-porvir`.
6. Sistema salva no banco o link com UTM original e o link Bitly.

Se o link salvo for editado depois, o sistema permite atualizar tambem o destino do Bitly para a nova URL parametrizada, mantendo o mesmo `bit.ly/nome-do-link`.

## Escopo escolhido

Para o Porvir, a decisao atual e usar apenas o dominio padrao do Bitly:

```text
bit.ly/nome-do-link
```

Nao usar dominio proprio por enquanto, como `porvir.link`, porque isso exigiria compra/configuracao de dominio, DNS e validacao no Bitly.

## Requisitos na conta Bitly do cliente

O cliente precisa fornecer uma conta Bitly com permissao para:

- criar links via API
- usar custom back-half, ou seja, escolher o final do link depois de `bit.ly/`
- consultar/criar links dentro do grupo/workspace correto

Dependendo do plano Bitly, custom back-half e limites de API podem exigir plano pago. Se a API retornar `402 UPGRADE_REQUIRED`, o plano atual nao permite a operacao solicitada.

## Dados necessarios para configurar

No backend, a integracao deve usar variaveis de ambiente:

```bash
BITLY_ENABLED=true
BITLY_ACCESS_TOKEN=token-gerado-na-conta-do-cliente
BITLY_GROUP_GUID=group-guid-da-conta
BITLY_DOMAIN=bit.ly
```

Observacoes:

- `BITLY_ACCESS_TOKEN` e segredo e nunca deve ir para o frontend.
- `BITLY_GROUP_GUID` identifica o grupo/workspace onde os links serao criados.
- `BITLY_DOMAIN` deve ficar como `bit.ly` nesta fase.

## Como gerar o token na conta Bitly

O cliente ou alguem com acesso admin deve entrar na conta Bitly e gerar um token de acesso para API.

Caminho esperado na interface Bitly:

```text
Settings > API > Generate token
```

O Bitly pode pedir a senha da conta para confirmar a geracao do token.

Depois de gerado:

1. copiar o token uma unica vez
2. enviar por canal seguro
3. salvar em `server/.env` no servidor
4. reiniciar o backend

## Como descobrir o Group GUID

Depois de ter o token, o backend ou um terminal seguro pode consultar os grupos da conta:

```bash
curl -H "Authorization: Bearer $BITLY_ACCESS_TOKEN" \
  https://api-ssl.bitly.com/v4/groups
```

A resposta contem um ou mais grupos. O valor `guid` do grupo correto deve ser usado em:

```bash
BITLY_GROUP_GUID=...
```

## Comportamento esperado no sistema

### Criar link curto

Endpoint no backend:

```http
POST /api/utm-links/:id/bitly
```

Payload esperado:

```json
{
  "customBackHalf": "curso-digital-porvir"
}
```

O backend deve:

- buscar o link salvo no banco
- enviar a URL final com UTMs para a API Bitly
- pedir o back-half desejado em `bit.ly`
- salvar o retorno do Bitly no registro do link

### Validar nome ja existente

Se o nome curto ja existir, o Bitly deve retornar conflito. Nesse caso, o sistema deve mostrar uma mensagem clara:

```text
Este nome curto ja esta em uso no Bitly. Tente outro.
```

O usuario entao pode tentar outro nome, por exemplo:

```text
curso-digital-porvir-2026
```

### Editar destino de um Bitly existente

Quando um link salvo no catalogo ja tem Bitly e o usuario edita a URL parametrizada, o sistema mostra uma opcao:

```text
Atualizar tambem o destino do Bitly para esta nova URL.
```

Com essa opcao marcada, o backend:

- salva os novos parametros UTM no registro do link
- chama a API do Bitly para atualizar o `long_url`
- mantem o mesmo back-half ja divulgado, por exemplo `bit.ly/curso-digital-porvir`
- registra falhas em `bitly_error` caso o Bitly recuse a atualizacao

O objetivo e corrigir destino/UTMs sem perder um link curto que ja pode ter sido enviado para material offline, QR code, evento ou folder.

Trocar o proprio back-half do Bitly nao faz parte do fluxo principal do sistema. Se isso for necessario, a recomendacao operacional e criar um novo Bitly ou ajustar manualmente na interface do Bitly, avaliando se o link antigo ja foi divulgado.

### Erros esperados

- `409 CONFLICT`: custom back-half ja esta em uso
- `402 UPGRADE_REQUIRED`: plano Bitly nao permite a operacao
- `403 FORBIDDEN`: token sem permissao
- `429 MONTHLY_LIMIT_EXCEEDED`: limite mensal atingido

## Banco de dados

A tabela `utm_links` guarda os campos:

```sql
bitly_url text,
bitly_id text,
bitly_custom_back_half text,
bitly_domain text,
bitly_created_at timestamptz,
bitly_error text
```

Tambem registrar evento em auditoria:

```text
bitly_link_created
bitly_link_failed
link_updated
bitly_destination_update_failed
```

## UX implementada

Depois que o usuario clicar em `Gerar URL`, mostrar:

```text
Confira o link parametrizado abaixo. Se estiver ok, salve o link ou gere um Bitly.
```

Depois que salvar o link, o catalogo mostra um bloco:

```text
Voce pode encurtar o link se precisar, ou parar por aqui.
Encurte apenas para acoes offline ou situacoes parecidas em que um link extenso com UTMs nao seja adequado, como QR code, folder, evento ou material impresso.
Nome sugerido: [campanha-2026]
[Gerar bit.ly]
```

O nome sugerido do back-half usa somente o `utm_campaign`:

```text
utm_campaign
```

O usuario pode editar esse nome antes de gerar o Bitly. Se o nome ja existir na conta Bitly, o sistema mostra uma mensagem para tentar outro.

Se der certo, exibir:

```text
bit.ly/curso-digital-porvir
```

## Ponto importante sobre GA4

O Bitly deve apontar para a URL completa com UTMs. Assim:

```text
bit.ly/curso-digital-porvir
```

redireciona para:

```text
https://cliente.com/pagina?utm_source=...&utm_medium=...&utm_campaign=...
```

O GA4 ve a URL final com UTMs depois do redirecionamento.

Para links que levam direto ao WhatsApp, a recomendacao continua sendo nao usar UTM para GA4, porque a navegacao sai do site e o WhatsApp nao envia esses parametros como pageview no GA4.
