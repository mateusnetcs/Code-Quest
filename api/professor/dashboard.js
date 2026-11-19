const { db } = require('../../lib/db');
const { cors, ok } = require('../../lib/http');
const { requireProfessor } = require('../../lib/auth');

/** GET — resumo do painel do professor (tenant) */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const tid = auth.tenant_id;
  const pdo = db();

  const { rows: r1 } = await pdo.query('SELECT COUNT(*) AS c FROM alunos WHERE tenant_id = $1 AND ativo = 1', [tid]);
  const totalAlunos = Number(r1[0].c);

  const { rows: r2 } = await pdo.query('SELECT COUNT(*) AS c FROM tentativas WHERE tenant_id = $1', [tid]);
  const totalTentativas = Number(r2[0].c);

  const { rows: r3 } = await pdo.query(
    'SELECT COALESCE(SUM(erros),0) AS e, COALESCE(SUM(tempo_ms),0) AS t FROM tentativas WHERE tenant_id = $1',
    [tid]
  );
  const sum = r3[0];

  const { rows: r4 } = await pdo.query(
    `SELECT COUNT(DISTINCT aluno_id) AS c FROM progresso p
     JOIN alunos a ON a.id = p.aluno_id WHERE a.tenant_id = $1`,
    [tid]
  );
  const comProgresso = Number(r4[0].c);

  const tempoMs = Number(sum.t);

  ok(res, {
    tenant: { id: tid, codigo: auth.tenant_codigo, professor: auth.nome },
    resumo: {
      alunos: totalAlunos,
      alunos_com_progresso: comProgresso,
      tentativas: totalTentativas,
      erros_totais: Number(sum.e),
      tempo_total_ms: tempoMs,
      tempo_total_min: Math.round((tempoMs / 60000) * 10) / 10,
      tempo_total_s: Math.round(tempoMs / 1000),
    },
  });
};
