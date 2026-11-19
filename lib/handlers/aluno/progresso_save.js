const { db } = require('../../../lib/db');
const { cors, ok, fail, body } = require('../../../lib/http');
const { requireAluno } = require('../../../lib/auth');

/**
 * POST {
 *   "atividade_key": "1-3",
 *   "modulo_id": 1,
 *   "atividade_id": 3,
 *   "xp": 30,
 *   "feito": ["1-1","1-2","1-3"],   // opcional: sync completo
 *   "xp_map": {"1-1": 30}
 * }
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireAluno(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const pdo = db();
  const alunoId = auth.aluno_id;
  // Mapa por atividade_key: dentro de um único upsert, o Postgres não aceita
  // duas linhas disputando o mesmo alvo de ON CONFLICT — e o jogo manda o
  // "feito" completo junto com a atividade_key avulsa na mesma chamada, então
  // deduplicamos aqui (a entrada avulsa, processada por último, prevalece).
  const linhas = new Map();

  if (Array.isArray(b.feito) && b.feito.length) {
    for (const rawKey of b.feito) {
      const key = String(rawKey);
      const m = key.match(/^(\d+)-(\d+)$/);
      if (!m) continue;
      const xpItem = Number((b.xp_map && b.xp_map[key]) || 0);
      linhas.set(key, {
        aluno_id: alunoId,
        atividade_key: key,
        modulo_id: Number(m[1]),
        atividade_id: Number(m[2]),
        xp: xpItem,
        concluido: 1,
        concluido_em: new Date().toISOString(),
      });
    }
  }

  const key = String(b.atividade_key || '').trim();
  if (key) {
    const m = key.match(/^(\d+)-(\d+)$/);
    if (!m) return fail(res, 'atividade_key inválida.');
    linhas.set(key, {
      aluno_id: alunoId,
      atividade_key: key,
      modulo_id: Number(b.modulo_id ?? m[1]),
      atividade_id: Number(b.atividade_id ?? m[2]),
      xp: Number(b.xp || 0),
      concluido: 1,
      concluido_em: new Date().toISOString(),
    });
  }

  if (linhas.size) {
    const { error } = await pdo.from('progresso').upsert([...linhas.values()], { onConflict: 'aluno_id,atividade_key' });
    if (error) return fail(res, 'Erro ao salvar progresso.', 500);
  }

  const { data: rows, error: selError } = await pdo.from('progresso').select('atividade_key, xp').eq('aluno_id', alunoId);
  if (selError) return fail(res, 'Erro ao buscar progresso.', 500);

  const feito = rows.map((r) => r.atividade_key);
  const totalXp = rows.reduce((acc, r) => acc + Number(r.xp), 0);

  ok(res, { feito, xp: totalXp });
};
