const { cors, ok } = require('../lib/http');
const { getSession } = require('../lib/auth');

/** GET — quem está logado (aluno ou professor) */
module.exports = async (req, res) => {
  if (cors(req, res)) return;

  const sess = getSession(req);
  if (!sess || !sess.papel) return ok(res, { autenticado: false });

  if (sess.papel === 'aluno') {
    return ok(res, {
      autenticado: true,
      papel: 'aluno',
      aluno: {
        id: sess.aluno_id,
        nome: sess.nome,
        tenant_id: sess.tenant_id,
        tenant_codigo: sess.tenant_codigo || '',
      },
    });
  }

  if (sess.papel === 'professor') {
    return ok(res, {
      autenticado: true,
      papel: 'professor',
      professor: {
        id: sess.professor_id,
        nome: sess.nome,
        usuario: sess.usuario,
        tenant_id: sess.tenant_id,
        tenant_codigo: sess.tenant_codigo,
      },
    });
  }

  ok(res, { autenticado: false });
};
