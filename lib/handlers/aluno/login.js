const { db } = require('../../../lib/db');
const { cors, ok, fail, body, nomeNorm } = require('../../../lib/http');
const { setSession } = require('../../../lib/auth');

/**
 * POST { "codigo": "OFICINA1", "nome": "Maria" }
 * Aluno entra só com o nome (sem senha), no tenant informado pelo código.
 * O nome precisa ter sido cadastrado pelo professor no painel.
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const codigo = String(b.codigo || '').trim().toUpperCase();
  const nome = String(b.nome || '').trim();

  if (!codigo || !nome) return fail(res, 'Informe codigo da oficina e nome do aluno.');
  if (nome.length < 2) return fail(res, 'Nome muito curto.');
  if (nome.length > 80) return fail(res, 'Nome muito longo.');

  const pdo = db();
  const { data: tenant } = await pdo.from('tenants').select('id, codigo, nome').eq('codigo', codigo).maybeSingle();
  if (!tenant) return fail(res, 'Código da oficina não encontrado.', 404);

  const norm = nomeNorm(nome);
  const { data: aluno } = await pdo
    .from('alunos')
    .select('id, nome, ativo')
    .eq('tenant_id', tenant.id)
    .eq('nome_norm', norm)
    .maybeSingle();

  if (!aluno) {
    return fail(res, 'Nome não cadastrado. Peça ao professor para adicionar você na lista de alunos.', 403);
  }
  if (!Number(aluno.ativo)) return fail(res, 'Aluno desativado. Fale com o professor.', 403);

  setSession(res, {
    papel: 'aluno',
    aluno_id: aluno.id,
    tenant_id: tenant.id,
    tenant_codigo: tenant.codigo,
    nome: aluno.nome,
  });

  ok(res, {
    papel: 'aluno',
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      tenant_id: tenant.id,
      tenant_codigo: tenant.codigo,
      tenant_nome: tenant.nome,
    },
  });
};
