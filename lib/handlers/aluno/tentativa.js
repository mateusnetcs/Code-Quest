const { db } = require('../../../lib/db');
const { cors, ok, fail, body } = require('../../../lib/http');
const { requireAluno } = require('../../../lib/auth');

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

  const { data, error } = await db()
    .from('tentativas')
    .insert({
      aluno_id: auth.aluno_id,
      tenant_id: auth.tenant_id,
      modulo_id: mid,
      atividade_id: aid,
      atividade_key: key,
      skill,
      erros,
      tempo_ms: tempo,
      concluiu,
    })
    .select('id')
    .single();
  if (error) return fail(res, 'Erro ao registrar tentativa.', 500);

  ok(res, {
    registrado: true,
    id: data.id,
    erros,
    tempo_ms: tempo,
  });
};
