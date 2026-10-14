// Sorteio Líderes — servidor
// Busca comentários da publicação no Instagram, guarda as entradas,
// sorteia e mantém a tela de projeção sincronizada (Server-Sent Events).

const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

try { process.loadEnvFile(path.join(__dirname, '.env')); } catch { /* .env opcional */ }

const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '127.0.0.1',
  token: (process.env.IG_ACCESS_TOKEN || '').trim(),
  mediaId: (process.env.IG_MEDIA_ID || '').trim(),
  apiHost: (process.env.IG_API_HOST || 'graph.instagram.com').trim(),
  apiVersion: (process.env.IG_API_VERSION || 'v23.0').trim(),
  ownerUsername: normalizarUsuario(process.env.IG_OWNER_USERNAME || ''),
  incluirRespostas: (process.env.IG_INCLUIR_RESPOSTAS || 'true') === 'true',
  perfilMarcar: (process.env.PERFIL_MARCAR || '@lideres').trim(),
  demo: process.argv.includes('--demo') || (process.env.MODO_DEMO || 'false') === 'true',
  duracaoAnimacaoMs: Number(process.env.DURACAO_ANIMACAO_MS || 6000),
};

const ARQUIVO_ESTADO = path.join(__dirname, 'data', 'estado.json');

// ---------- Estado ----------

function estadoInicial() {
  return {
    fonte: null,            // 'api' | 'manual' | 'demo'
    ultimaBusca: null,      // ISO
    entradas: [],           // [{ id, username, timestamp }] — uma por comentário, sem deduplicar
    sorteios: [],           // [{ id, username, status: 'pendente'|'confirmado'|'desqualificado', em, chances }]
    tela: { fase: 'espera', sorteioId: null, revelarEm: null, rolo: [], novamente: false },
    instagram: { ok: null, erro: null, verificadoEm: null },
  };
}

let estado = carregarEstado();

function carregarEstado() {
  try {
    const salvo = JSON.parse(fs.readFileSync(ARQUIVO_ESTADO, 'utf8'));
    return { ...estadoInicial(), ...salvo, instagram: estadoInicial().instagram };
  } catch {
    return estadoInicial();
  }
}

function salvarEstado() {
  fs.mkdirSync(path.dirname(ARQUIVO_ESTADO), { recursive: true });
  const tmp = ARQUIVO_ESTADO + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(estado, null, 2));
  fs.renameSync(tmp, ARQUIVO_ESTADO);
}

function normalizarUsuario(u) {
  return String(u || '').trim().replace(/^@+/, '').toLowerCase();
}

function usuariosJaSorteados() {
  return new Set(estado.sorteios.map((s) => s.username));
}

function entradasElegiveis() {
  const fora = usuariosJaSorteados();
  return estado.entradas.filter((e) => !fora.has(e.username));
}

function resumo() {
  const elegiveis = entradasElegiveis();
  const sorteioAtual = estado.sorteios.find((s) => s.id === estado.tela.sorteioId) || null;
  return {
    agora: Date.now(),
    fonte: estado.fonte,
    ultimaBusca: estado.ultimaBusca,
    totalComentarios: estado.entradas.length,
    totalPerfis: new Set(estado.entradas.map((e) => e.username)).size,
    chancesElegiveis: elegiveis.length,
    perfisElegiveis: new Set(elegiveis.map((e) => e.username)).size,
    sorteios: [...estado.sorteios].reverse(),
    sorteioAtual,
    tela: estado.tela,
    perfilMarcar: config.perfilMarcar,
    instagram: {
      configurado: Boolean(config.token && config.mediaId),
      demo: config.demo,
      ...estado.instagram,
    },
  };
}

// ---------- Tempo real (SSE) ----------

const clientes = new Set();

function transmitir() {
  const dados = `data: ${JSON.stringify(resumo())}\n\n`;
  for (const res of clientes) res.write(dados);
}

function atualizar() {
  salvarEstado();
  transmitir();
}

// ---------- Instagram ----------

class ErroInstagram extends Error {}

