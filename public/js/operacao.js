const $ = (id) => document.getElementById(id);
let estado = null;
let ultimoTotal = null;
let timerAuto = null;

// ---------- Ações ----------

async function acao(botao, fn) {
  if (botao.getAttribute('aria-busy') === 'true') return;
  botao.setAttribute('aria-busy', 'true');
  botao.disabled = true;
  try { await fn(); }
  finally {
    botao.removeAttribute('aria-busy');
    if (estado) render(estado); else botao.disabled = false;
  }
}

function aviso(id, tipo, html) {
  const el = $(id);
  if (!tipo) { el.hidden = true; el.innerHTML = ''; return; }
  el.dataset.tipo = tipo;
  el.innerHTML = html;
  el.hidden = false;
}

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function buscar({ silencioso = false } = {}) {
  const botao = $('btnBuscar');
  if (!silencioso) $('btnBuscar').textContent = 'Buscando…';
  await acao(botao, async () => {
    try {
      await chamarApi('/api/sorteio/buscar-comentarios');
      aviso('avisoParticipantes', null);
    } catch (e) {
      aviso('avisoParticipantes', 'erro',
        `<strong>Não deu para buscar os comentários.</strong> ${escapar(e.message)}<br>
         Copie os perfis dos comentários e cole na <a href="#listaManual">lista manual</a> abaixo para seguir o sorteio.`);
      if (!silencioso) $('listaManual').focus({ preventScroll: true });
    }
  });
  botao.textContent = 'Buscar comentários';
}

$('btnBuscar').addEventListener('click', () => buscar());

$('autoBusca').addEventListener('change', (e) => {
  clearInterval(timerAuto);
  if (e.target.checked) {
    buscar({ silencioso: true });
    timerAuto = setInterval(() => buscar({ silencioso: true }), 60000);
  }
});

$('btnManual').addEventListener('click', () => acao($('btnManual'), async () => {
  const texto = $('listaManual').value;
  try {
    const r = await chamarApi('/api/sorteio/fallback-manual', { texto });
    $('retornoManual').textContent = `${r.totalComentarios} entradas carregadas` +
      (r.ignoradas ? ` · ${r.ignoradas} linha(s) ignorada(s)` : '');
    aviso('avisoParticipantes', null);
    // Com lista manual, a busca automática sobrescreveria a lista colada.
    if ($('autoBusca').checked) { $('autoBusca').checked = false; clearInterval(timerAuto); }
  } catch (e) {
    $('retornoManual').textContent = '';
    aviso('avisoParticipantes', 'erro', escapar(e.message));
  }
}));

$('btnSortear').addEventListener('click', () => acao($('btnSortear'), async () => {
  try { await chamarApi('/api/sorteio/sortear'); aviso('avisoSorteio', null); }
  catch (e) { aviso('avisoSorteio', 'erro', escapar(e.message)); }
}));

$('btnConfirmar').addEventListener('click', () => acao($('btnConfirmar'), async () => {
  try { await chamarApi('/api/sorteio/confirmar'); aviso('avisoSorteio', null); }
  catch (e) { aviso('avisoSorteio', 'erro', escapar(e.message)); }
}));

$('btnNovamente').addEventListener('click', () => acao($('btnNovamente'), async () => {
  try { await chamarApi('/api/sorteio/sortear-novamente'); aviso('avisoSorteio', null); }
  catch (e) { aviso('avisoSorteio', 'erro', escapar(e.message)); }
}));

$('btnEspera').addEventListener('click', () => acao($('btnEspera'), async () => {
  try { await chamarApi('/api/sorteio/tela-espera'); aviso('avisoSorteio', null); }
  catch (e) { aviso('avisoSorteio', 'erro', escapar(e.message)); }
}));

$('btnZerar').addEventListener('click', async () => {
  if (!confirm('Apagar a lista de comentários e o histórico de sorteados? Use isso só depois do teste.')) return;
  try { await chamarApi('/api/sorteio/zerar'); $('retornoManual').textContent = ''; aviso('avisoSorteio', null); }
  catch (e) { aviso('avisoSorteio', 'erro', escapar(e.message)); }
});

// ---------- Renderização ----------

function renderStatusInstagram(s, conectado = true) {
  const pil = $('statusIg');
  let txt, est;
  if (!conectado) { txt = 'Servidor desconectado'; est = 'erro'; }
  else if (s.instagram.demo) { txt = 'Modo demonstração'; est = 'neutro'; }
  else if (s.fonte === 'manual') { txt = 'Usando lista manual'; est = 'neutro'; }
  else if (!s.instagram.configurado) { txt = 'Instagram não configurado'; est = 'erro'; }
  else if (s.instagram.ok === false) { txt = 'Instagram com erro'; est = 'erro'; }
  else if (s.instagram.ok) { txt = 'Instagram conectado'; est = 'ok'; }
  else { txt = 'Verificando Instagram…'; est = 'neutro'; }
  pil.dataset.estado = est;
  pil.title = s.instagram.erro || '';
  $('statusIgTexto').textContent = txt;
}

