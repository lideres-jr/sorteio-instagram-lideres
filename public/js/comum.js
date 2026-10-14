// Utilidades compartilhadas pelas duas telas.

function conectarEventos(aoReceber, aoMudarConexao) {
  let fonte;
  function abrir() {
    fonte = new EventSource('/api/eventos');
    fonte.onopen = () => aoMudarConexao && aoMudarConexao(true);
    fonte.onmessage = (ev) => aoReceber(JSON.parse(ev.data));
    fonte.onerror = () => {
      aoMudarConexao && aoMudarConexao(false);
      // EventSource reconecta sozinho; se fechar de vez, reabre.
      if (fonte.readyState === EventSource.CLOSED) setTimeout(abrir, 2000);
    };
  }
  abrir();
}

async function chamarApi(rota, corpo) {
  let resp;
  try {
    resp = await fetch(rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo || {}),
    });
  } catch {
    throw new Error('Sem conexão com o servidor do sorteio. Ele está rodando?');
  }
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(dados.erro || `Erro ${resp.status}`);
    err.dados = dados;
    throw err;
  }
  return dados;
}

function horaCurta(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarNumero(n, digitos = 3) {
  return String(n).padStart(digitos, '0');
}
