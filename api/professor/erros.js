const { db } = require('../../lib/db');
const { cors, ok, castNum } = require('../../lib/http');
const { requireProfessor } = require('../../lib/auth');

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
    const { rows } = await pdo.query(
      `SELECT a.id AS aluno_id, a.nome, COALESCE(SUM(t.erros),0) AS erros,
              COUNT(t.id) AS tentativas
       FROM alunos a
       LEFT JOIN tentativas t ON t.aluno_id = a.id
       WHERE a.tenant_id = $1 AND a.ativo = 1
       GROUP BY a.id, a.nome
       ORDER BY erros DESC, a.nome
       LIMIT 50`,
      [tid]
    );
    return ok(res, { tipo: 'pessoa', ranking: castNum(rows, ['aluno_id', 'erros', 'tentativas']) });
  }

  if (tipo === 'modulo') {
    const { rows } = await pdo.query(
      `SELECT modulo_id, COALESCE(SUM(erros),0) AS erros,
              COUNT(*) AS tentativas,
              COALESCE(SUM(tempo_ms),0) AS tempo_ms
       FROM tentativas
       WHERE tenant_id = $1
       GROUP BY modulo_id
       ORDER BY erros DESC`,
      [tid]
    );
    return ok(res, { tipo: 'modulo', ranking: castNum(rows, ['erros', 'tentativas', 'tempo_ms']) });
  }

  const { rows } = await pdo.query(
    `SELECT atividade_key, modulo_id, atividade_id,
            COALESCE(SUM(erros),0) AS erros,
            COUNT(*) AS tentativas,
            COALESCE(AVG(tempo_ms),0) AS tempo_medio_ms,
            COALESCE(SUM(tempo_ms),0) AS tempo_ms
     FROM tentativas
     WHERE tenant_id = $1
     GROUP BY atividade_key, modulo_id, atividade_id
     ORDER BY erros DESC
     LIMIT 50`,
    [tid]
  );
  ok(res, { tipo: 'atividade', ranking: castNum(rows, ['erros', 'tentativas', 'tempo_medio_ms', 'tempo_ms']) });
};
