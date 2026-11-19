const { db } = require('../../../lib/db');
const { cors, ok, fail, castNum } = require('../../../lib/http');
const { requireProfessor } = require('../../../lib/auth');

/** GET — habilidades prejudicadas, com módulo e atividade */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const tid = auth.tenant_id;
  const pdo = db();

  const { data: porSkillRaw, error: e1 } = await pdo.rpc('habilidades_por_skill', { p_tenant_id: tid });
  if (e1) return fail(res, 'Erro ao buscar habilidades.', 500);
  const porSkill = castNum(porSkillRaw, ['erros', 'tentativas', 'tempo_ms']);

  const { data: detalheRaw, error: e2 } = await pdo.rpc('habilidades_detalhe', { p_tenant_id: tid });
  if (e2) return fail(res, 'Erro ao buscar habilidades.', 500);
  const detalhe = castNum(detalheRaw, ['modulo_id', 'atividade_id', 'erros', 'tentativas', 'tempo_ms']);

  ok(res, {
    habilidade_mais_prejudicada: porSkill[0] || null,
    habilidades: porSkill,
    detalhe,
  });
};
