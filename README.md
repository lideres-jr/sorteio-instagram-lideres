<<<<<<< HEAD
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
=======
# Sistema de Sorteio via Instagram – Palestra Líderes Jr.

Este repositório contém o código-fonte do sistema de sorteios interativo desenvolvido para a Líderes Jr. O objetivo do sistema é aumentar o engajamento do perfil da empresa jr no Instagram durante a palestra, permitindo que o público comente numa postagem específica para concorrer a brindes.

O projeto está dividido em duas frentes: **Backend (Desenvolvedor A)** e **Frontend (Desenvolvedor B)**.

---

## 🚀 Visão Geral e Regras de Negócio

* **Dinâmica:** O público deve postar uma foto marcando a empresa jr num Story e comentar na postagem oficial.


* **Entradas Múltiplas:** Cada comentário conta como uma entrada separada para elevar o engajamento. Não há exigência de palavras-chave ou marcação de amigos.


* **Validação:** A confirmação do Story é feita de forma estritamente manual, conferindo a DM ou notificações do Instagram; se não for confirmado, a pessoa é desqualificada e o sistema realiza um novo sorteio imediatamente.


* **Privacidade:** O `@` da pessoa sorteada aparecerá publicamente no telão, o que deve ser avisado nas regras do sorteio.



---

## ⚙️ Escopo do Desenvolvedor A (Motor e Backend)

Responsável pela integração com a API do Instagram, gestão de tokens, banco de dados e lógica de sorteio.

**Tecnologias:** Python, FastAPI, Supabase, HTTPX.

### Responsabilidades

* **Integração API:** Configurar o app no *Meta for Developers* (Standard Access) para a conta Creator da Líderes e gerar o token de 60 dias.


* **Lógica de Contabilização:** Registrar todos os comentários (usuário e horário) permitindo múltiplas entradas da mesma conta.


* **Motor de Sorteio:** Selecionar aleatoriamente um vencedor entre todas as entradas e marcar os já sorteados para evitar repetições em caso de desqualificação.


* **Fallback Obrigatório:** Garantir que o sistema funcione com uma lista de comentários colada manualmente caso a API do Instagram sofra instabilidades.



### Endpoints Entregáveis

As seguintes rotas estão disponíveis para consumo do Frontend:

* `POST /api/sorteio/buscar-comentarios`: Consulta a API do Instagram e atualiza a base de dados.
* `POST /api/sorteio/sortear`: Aciona a lógica de sorteio aleatório e retorna o vencedor.
* `POST /api/sorteio/fallback-manual`: Recebe a lista manual e executa o sorteio sem deduplicação, em memória.

### Execução Local (Backend)

```bash
# Navegar para a pasta do backend
cd backend

# Criar e ativar ambiente virtual
python -m venv venv
source venv/bin/activate  # ou venv\Scripts\activate no Windows

# Instalar dependências
pip install -r requirements.txt

# Iniciar o servidor
uvicorn main:app --reload

```

---

## 🖥️ Escopo do Desenvolvedor B (Interface e Telas)

Responsável por todo o trabalho visual e interativo, consumindo as rotas disponibilizadas pelo Backend.

**Tecnologias:** [Preencher com a stack escolhida: ex. React, Vue, HTML/JS puro]

### Responsabilidades

* **Tela de Operação (Uso interno da equipe):**
* Botão **"Buscar comentários"** que exibe o número total de chances concorrendo.


* Botão **"Sortear"**.


* Botões de validação pós-sorteio: **"Confirmado"** (encerra a rodada) e **"Não postou, sortear de novo"** (chama a rota novamente).


* Campo de texto para colar a lista de comentários em caso de uso do fallback manual.




* **Tela de Projeção (Telão para o público):**
* Estado de espera encorajando o público a participar antes do sorteio.


* Animação de sorteio para criar expectativa.


* Exibição clara do `@` da pessoa sorteada com fonte grande o suficiente para leitura à distância.




* **Transversal:** Tratar adequadamente estados de carregamento e erros (direcionando para o fallback se necessário) com uma interface rápida.



### Execução Local (Frontend)

```bash
# Navegar para a pasta do frontend
cd frontend-app

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev

```

---

## 🧪 Testes e Validação Pré-Evento

Antes do dia oficial do evento, a equipe técnica deve:

1. Criar uma postagem de teste no Instagram da Líderes.


2. Validar todo o fluxo de buscar comentários, efetuar o sorteio e testar os botões de confirmação/desqualificação.


3. Simular uma falha de API para garantir o funcionamento correto da via de fallback manual.
>>>>>>> 78ee29344075e6d22cd0ce9010449c146d16d99c
