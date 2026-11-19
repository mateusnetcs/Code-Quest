const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { db } = require('./db');
const { fail } = require('./http');

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'codequest_sess';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('Defina SESSION_SECRET nas variáveis de ambiente.');
  return s;
}

function setSession(res, payload) {
  const token = jwt.sign(payload, secret(), { expiresIn: '30d' });
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  }));
}

function clearSession(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  }));
}

function getSession(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parsed = cookie.parse(raw);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}

/** Retorna a sessão do aluno, ou responde 401 e retorna null. */
function requireAluno(req, res) {
  const sess = getSession(req);
  if (!sess || sess.papel !== 'aluno') {
    fail(res, 'Faça login como aluno.', 401);
    return null;
  }
  return sess;
}

/** Retorna a sessão do professor, ou responde 401 e retorna null. */
function requireProfessor(req, res) {
  const sess = getSession(req);
  if (!sess || sess.papel !== 'professor') {
    fail(res, 'Faça login como professor.', 401);
    return null;
  }
  return sess;
}

/** Oficinas em que o professor (mesmo usuario) tem acesso */
async function professorOficinas(usuario) {
  const { rows } = await db().query(
    `SELECT t.id, t.codigo, t.nome, p.id AS professor_id
     FROM professores p
     JOIN tenants t ON t.id = p.tenant_id
     WHERE p.usuario = $1
     ORDER BY t.codigo`,
    [usuario]
  );
  return rows.map((r) => ({ ...r, id: Number(r.id), professor_id: Number(r.professor_id) }));
}

/** Resolve tenant por codigo se o professor tiver acesso; senão responde 403 e retorna null. */
async function professorTenantPorCodigo(req, res, auth, codigo) {
  codigo = String(codigo || '').trim().toUpperCase();
  if (!codigo) {
    fail(res, 'Informe o código da oficina.');
    return null;
  }
  const oficinas = await professorOficinas(auth.usuario);
  const achada = oficinas.find((o) => o.codigo === codigo);
  if (!achada) {
    fail(res, 'Você não tem acesso a essa oficina.', 403);
    return null;
  }
  return achada;
}

module.exports = {
  setSession,
  clearSession,
  getSession,
  requireAluno,
  requireProfessor,
  professorOficinas,
  professorTenantPorCodigo,
};