function render(s) {
  estado = s;
  renderStatusInstagram(s);

  // Busca
  const origem = { api: '', demo: ' (demonstração)', manual: ' (lista manual)' }[s.fonte] || '';
  $('ultimaBusca').textContent = s.ultimaBusca ? `Última atualização: ${horaCurta(s.ultimaBusca)}${origem}` : 'Nenhuma busca ainda';

  // Contagem
  const num = $('numChances');
  num.textContent = formatarNumero(s.chancesElegiveis);
  if (ultimoTotal !== null && s.chancesElegiveis !== ultimoTotal) {
    num.classList.remove('pulsa'); void num.offsetWidth; num.classList.add('pulsa');
  }
  ultimoTotal = s.chancesElegiveis;
  $('legendaChances').textContent = s.chancesElegiveis === 1 ? 'chance no sorteio' : 'chances no sorteio';
  const jaSorteados = s.sorteios.length;
  $('detalheChances').textContent = s.totalComentarios === 0
    ? 'Nenhum comentário carregado'
    : `${s.totalComentarios} comentário(s) de ${s.totalPerfis} perfil(is)` +
      (jaSorteados ? ` · ${s.totalComentarios - s.chancesElegiveis} fora por já terem sido sorteados` : '');

  renderLista(s);

  // Sorteio atual
  const atual = s.sorteioAtual;
  const pendente = atual && atual.status === 'pendente';
  const ocupado = (id) => $(id).getAttribute('aria-busy') === 'true';
  $('btnSortear').disabled = pendente || s.chancesElegiveis === 0 || ocupado('btnSortear');
  $('btnSortear').textContent = atual && atual.status === 'confirmado' ? 'Sortear o próximo' : 'Sortear';
  $('btnBuscar').disabled = ocupado('btnBuscar');
  $('btnManual').disabled = ocupado('btnManual');

  const painel = $('painelAtual');
  if (!atual) { painel.hidden = true; }
  else {
    painel.hidden = false;
    painel.dataset.status = atual.status;
    $('atualNome').textContent = '@' + atual.username;
    $('atualChances').textContent = `${atual.chances} de ${atual.entre} chance(s) · sorteado às ${horaCurta(atual.em)}`;
    const rotulos = { pendente: 'Sorteado(a) agora', confirmado: 'Vencedor(a) confirmado(a)', desqualificado: 'Desqualificado(a)' };
    $('atualRotulo').textContent = rotulos[atual.status];
    $('atualInstrucao').textContent = {
      pendente: 'Confira o Story na DM do Instagram da Líderes antes de confirmar.',
      confirmado: 'Pode entregar o brinde. Quando quiser, volte o telão para a tela de espera ou sorteie o próximo.',
      desqualificado: 'Não sobrou ninguém elegível para sortear de novo. Atualize os comentários ou volte o telão para a espera.',
    }[atual.status];
    $('acoesPendente').hidden = !pendente;
    $('acoesFinal').hidden = pendente;
    $('btnConfirmar').disabled = ocupado('btnConfirmar') || ocupado('btnNovamente');
    $('btnNovamente').disabled = ocupado('btnConfirmar') || ocupado('btnNovamente');
    $('btnEspera').disabled = ocupado('btnEspera') || s.tela.fase === 'espera';
  }

  // Histórico
  const lista = $('listaSorteados');
  const anteriores = s.sorteios.filter((x) => !atual || x.id !== atual.id);
  lista.innerHTML = anteriores.length === 0
    ? '<li class="lista-vazia">Ninguém ainda.</li>'
    : anteriores.map((x) => `<li><span class="usuario">@${escapar(x.username)}</span>
        <span class="tag" data-status="${x.status}">${{ pendente: 'aguardando', confirmado: 'confirmado', desqualificado: 'não postou' }[x.status]}</span></li>`).join('');
}

function renderLista(s) {
  const ul = $('listaEntradas');
  // Recarrega a lista só quando muda, para não perder a rolagem.
  const chave = `${s.ultimaBusca}|${s.totalComentarios}|${s.sorteios.length}`;
  if (ul.dataset.chave === chave) return;
  ul.dataset.chave = chave;

  if (s.totalComentarios === 0) {
    ul.innerHTML = '<li class="lista-vazia">Clique em <strong>Buscar comentários</strong> para trazer quem já comentou.</li>';
    return;
  }
  fetch('/api/sorteio/estado-entradas').then((r) => r.json()).then(({ entradas, sorteados }) => {
    const fora = new Set(sorteados);
    const ordenadas = [...entradas].sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    ul.innerHTML = ordenadas.slice(0, 1000).map((e) => `
      <li class="${fora.has(e.username) ? 'fora' : ''}">
        <span class="usuario">@${escapar(e.username)}</span>
        <span class="quando">${fora.has(e.username) ? 'já sorteado' : e.timestamp ? `comentou às ${horaCurta(e.timestamp)}` : 'lista manual'}</span>
      </li>`).join('') + (ordenadas.length > 1000 ? `<li class="lista-vazia">+ ${ordenadas.length - 1000} comentários</li>` : '');
  }).catch(() => {});
}

conectarEventos(render, (ok) => { if (!ok && estado) renderStatusInstagram(estado, false); });
