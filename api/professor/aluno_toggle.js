const { db } = require('../../lib/db');
const { cors, ok, fail, body } = require('../../lib/http');
const { requireProfessor, professorOficinas } = require('../../lib/auth');

/**
 * POST { "aluno_id": 1, "ativo": 0|1 }
 * Ativa ou desativa o acesso do aluno ao jogo (em qualquer oficina do professor).
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const alunoId = Number(b.aluno_id || 0);
  if (alunoId <= 0) return fail(res, 'Informe aluno_id.');
  if (!('ativo' in b)) return fail(res, 'Informe ativo (0 ou 1).');
  const ativo = Number(b.ativo) ? 1 : 0;

  const pdo = db();
  const ids = (await professorOficinas(auth.usuario)).map((o) => o.id);
  if (!ids.length) return fail(res, 'Nenhuma oficina disponível.', 403);

  const { data: aluno } = await pdo
    .from('alunos')
    .select('id, nome, tenant_id')
    .eq('id', alunoId)
    .in('tenant_id', ids)
    .maybeSingle();
  if (!aluno) return fail(res, 'Aluno não encontrado.', 404);

  await pdo.from('alunos').update({ ativo }).eq('id', alunoId);

  ok(res, {
    aluno: { id: alunoId, nome: aluno.nome, ativo, tenant_id: aluno.tenant_id },
  });
};
