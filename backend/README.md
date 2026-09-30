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

