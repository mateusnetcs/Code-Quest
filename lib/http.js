function cors(req, res) {
  const origin = req.headers.origin || '';
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

function ok(res, data = {}, code = 200) {
  res.statusCode = code;
  res.end(JSON.stringify({ ok: true, ...data }));
}

function fail(res, msg, code = 400, extra = {}) {
  res.statusCode = code;
  res.end(JSON.stringify({ ok: false, erro: msg, ...extra }));
}

function body(req) {
  return req.body && typeof req.body === 'object' ? req.body : {};
}

/** O driver pg devolve BIGINT/NUMERIC (SUM, COUNT, AVG) como string. Converte os campos indicados para number. */
function castNum(rows, fields) {
  return rows.map((r) => {
    const out = { ...r };
    for (const f of fields) out[f] = Number(out[f]);
    return out;
  });
}

function nomeNorm(nome) {
  return String(nome || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function montarNomeDupla(a, b) {
  const an = String(a || '').trim().replace(/\s+/g, ' ');
  const bn = String(b || '').trim().replace(/\s+/g, ' ');
  return `${an} & ${bn}`;
}

function validarNomePessoa(nome) {
  nome = String(nome || '').trim();
  if (nome.length < 2) return 'Nome muito curto';
  if (nome.length > 60) return 'Nome muito longo (máx. 60)';
  if (nome.includes('&')) return 'Não use & no nome individual';
  return null;
}

module.exports = { cors, ok, fail, body, nomeNorm, montarNomeDupla, validarNomePessoa, castNum };
