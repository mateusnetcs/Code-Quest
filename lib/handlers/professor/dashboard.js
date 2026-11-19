const { db } = require('../../../lib/db');
const { cors, ok, fail } = require('../../../lib/http');
const { requireProfessor } = require('../../../lib/auth');

/** GET — resumo do painel do professor (tenant) */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const tid = auth.tenant_id;
  const { data, error } = await db().rpc('dashboard_resumo', { p_tenant_id: tid }).maybeSingle();
  if (error) return fail(res, 'Erro ao buscar resumo.', 500);

  const tempoMs = Number(data.tempo_total_ms);

  ok(res, {
    tenant: { id: tid, codigo: auth.tenant_codigo, professor: auth.nome },
    resumo: {
      alunos: Number(data.alunos),
      alunos_com_progresso: Number(data.alunos_com_progresso),
      tentativas: Number(data.tentativas),
      erros_totais: Number(data.erros_totais),
      tempo_total_ms: tempoMs,
      tempo_total_min: Math.round((tempoMs / 60000) * 10) / 10,
      tempo_total_s: Math.round(tempoMs / 1000),
    },
  });
};
