const { db } = require('../../lib/db');
const { cors, ok, fail, body } = require('../../lib/http');
const { requireAluno } = require('../../lib/auth');

/**
 * POST — registra tentativa (erros + tempo)
 * {
 *   "atividade_key": "5-2",
 *   "modulo_id": 5,
 *   "atividade_id": 2,
 *   "skill": "Navegação segura",
 *   "erros": 3,
 *   "tempo_ms": 45000,
 *   "concluiu": true
 * }
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireAluno(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const key = String(b.atividade_key || '').trim();
  const m = key.match(/^(\d+)-(\d+)$/);
  if (!key || !m) return fail(res, 'atividade_key inválida.');

  const mid = Number(b.modulo_id ?? m[1]);
  const aid = Number(b.atividade_id ?? m[2]);
  const skill = String(b.skill || '').trim();
  const erros = Math.max(0, Number(b.erros || 0));
  let tempo = Math.max(0, Number(b.tempo_ms || 0));
  const concluiu = b.concluiu ? 1 : 0;

  const CAP_3H = 1000 * 60 * 180;
  if (tempo > CAP_3H) tempo = CAP_3H;

  const pdo = db();
  const { rows } = await pdo.query(
    `INSERT INTO tentativas
      (aluno_id, tenant_id, modulo_id, atividade_id, atividade_key, skill, erros, tempo_ms, concluiu)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [auth.aluno_id, auth.tenant_id, mid, aid, key, skill, erros, tempo, concluiu]
  );

  ok(res, {
    registrado: true,
    id: Number(rows[0].id),
    erros,
    tempo_ms: tempo,
  });
};
