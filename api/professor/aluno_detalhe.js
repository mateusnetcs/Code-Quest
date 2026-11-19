const { db } = require('../../lib/db');
const { cors, ok, fail } = require('../../lib/http');
const { requireProfessor, professorOficinas } = require('../../lib/auth');

/** GET ?aluno_id= — detalhe de um aluno (progresso + tentativas) */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const alunoId = Number(req.query.aluno_id || 0);
  if (alunoId <= 0) return fail(res, 'Informe aluno_id.');

  const pdo = db();
  const ids = (await professorOficinas(auth.usuario)).map((o) => o.id);
  if (!ids.length) return fail(res, 'Nenhuma oficina disponível.', 403);

  const { rows } = await pdo.query(
    `SELECT a.id, a.nome, a.criado_em, a.tenant_id, t.codigo AS oficina_codigo
     FROM alunos a JOIN tenants t ON t.id = a.tenant_id
     WHERE a.id = $1 AND a.tenant_id = ANY($2::bigint[])`,
    [alunoId, ids]
  );
  const aluno = rows[0];
  if (!aluno) return fail(res, 'Aluno não encontrado.', 404);
  aluno.id = Number(aluno.id);
  aluno.tenant_id = Number(aluno.tenant_id);

  const { rows: progresso } = await pdo.query(
    'SELECT atividade_key, modulo_id, atividade_id, xp, concluido_em FROM progresso WHERE aluno_id = $1 ORDER BY concluido_em',
    [alunoId]
  );

  const { rows: tentativas } = await pdo.query(
    `SELECT atividade_key, modulo_id, skill, erros, tempo_ms, concluiu, criado_em
     FROM tentativas WHERE aluno_id = $1 ORDER BY criado_em DESC LIMIT 200`,
    [alunoId]
  );

  ok(res, { aluno, progresso, tentativas });
};
