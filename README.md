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