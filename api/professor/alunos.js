const { db } = require('../../lib/db');
const { cors, ok } = require('../../lib/http');
const { requireProfessor, professorTenantPorCodigo } = require('../../lib/auth');

/**
 * GET — lista alunos + erros + tempo + atividades concluídas
 * ?todos=1 — inclui desativados
 * ?codigo=OFICINA2 — oficina alvo (precisa ter acesso); padrão = sessão atual
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const pdo = db();
  const codigo = String(req.query.codigo || '').trim().toUpperCase();

  let tid, codOut;
  if (codigo) {
    const oficina = await professorTenantPorCodigo(req, res, auth, codigo);
    if (!oficina) return;
    tid = oficina.id;
    codOut = oficina.codigo;
  } else {
    tid = auth.tenant_id;
    codOut = auth.tenant_codigo;
  }

  const todos = String(req.query.todos || '') === '1';

  const sql = `SELECT a.id, a.nome, a.ativo, a.criado_em,
    COALESCE(a.eh_dupla, 0) AS eh_dupla,
    (SELECT COUNT(*) FROM progresso p WHERE p.aluno_id = a.id) AS concluidas,
    (SELECT COALESCE(SUM(p.xp),0) FROM progresso p WHERE p.aluno_id = a.id) AS xp,
    (SELECT COALESCE(SUM(t.erros),0) FROM tentativas t WHERE t.aluno_id = a.id) AS erros,
    (SELECT COALESCE(SUM(t.tempo_ms),0) FROM tentativas t WHERE t.aluno_id = a.id) AS tempo_ms
   FROM alunos a
   WHERE a.tenant_id = $1 ${todos ? '' : 'AND a.ativo = 1'}
   ORDER BY a.ativo DESC, erros DESC, a.nome`;

  const { rows } = await pdo.query(sql, [tid]);

  const alunos = rows.map((r) => {
    const tempoMs = Number(r.tempo_ms);
    return {
      id: Number(r.id),
      nome: r.nome,
      ativo: Number(r.ativo),
      criado_em: r.criado_em,
      eh_dupla: Number(r.eh_dupla),
      concluidas: Number(r.concluidas),
      xp: Number(r.xp),
      erros: Number(r.erros),
      tempo_ms: tempoMs,
      tempo_min: Math.round((tempoMs / 60000) * 10) / 10,
      tempo_s: Math.round(tempoMs / 1000),
    };
  });

  ok(res, { oficina_codigo: codOut, alunos });
};
