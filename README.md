# Sorteio Líderes

Sorteio entre os comentários de uma publicação do Instagram, com tela de operação para a equipe e tela de projeção para o telão.

## Rodar

Precisa de Node.js 20.12 ou superior.

```bash
npm install
cp .env.example .env    # depois preencha o .env
npm start
```

- Tela de operação: http://localhost:3000/operacao.html
- Telão: http://localhost:3000/projecao.html (duplo clique para tela cheia)

Para ensaiar sem Instagram: `npm run demo` (cada "Buscar comentários" simula novos comentários).

## Configurar o Instagram (fazer antes do dia)

1. No Meta for Developers, crie um app com o produto **Instagram API with Instagram Login** e adicione a conta da Líderes como tester (Standard Access, sem App Review). Permissões: `instagram_business_basic` e `instagram_business_manage_comments`.
2. Gere o token e troque o de curta duração (1h) pelo de longa duração (60 dias):
   `GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=SEGREDO_DO_APP&access_token=TOKEN_CURTO`
3. Coloque o token em `IG_ACCESS_TOKEN` no `.env`, rode `npm start` e abra http://localhost:3000/api/instagram/publicacoes para achar o `id` da publicação. Coloque-o em `IG_MEDIA_ID`.
4. Preencha `IG_OWNER_USERNAME` (respostas da própria Líderes não concorrem) e `PERFIL_MARCAR` (o @ que aparece no telão).

Se o app usar login via Facebook/Página, troque `IG_API_HOST` para `graph.facebook.com`.

## Regras implementadas

- Cada comentário é uma entrada; quem comenta mais vezes tem mais chances. Respostas a comentários também contam (`IG_INCLUIR_RESPOSTAS`).
- Quem já foi sorteado (confirmado ou desqualificado) sai dos próximos sorteios, com todas as suas entradas.
- "Não postou, sortear de novo" desqualifica a pessoa e já sorteia outra no telão.
- O estado fica salvo em `data/estado.json`, então reiniciar o servidor não perde a lista nem o histórico. Depois do ensaio, use "Zerar sorteios e lista".

## Se a API cair

Na tela de operação, cole os perfis em "API fora do ar?" — um @perfil por linha, uma linha por comentário — e clique em "Usar esta lista". O sorteio segue igual.

## Rotas

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/sorteio/buscar-comentarios` | Busca todos os comentários da publicação |
| POST | `/api/sorteio/fallback-manual` | `{ texto }` com um @ por linha |
| POST | `/api/sorteio/sortear` | Sorteia entre as entradas elegíveis |
| POST | `/api/sorteio/confirmar` | Confirma o sorteado atual |
| POST | `/api/sorteio/sortear-novamente` | Desqualifica o atual e sorteia outro |
| POST | `/api/sorteio/tela-espera` | Volta o telão para "Como participar" |
| POST | `/api/sorteio/zerar` | Apaga lista e histórico |
| GET | `/api/sorteio/estado` | Estado atual |
| GET | `/api/eventos` | Atualizações em tempo real (SSE) |
| GET | `/api/instagram/publicacoes` | Publicações recentes, para achar o `IG_MEDIA_ID` |

## Telão em outro computador

Por padrão o servidor só aceita conexões do próprio computador. Para abrir o telão em outra máquina da mesma rede, use `HOST=0.0.0.0` no `.env` e acesse `http://IP-DO-COMPUTADOR:3000/projecao.html`. Nesse modo, qualquer pessoa na rede consegue chamar as rotas, então use uma rede da equipe.
