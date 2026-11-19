const { cors, ok, fail, body } = require('../../../lib/http');
const { requireProfessor, professorTenantPorCodigo, setSession } = require('../../../lib/auth');

/**
 * POST { "codigo": "OFICINA2" }
 * Troca a oficina ativa da sessão do professor.
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const codigo = String(b.codigo || '').trim().toUpperCase();
  const oficina = await professorTenantPorCodigo(req, res, auth, codigo);
  if (!oficina) return;

  setSession(res, {
    papel: 'professor',
    professor_id: oficina.professor_id,
    tenant_id: oficina.id,
    tenant_codigo: oficina.codigo,
    nome: auth.nome,
    usuario: auth.usuario,
  });

  ok(res, {
    professor: {
      id: oficina.professor_id,
      nome: auth.nome,
      usuario: auth.usuario,
      tenant_id: oficina.id,
      tenant_codigo: oficina.codigo,
      tenant_nome: oficina.nome,
    },
  });
};