async function chamarGraph(url) {
  let resp;
  try {
    resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (e) {
    throw new ErroInstagram(`Sem conexão com o Instagram (${e.name === 'TimeoutError' ? 'tempo esgotado' : e.message}).`);
  }
  const corpo = await resp.json().catch(() => ({}));
  if (!resp.ok || corpo.error) {
    const msg = corpo.error?.message || `HTTP ${resp.status}`;
    throw new ErroInstagram(`Instagram respondeu com erro: ${msg}`);
  }
  return corpo;
}

function urlGraph(caminho, params) {
  const u = new URL(`https://${config.apiHost}/${config.apiVersion}/${caminho}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', config.token);
  return u.toString();
}

// Sem acesso avançado, a API só preenche "username" para a própria conta;
// o @ dos demais participantes vem em "from".
function autorDoComentario(c) {
  return normalizarUsuario(c.username || c.from?.username);
}

async function buscarComentariosInstagram() {
  if (!config.token || !config.mediaId) {
    throw new ErroInstagram('Instagram não configurado: preencha IG_ACCESS_TOKEN e IG_MEDIA_ID no arquivo .env.');
  }
  const campos = config.incluirRespostas
    ? 'id,username,from{id,username},timestamp,replies{id,username,from{id,username},timestamp}'
    : 'id,username,from{id,username},timestamp';

  const entradas = [];
  let url = urlGraph(`${config.mediaId}/comments`, { fields: campos, limit: '50' });
  let paginas = 0;

  while (url && paginas < 200) {
    const corpo = await chamarGraph(url);
    for (const c of corpo.data || []) {
      entradas.push({ id: c.id, username: autorDoComentario(c), timestamp: c.timestamp });
      for (const r of c.replies?.data || []) {
        entradas.push({ id: r.id, username: autorDoComentario(r), timestamp: r.timestamp });
      }
    }
    url = corpo.paging?.next || null;
    paginas++;
  }

  // Comentários do próprio perfil (respostas da Líderes) não concorrem.
  return entradas.filter((e) => e.username && e.username !== config.ownerUsername);
}

// Modo demonstração: simula comentários chegando a cada busca.
const nomesDemo = ['ana.lima', 'brunocosta', 'carol_mendes', 'diego.rf', 'eduarda.s', 'felipe_ok', 'gabi.martins',
  'henrique.dev', 'isa.prado', 'joao_pedro', 'karina.alves', 'lucas.mz', 'mari.souza', 'nicolas_t', 'olivia.r',
  'paulo.henrique', 'rafa.oliveira', 'sofia_ln', 'thiago.b', 'vitoria.campos', 'well.santos', 'yasmin.f'];
function comentariosDemo() {
  const base = estado.fonte === 'demo' ? estado.entradas : [];
  const novos = 3 + crypto.randomInt(8);
  const lista = [...base];
  for (let i = 0; i < novos; i++) {
    lista.push({
      id: `demo-${Date.now()}-${i}`,
      username: nomesDemo[crypto.randomInt(nomesDemo.length)],
      timestamp: new Date(Date.now() - crypto.randomInt(60000)).toISOString(),
    });
  }
  return lista;
}

// ---------- Sorteio ----------

function sortear({ novamente = false } = {}) {
  const elegiveis = entradasElegiveis();
  if (elegiveis.length === 0) {
    const err = new Error(estado.entradas.length === 0
      ? 'Ainda não há comentários. Busque os comentários ou cole a lista manual.'
      : 'Todos os perfis da lista já foram sorteados. Busque os comentários de novo para atualizar.');
    err.status = 409;
    throw err;
  }
  const escolhida = elegiveis[crypto.randomInt(elegiveis.length)];
  const sorteio = {
    id: crypto.randomUUID(),
    username: escolhida.username,
    status: 'pendente',
    em: new Date().toISOString(),
    chances: elegiveis.filter((e) => e.username === escolhida.username).length,
    entre: elegiveis.length,
  };
  estado.sorteios.push(sorteio);

  // Nomes que passam no "rolo" da animação do telão.
  const perfis = [...new Set(elegiveis.map((e) => e.username))];
  const rolo = [];
  for (let i = 0; i < 40 && perfis.length > 0; i++) rolo.push(perfis[crypto.randomInt(perfis.length)]);

  estado.tela = {
    fase: 'resultado',
    sorteioId: sorteio.id,
    revelarEm: Date.now() + config.duracaoAnimacaoMs,
    rolo,
    novamente,
  };
  atualizar();
  return sorteio;
}

function sorteioPendente() {
  const atual = estado.sorteios.find((s) => s.id === estado.tela.sorteioId);
  if (!atual || atual.status !== 'pendente') {
    const err = new Error('Não há sorteado aguardando confirmação.');
    err.status = 409;
    throw err;
  }
  return atual;
}

// ---------- Rotas ----------

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/fonts', express.static(path.join(__dirname, 'node_modules', '@fontsource')));

app.get('/', (req, res) => res.redirect('/operacao.html'));

app.get('/api/eventos', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify(resumo())}\n\n`);
  clientes.add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  req.on('close', () => { clearInterval(ping); clientes.delete(res); });
});

app.get('/api/sorteio/estado', (req, res) => res.json(resumo()));

app.get('/api/sorteio/estado-entradas', (req, res) => {
  res.json({ entradas: estado.entradas, sorteados: [...usuariosJaSorteados()] });
});

