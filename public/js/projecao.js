const $ = (id) => document.getElementById(id);
const palco = $('palco');
const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

let ultimo = null;          // último estado recebido
let animandoId = null;      // sorteio cuja animação está rodando
let reveladoId = null;      // sorteio já revelado na tela
let confeteId = null;       // sorteio que já ganhou confete
let ultimoContador = null;
let defasagem = 0;          // relógio do servidor − relógio local

function unidade() {
  return Math.min(innerWidth / 1920, innerHeight / 1080);
}

// Ajusta o @ para caber em uma linha, até o tamanho máximo do layout.
function ajustarNome(el, maxDesign = 180) {
  const max = maxDesign * unidade();
  el.style.fontSize = max + 'px';
  const largura = el.parentElement.clientWidth;
  const conteudo = el.scrollWidth;
  if (conteudo > largura) el.style.fontSize = Math.floor(max * largura / conteudo) + 'px';
}

function mostrarCena(fase) {
  palco.dataset.fase = fase;
  const espera = fase === 'espera';
  if ($('cenaEspera').hidden !== !espera) {
    $('cenaEspera').hidden = !espera;
    $('cenaResultado').hidden = espera;
  }
  $('pilulaTexto').textContent = { espera: 'Sorteio ao vivo', sorteando: 'Sorteando', resultado: 'Resultado' }[fase];
  $('rodapeEsq').textContent = espera ? 'O resultado sai ao vivo, nesta palestra.' : 'Sorteio Líderes';
  $('rodapeDir').textContent = espera
    ? 'O Story do(a) sorteado(a) é conferido antes do brinde.'
    : 'Obrigado a todos que participaram.';
}

// ---------- Espera ----------

function renderEspera(s) {
  mostrarCena('espera');
  animandoId = null;
  reveladoId = null;
  $('perfilMarcar').textContent = s.perfilMarcar.startsWith('@') ? s.perfilMarcar : '@' + s.perfilMarcar;
  const num = $('contadorNum');
  num.textContent = formatarNumero(s.totalComentarios);
  if (ultimoContador !== null && s.totalComentarios > ultimoContador && !reduzirMovimento) {
    num.classList.remove('pulsa'); void num.offsetWidth; num.classList.add('pulsa');
  }
  ultimoContador = s.totalComentarios;
}

// ---------- Sorteio ----------

function animarSorteio(s) {
  const id = s.tela.sorteioId;
  animandoId = id;
  mostrarCena('sorteando');
  $('resultadoSobre').textContent = s.tela.novamente
    ? 'Sorteando novamente'
    : `Sorteando entre ${s.sorteioAtual.entre} chances`;

  const nome = $('nome');
  nome.classList.remove('revelado');
  const rolo = s.tela.rolo.length ? s.tela.rolo : ['…'];
  const fim = s.tela.revelarEm - defasagem;
  const inicio = Date.now();
  const total = Math.max(fim - inicio, 1);
  const regua = $('regua');
  let i = 0;

  function passo() {
    if (animandoId !== id) return;
    const agora = Date.now();
    if (agora >= fim) { revelar(ultimo); return; }
    const progresso = (agora - inicio) / total;
    regua.style.width = (progresso * 100) + '%';
    nome.textContent = '@' + rolo[i++ % rolo.length];
    ajustarNome(nome, 150);
    // Começa rápido e vai desacelerando, como uma roleta.
    const espera = 55 + 520 * Math.pow(progresso, 3);
    setTimeout(passo, Math.min(espera, Math.max(fim - agora, 0)));
  }
  passo();
}

function revelar(s) {
  const atual = s.sorteioAtual;
  if (!atual) return;
  animandoId = null;
  const primeiraVez = reveladoId !== atual.id;
  reveladoId = atual.id;

  mostrarCena('resultado');
  $('regua').style.width = '';
  $('resultadoSobre').textContent = 'Vencedor(a) do sorteio';
  const nome = $('nome');
  nome.textContent = '@' + atual.username;
  ajustarNome(nome);
  if (primeiraVez && !reduzirMovimento) { nome.classList.remove('revelado'); void nome.offsetWidth; nome.classList.add('revelado'); }

  const caixa = $('statusCaixa');
  caixa.dataset.status = atual.status;
  $('statusValor').textContent = {
    pendente: 'Aguardando confirmação',
    confirmado: 'Confirmado!',
    desqualificado: 'Story não encontrado',
  }[atual.status];
  $('resultadoMsg').textContent = {
    pendente: 'Vem para a frente! A equipe confere o Story na DM da Líderes antes de entregar o brinde.',
    confirmado: 'Parabéns! Seu brinde está com a equipe.',
    desqualificado: 'Sem o Story marcando o perfil, o sorteio é refeito.',
  }[atual.status];

  if (atual.status === 'confirmado' && confeteId !== atual.id) {
    confeteId = atual.id;
    if (!reduzirMovimento) soltarConfete();
  }
}

function render(s) {
  ultimo = s;
  defasagem = s.agora - Date.now();
  if (s.tela.fase === 'espera' || !s.sorteioAtual) { renderEspera(s); return; }

  const id = s.tela.sorteioId;
  const falta = s.tela.revelarEm - defasagem - Date.now();
  if (falta > 300 && reveladoId !== id) {
    if (animandoId !== id) animarSorteio(s);
  } else if (animandoId !== id) {
    revelar(s);
  }
}

// ---------- Confete ----------

function soltarConfete() {
  const canvas = $('confete');
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const cores = ['#ffffff', '#c9d3ff', '#8ea2ff', '#f5d76e'];
  const pecas = Array.from({ length: 180 }, () => ({
    x: innerWidth * (0.2 + Math.random() * 0.6), y: innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 16, vy: -8 - Math.random() * 14,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 8, h: 10 + Math.random() * 12,
    cor: cores[Math.floor(Math.random() * cores.length)],
  }));
  const inicio = performance.now();
  (function quadro(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pecas) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.cor; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      ctx.restore();
    }
    if (t - inicio < 4500) requestAnimationFrame(quadro);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(inicio);
}

addEventListener('resize', () => {
  const nome = $('nome');
  if (!$('cenaResultado').hidden && nome.textContent) ajustarNome(nome, palco.dataset.fase === 'sorteando' ? 150 : 180);
});

// Duplo clique: tela cheia (útil no projetor).
addEventListener('dblclick', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

conectarEventos(render, (ok) => { $('offline').hidden = ok; });
