const bcrypt = require('bcryptjs');
const { db } = require('../../lib/db');
const { cors, ok, fail, body } = require('../../lib/http');
const { setSession } = require('../../lib/auth');

/**
 * POST { "codigo": "OFICINA1", "usuario": "professor", "senha": "professor123" }
 * Professor acessa o tenant com usuário e senha.
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const codigo = String(b.codigo || '').trim().toUpperCase();
  const usuario = String(b.usuario || '').trim();
  const senha = String(b.senha || '');

  if (!codigo || !usuario || !senha) return fail(res, 'Informe codigo, usuario e senha.');

  const pdo = db();
  const { data: tenant } = await pdo.from('tenants').select('id, codigo, nome').eq('codigo', codigo).maybeSingle();
  if (!tenant) return fail(res, 'Tenant/oficina não encontrado.', 404);

  const { data: prof } = await pdo
    .from('professores')
    .select('id, usuario, senha_hash, nome')
    .eq('tenant_id', tenant.id)
    .eq('usuario', usuario)
    .maybeSingle();

  if (!prof || !bcrypt.compareSync(senha, prof.senha_hash)) {
    return fail(res, 'Usuário ou senha inválidos.', 401);
  }

  setSession(res, {
    papel: 'professor',
    professor_id: prof.id,
    tenant_id: tenant.id,
    tenant_codigo: tenant.codigo,
    nome: prof.nome,
    usuario: prof.usuario,
  });

  ok(res, {
    papel: 'professor',
    professor: {
      id: prof.id,
      nome: prof.nome,
      usuario: prof.usuario,
      tenant_id: tenant.id,
      tenant_codigo: tenant.codigo,
      tenant_nome: tenant.nome,
    },
  });
};
