const { cors, ok } = require('../../lib/http');
const { requireProfessor, professorOficinas } = require('../../lib/auth');

/** GET — oficinas (tenants) em que o professor logado tem acesso */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const oficinas = await professorOficinas(auth.usuario);
  ok(res, { oficina_atual: auth.tenant_codigo, oficinas });
};
