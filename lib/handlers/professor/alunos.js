const { db } = require('../../../lib/db');
const { cors, ok, fail } = require('../../../lib/http');
const { requireProfessor, professorTenantPorCodigo } = require('../../../lib/auth');

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

  const { data, error } = await pdo.rpc('alunos_lista', { p_tenant_id: tid, p_todos: todos });
  if (error) return fail(res, 'Erro ao listar alunos.', 500);

  const alunos = data.map((r) => {
    const tempoMs = Number(r.tempo_ms);
    return {
      id: r.id,
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
