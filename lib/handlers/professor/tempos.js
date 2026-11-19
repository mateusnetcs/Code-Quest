const { db } = require('../../../lib/db');
const { cors, ok, fail, castNum } = require('../../../lib/http');
const { requireProfessor } = require('../../../lib/auth');

/**
 * GET — tempos por aluno / atividade / módulo
 * ?agrupar=aluno|atividade|modulo
 * ?aluno_id= optional
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const tid = auth.tenant_id;
  const agrupar = req.query.agrupar || 'atividade';
  const alunoId = Number(req.query.aluno_id || 0);
  const pdo = db();

  if (agrupar === 'aluno') {
    const { data, error } = await pdo.rpc('tempos_por_aluno', { p_tenant_id: tid });
    if (error) return fail(res, 'Erro ao buscar tempos.', 500);
    return ok(res, { agrupar: 'aluno', tempos: castNum(data, ['aluno_id', 'tempo_ms', 'tempo_medio_ms', 'tentativas']) });
  }

  if (agrupar === 'modulo') {
    const { data, error } = await pdo.rpc('tempos_por_modulo', {
      p_tenant_id: tid,
      p_aluno_id: alunoId > 0 ? alunoId : null,
    });
    if (error) return fail(res, 'Erro ao buscar tempos.', 500);
    return ok(res, {
      agrupar: 'modulo',
      aluno_id: alunoId || null,
      tempos: castNum(data, ['tempo_ms', 'tempo_medio_ms', 'tentativas']),
    });
  }

  const { data, error } = await pdo.rpc('tempos_por_atividade', {
    p_tenant_id: tid,
    p_aluno_id: alunoId > 0 ? alunoId : null,
  });
  if (error) return fail(res, 'Erro ao buscar tempos.', 500);
  ok(res, {
    agrupar: 'atividade',
    aluno_id: alunoId || null,
    tempos: castNum(data, ['tempo_ms', 'tempo_medio_ms', 'tentativas']),
  });
};
