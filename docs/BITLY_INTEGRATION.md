# Integracao Bitly

Esta feature permite que o usuario, depois de salvar um link com UTMs, tambem crie uma versao curta `bit.ly/nome-do-link` usando a conta Bitly do cliente.

## Objetivo

O caso principal e uso em materiais offline, eventos, QR codes, folders e pecas onde uma URL com UTMs fica longa demais.

Fluxo desejado:

1. Usuario gera o link parametrizado no UTM Builder.
2. Usuario confere o link gerado.
3. Usuario informa um nome curto desejado, por exemplo `curso-digital-evento`.
4. Sistema chama a API do Bitly com o token da conta do cliente.
5. Bitly cria o link curto no formato `bit.ly/curso-digital-evento`.
6. Sistema salva no banco o link com UTM original e o link Bitly.

## Escopo escolhido

Por padrao, a decisao recomendada e usar o dominio padrao do Bitly:

```text
bit.ly/nome-do-link
```

Nao usar dominio proprio por enquanto, porque isso exigiria compra/configuracao de dominio, DNS e validacao no Bitly.

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
  "customBackHalf": "curso-digital-evento"
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
curso-digital-evento-2026
```

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
bit.ly/curso-digital-evento
```

## Ponto importante sobre GA4

O Bitly deve apontar para a URL completa com UTMs. Assim:

```text
bit.ly/curso-digital-evento
```

redireciona para:

```text
https://cliente.com/pagina?utm_source=...&utm_medium=...&utm_campaign=...
```

O GA4 ve a URL final com UTMs depois do redirecionamento.

Para links que levam direto ao WhatsApp, a recomendacao continua sendo nao usar UTM para GA4, porque a navegacao sai do site e o WhatsApp nao envia esses parametros como pageview no GA4.
