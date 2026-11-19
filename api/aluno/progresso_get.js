const { db } = require('../../lib/db');
const { cors, ok, fail } = require('../../lib/http');
const { requireAluno } = require('../../lib/auth');

/**
 * GET — progresso do aluno logado
 * Retorna: feito[], xp, progresso[] (compatível com o jogo)
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireAluno(req, res);
  if (!auth) return;

  const { data: rows, error } = await db()
    .from('progresso')
    .select('atividade_key, xp, modulo_id, atividade_id, concluido_em')
    .eq('aluno_id', auth.aluno_id)
    .order('concluido_em');
  if (error) return fail(res, 'Erro ao buscar progresso.', 500);

  const feito = [];
  let xp = 0;
  for (const r of rows) {
    feito.push(r.atividade_key);
    xp += Number(r.xp);
  }

  ok(res, {
    aluno: { id: auth.aluno_id, nome: auth.nome },
    xp,
    feito,
    progresso: rows,
  });
};
