const { db } = require('../../lib/db');
const { cors, ok, fail, body } = require('../../lib/http');
const { requireProfessor } = require('../../lib/auth');

/**
 * POST { "codigo": "OFICINA2", "nome": "Turma B" }
 * Cria uma nova oficina e copia o professor logado (mesmo usuario/senha) para ela.
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const codigo = String(b.codigo || '').trim().toUpperCase();
  let nome = String(b.nome || '').trim();

  if (!codigo) return fail(res, 'Informe o código da oficina (ex: OFICINA2).');
  if (!/^[A-Z0-9_-]{3,32}$/.test(codigo)) {
    return fail(res, 'Código inválido. Use 3–32 caracteres: letras, números, _ ou - (ex: OFICINA2).');
  }
  if (!nome) nome = 'Oficina ' + codigo;
  if (nome.length > 120) return fail(res, 'Nome da oficina muito longo.');

  const pdo = db();

  const { data: existente } = await pdo.from('tenants').select('id').eq('codigo', codigo).maybeSingle();
  if (existente) return fail(res, 'Já existe uma oficina com esse código.');

  const { data: eu } = await pdo
    .from('professores')
    .select('usuario, senha_hash, nome')
    .eq('id', auth.professor_id)
    .maybeSingle();
  if (!eu) return fail(res, 'Professor não encontrado.', 404);

  const { data: tenant, error: tError } = await pdo
    .from('tenants')
    .insert({ codigo, nome })
    .select('id')
    .single();
  if (tError) return fail(res, 'Não foi possível criar a oficina.');

  const { data: prof, error: pError } = await pdo
    .from('professores')
    .insert({ tenant_id: tenant.id, usuario: eu.usuario, senha_hash: eu.senha_hash, nome: eu.nome })
    .select('id')
    .single();
  if (pError) {
    await pdo.from('tenants').delete().eq('id', tenant.id);
    return fail(res, 'Não foi possível criar a oficina.');
  }

  ok(res, {
    oficina: { id: tenant.id, codigo, nome, professor_id: prof.id },
    dica: 'Alunos entram no jogo com o código ' + codigo + ' e o nome cadastrado nesta oficina.',
  });
};
