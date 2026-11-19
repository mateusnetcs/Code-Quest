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

  const { data: row } = await pdo
    .from('alunos')
    .select('id, nome, criado_em, tenant_id, tenants(codigo)')
    .eq('id', alunoId)
    .in('tenant_id', ids)
    .maybeSingle();
  if (!row) return fail(res, 'Aluno não encontrado.', 404);

  const aluno = {
    id: row.id,
    nome: row.nome,
    criado_em: row.criado_em,
    tenant_id: row.tenant_id,
    oficina_codigo: row.tenants.codigo,
  };

  const { data: progresso } = await pdo
    .from('progresso')
    .select('atividade_key, modulo_id, atividade_id, xp, concluido_em')
    .eq('aluno_id', alunoId)
    .order('concluido_em');

  const { data: tentativas } = await pdo
    .from('tentativas')
    .select('atividade_key, modulo_id, skill, erros, tempo_ms, concluiu, criado_em')
    .eq('aluno_id', alunoId)
    .order('criado_em', { ascending: false })
    .limit(200);

  ok(res, { aluno, progresso: progresso || [], tentativas: tentativas || [] });
};
