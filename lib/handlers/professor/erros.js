const { db } = require('../../../lib/db');
const { cors, ok, fail, castNum } = require('../../../lib/http');
const { requireProfessor } = require('../../../lib/auth');

/**
 * GET — rankings de erro
 * ?tipo=atividade|pessoa|modulo
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const tid = auth.tenant_id;
  const tipo = req.query.tipo || 'atividade';
  const pdo = db();

  if (tipo === 'pessoa') {
    const { data, error } = await pdo.rpc('erros_por_pessoa', { p_tenant_id: tid });
    if (error) return fail(res, 'Erro ao buscar ranking.', 500);
    return ok(res, { tipo: 'pessoa', ranking: castNum(data, ['aluno_id', 'erros', 'tentativas']) });
  }

  if (tipo === 'modulo') {
    const { data, error } = await pdo.rpc('erros_por_modulo', { p_tenant_id: tid });
    if (error) return fail(res, 'Erro ao buscar ranking.', 500);
    return ok(res, { tipo: 'modulo', ranking: castNum(data, ['erros', 'tentativas', 'tempo_ms']) });
  }

  const { data, error } = await pdo.rpc('erros_por_atividade', { p_tenant_id: tid });
  if (error) return fail(res, 'Erro ao buscar ranking.', 500);
  ok(res, { tipo: 'atividade', ranking: castNum(data, ['erros', 'tentativas', 'tempo_medio_ms', 'tempo_ms']) });
};