app.post('/api/sorteio/buscar-comentarios', async (req, res) => {
  try {
    const entradas = config.demo ? comentariosDemo() : await buscarComentariosInstagram();
    estado.entradas = entradas;
    estado.fonte = config.demo ? 'demo' : 'api';
    estado.ultimaBusca = new Date().toISOString();
    estado.instagram = { ok: true, erro: null, verificadoEm: estado.ultimaBusca };
    atualizar();
    res.json(resumo());
  } catch (e) {
    estado.instagram = { ok: false, erro: e.message, verificadoEm: new Date().toISOString() };
    transmitir();
    res.status(502).json({ erro: e.message, sugerirManual: true });
  }
});

app.post('/api/sorteio/fallback-manual', (req, res) => {
  const texto = String(req.body?.texto || '');
  const entradas = [];
  let ignoradas = 0;
  const agora = new Date().toISOString();
  texto.split(/\r?\n/).forEach((linha, i) => {
    const l = linha.trim();
    if (!l) return;
    const m = l.match(/@([A-Za-z0-9._]{1,30})/) || l.match(/^([A-Za-z0-9._]{1,30})$/);
    if (!m) { ignoradas++; return; }
    entradas.push({ id: `manual-${i}`, username: normalizarUsuario(m[1]), timestamp: null });
  });
  if (entradas.length === 0) {
    return res.status(400).json({ erro: 'Nenhum perfil reconhecido. Cole um @perfil por linha (um por comentário).' });
  }
  estado.entradas = entradas;
  estado.fonte = 'manual';
  estado.ultimaBusca = agora;
  atualizar();
  res.json({ ...resumo(), ignoradas });
});

app.post('/api/sorteio/sortear', (req, res) => {
  const atual = estado.sorteios.find((s) => s.id === estado.tela.sorteioId);
  if (atual && atual.status === 'pendente') {
    return res.status(409).json({ erro: `@${atual.username} ainda está aguardando confirmação. Confirme ou sorteie de novo.` });
  }
  try { res.json({ sorteio: sortear(), ...resumo() }); }
  catch (e) { res.status(e.status || 500).json({ erro: e.message }); }
});

app.post('/api/sorteio/confirmar', (req, res) => {
  try {
    const atual = sorteioPendente();
    atual.status = 'confirmado';
    atual.decididoEm = new Date().toISOString();
    atualizar();
    res.json(resumo());
  } catch (e) { res.status(e.status || 500).json({ erro: e.message }); }
});

app.post('/api/sorteio/sortear-novamente', (req, res) => {
  try {
    const atual = sorteioPendente();
    atual.status = 'desqualificado';
    atual.decididoEm = new Date().toISOString();
    res.json({ sorteio: sortear({ novamente: true }), ...resumo() });
  } catch (e) {
    atualizar();
    res.status(e.status || 500).json({ erro: e.message });
  }
});

app.post('/api/sorteio/tela-espera', (req, res) => {
  const atual = estado.sorteios.find((s) => s.id === estado.tela.sorteioId);
  if (atual && atual.status === 'pendente') {
    return res.status(409).json({ erro: 'Confirme ou desqualifique o sorteado antes de voltar à tela de espera.' });
  }
  estado.tela = { fase: 'espera', sorteioId: null, revelarEm: null, rolo: [], novamente: false };
  atualizar();
  res.json(resumo());
});

app.post('/api/sorteio/zerar', (req, res) => {
  estado = { ...estadoInicial(), instagram: estado.instagram };
  atualizar();
  res.json(resumo());
});

// Ajuda na configuração: lista as publicações recentes da conta para achar o IG_MEDIA_ID.
app.get('/api/instagram/publicacoes', async (req, res) => {
  if (!config.token) return res.status(400).json({ erro: 'Preencha IG_ACCESS_TOKEN no .env.' });
  try {
    const corpo = await chamarGraph(urlGraph('me/media', {
      fields: 'id,caption,timestamp,permalink,comments_count', limit: '15',
    }));
    res.json(corpo.data || []);
  } catch (e) { res.status(502).json({ erro: e.message }); }
});

async function verificarInstagram() {
  if (config.demo || !config.token) return;
  try {
    await chamarGraph(urlGraph('me', { fields: 'username' }));
    estado.instagram = { ok: true, erro: null, verificadoEm: new Date().toISOString() };
  } catch (e) {
    estado.instagram = { ok: false, erro: e.message, verificadoEm: new Date().toISOString() };
  }
  transmitir();
}

app.listen(config.port, config.host, () => {
  const base = `http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`;
  console.log(`\nSorteio Líderes rodando${config.demo ? ' (MODO DEMONSTRAÇÃO)' : ''}`);
  console.log(`  Tela de operação: ${base}/operacao.html`);
  console.log(`  Tela de projeção: ${base}/projecao.html\n`);
  verificarInstagram();
});
