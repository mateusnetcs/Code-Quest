const { db } = require('../../lib/db');
const { cors, ok, castNum } = require('../../lib/http');
const { requireProfessor } = require('../../lib/auth');

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
    const { rows } = await pdo.query(
      `SELECT a.id AS aluno_id, a.nome,
              COALESCE(SUM(t.tempo_ms),0) AS tempo_ms,
              COALESCE(AVG(t.tempo_ms),0) AS tempo_medio_ms,
              COUNT(t.id) AS tentativas
       FROM alunos a
       LEFT JOIN tentativas t ON t.aluno_id = a.id
       WHERE a.tenant_id = $1 AND a.ativo = 1
       GROUP BY a.id, a.nome
       ORDER BY tempo_ms DESC`,
      [tid]
    );
    return ok(res, {
      agrupar: 'aluno',
      tempos: castNum(rows, ['aluno_id', 'tempo_ms', 'tempo_medio_ms', 'tentativas']),
    });
  }

  if (agrupar === 'modulo') {
    let sql = `SELECT modulo_id,
          COALESCE(SUM(tempo_ms),0) AS tempo_ms,
          COALESCE(AVG(tempo_ms),0) AS tempo_medio_ms,
          COUNT(*) AS tentativas
        FROM tentativas WHERE tenant_id = $1`;
    const params = [tid];
    if (alunoId > 0) {
      sql += ' AND aluno_id = $2';
      params.push(alunoId);
    }
    sql += ' GROUP BY modulo_id ORDER BY tempo_ms DESC';
    const { rows } = await pdo.query(sql, params);
    return ok(res, {
      agrupar: 'modulo',
      aluno_id: alunoId || null,
      tempos: castNum(rows, ['tempo_ms', 'tempo_medio_ms', 'tentativas']),
    });
  }

  let sql = `SELECT atividade_key, modulo_id, atividade_id,
        COALESCE(SUM(tempo_ms),0) AS tempo_ms,
        COALESCE(AVG(tempo_ms),0) AS tempo_medio_ms,
        COUNT(*) AS tentativas
      FROM tentativas WHERE tenant_id = $1`;
  const params = [tid];
  if (alunoId > 0) {
    sql += ' AND aluno_id = $2';
    params.push(alunoId);
  }
  sql += ' GROUP BY atividade_key, modulo_id, atividade_id ORDER BY tempo_ms DESC LIMIT 100';
  const { rows } = await pdo.query(sql, params);
  ok(res, {
    agrupar: 'atividade',
    aluno_id: alunoId || null,
    tempos: castNum(rows, ['tempo_ms', 'tempo_medio_ms', 'tentativas']),
  });
};
