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

  const { rows: existentes } = await pdo.query('SELECT id FROM tenants WHERE codigo = $1', [codigo]);
  if (existentes[0]) return fail(res, 'Já existe uma oficina com esse código.');

  const { rows: euRows } = await pdo.query('SELECT usuario, senha_hash, nome FROM professores WHERE id = $1', [
    auth.professor_id,
  ]);
  const eu = euRows[0];
  if (!eu) return fail(res, 'Professor não encontrado.', 404);

  const client = await pdo.connect();
  let tenantId, profId;
  try {
    await client.query('BEGIN');
    const { rows: tRows } = await client.query('INSERT INTO tenants (codigo, nome) VALUES ($1,$2) RETURNING id', [
      codigo,
      nome,
    ]);
    tenantId = Number(tRows[0].id);

    const { rows: pRows } = await client.query(
      'INSERT INTO professores (tenant_id, usuario, senha_hash, nome) VALUES ($1,$2,$3,$4) RETURNING id',
      [tenantId, eu.usuario, eu.senha_hash, eu.nome]
    );
    profId = Number(pRows[0].id);
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    client.release();
    return fail(res, 'Não foi possível criar a oficina.');
  }
  client.release();

  ok(res, {
    oficina: { id: tenantId, codigo, nome, professor_id: profId },
    dica: 'Alunos entram no jogo com o código ' + codigo + ' e o nome cadastrado nesta oficina.',
  });
};
