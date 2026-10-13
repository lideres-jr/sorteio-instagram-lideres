# Backend - Desenvolvedor A

API responsavel por importar comentarios, preservar entradas repetidas e sortear
usuarios sem repetir uma pessoa ja sorteada.

## Executar localmente

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
uvicorn main:app --reload
```

A documentacao interativa fica em `http://127.0.0.1:8000/docs`.

O modo padrao usa memoria e nao exige servicos externos. Para usar o Supabase,
execute `sql/schema.sql`, preencha as variaveis no `.env` e altere
`STORAGE_BACKEND` para `supabase`.

## Configurar a API do Instagram

Este app usa o fluxo **Instagram API with Facebook Login** no painel Meta for
Developers. A conta da Lideres deve ser profissional (Business ou Creator) e
estar vinculada a uma Pagina do Facebook.

1. Crie ou selecione o app da Lideres em
   `https://developers.facebook.com/apps/`.
2. Adicione o caso de uso **Gerenciar mensagens e conteudo no Instagram**.
3. Autorize a conta da Lideres com as permissoes `instagram_basic`,
   `pages_show_list`, `pages_read_engagement` e `instagram_manage_comments`.
4. Guarde o App ID e o App Secret em um gerenciador de senhas. O backend nao
   precisa deles enquanto o token for gerado manualmente.
5. Copie `.env.example` para `.env` e preencha somente no arquivo local:

```dotenv
INSTAGRAM_ACCESS_TOKEN=token_gerado_no_painel
INSTAGRAM_MEDIA_ID=id_numerico_da_publicacao_do_sorteio
INSTAGRAM_API_VERSION=v26.0
INSTAGRAM_GRAPH_BASE_URL=https://graph.facebook.com
```

Nunca envie o token ou o App Secret por chat e nunca os adicione ao Git. O
arquivo `.env` ja esta ignorado pelo repositorio.

Para localizar o ID numerico da publicacao, consulte os posts da propria conta
com o token e escolha a URL correta no campo `permalink`:

```http
GET https://graph.facebook.com/v26.0/ID_DA_CONTA_INSTAGRAM/media?fields=id,caption,permalink,timestamp&access_token=SEU_TOKEN
```

Depois, valide o acesso aos comentarios:

```http
GET https://graph.facebook.com/v26.0/ID_DA_PUBLICACAO/comments?fields=id,text,username,timestamp&access_token=SEU_TOKEN
```

Em desenvolvimento, o Standard Access atende contas que tenham papel no app.
Se outras contas precisarem autorizar o sistema, sera necessario solicitar
Advanced Access/App Review na Meta.

## Endpoints

- `GET /api/health`
- `POST /api/sorteio/buscar-comentarios`
- `POST /api/sorteio/sortear`
- `POST /api/sorteio/fallback-manual`
- `POST /api/sorteio/resetar`

Exemplo de fallback sem sortear imediatamente:

```json
{
  "comments": "@ana | primeiro comentario\n@ana | outro comentario\n@bruno",
  "draw_now": false
}
```

## Testes

```powershell
cd backend
python -m unittest discover -s tests -v
```

