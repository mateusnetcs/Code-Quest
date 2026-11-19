const { db } = require('../../lib/db');
const { cors, ok, fail, body } = require('../../lib/http');
const { requireAluno } = require('../../lib/auth');

const UPSERT = `
  INSERT INTO progresso (aluno_id, atividade_key, modulo_id, atividade_id, xp, concluido)
  VALUES ($1,$2,$3,$4,$5,1)
  ON CONFLICT (aluno_id, atividade_key) DO UPDATE SET
    xp = EXCLUDED.xp,
    concluido = 1,
    concluido_em = CURRENT_TIMESTAMP
`;

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

  if (Array.isArray(b.feito) && b.feito.length) {
    for (const rawKey of b.feito) {
      const key = String(rawKey);
      const m = key.match(/^(\d+)-(\d+)$/);
      if (!m) continue;
      const mid = Number(m[1]);
      const aid = Number(m[2]);
      const xpItem = Number((b.xp_map && b.xp_map[key]) || 0);
      await pdo.query(UPSERT, [alunoId, key, mid, aid, xpItem]);
    }
  }

  const key = String(b.atividade_key || '').trim();
  if (key) {
    const m = key.match(/^(\d+)-(\d+)$/);
    if (!m) return fail(res, 'atividade_key inválida.');
    const mid = Number(b.modulo_id ?? m[1]);
    const aid = Number(b.atividade_id ?? m[2]);
    const xp = Number(b.xp || 0);
    await pdo.query(UPSERT, [alunoId, key, mid, aid, xp]);
  }

  const { rows } = await pdo.query('SELECT atividade_key, xp FROM progresso WHERE aluno_id = $1', [alunoId]);
  const feito = rows.map((r) => r.atividade_key);
  const totalXp = rows.reduce((acc, r) => acc + Number(r.xp), 0);

  ok(res, { feito, xp: totalXp });
};
