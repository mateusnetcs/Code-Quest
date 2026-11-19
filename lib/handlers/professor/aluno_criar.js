const { db } = require('../../../lib/db');
const { cors, ok, fail, body, nomeNorm, montarNomeDupla, validarNomePessoa } = require('../../../lib/http');
const { requireProfessor, professorTenantPorCodigo } = require('../../../lib/auth');

/**
 * POST { "codigo": "OFICINA1", "nome": "Maria" }
 *   ou { "codigo": "OFICINA1", "nome": "Maria", "nome2": "João" }  → usuário-dupla
 *   ou { "codigo": "OFICINA2", "nomes": ["Maria", "João"] }
 *   ou { "codigo": "OFICINA2", "duplas": [["Ana","Bruno"], ["Carla","Diego"]] }
 *
 * Dupla = 2 alunos no mesmo computador → 1 usuário de login (ex: "Ana & Bruno").
 */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;
  if (req.method !== 'POST') return fail(res, 'Use POST.', 405);

  const b = body(req);
  const codigo = String(b.codigo || '').trim().toUpperCase();
  if (!codigo) return fail(res, 'Escolha a oficina do aluno (código).');

  const oficina = await professorTenantPorCodigo(req, res, auth, codigo);
  if (!oficina) return;
  const tid = oficina.id;

  const entradas = [];

  if (Array.isArray(b.duplas)) {
    for (const par of b.duplas) {
      if (!Array.isArray(par) || par.length < 2) continue;
      const a = String(par[0] || '').trim();
      const c = String(par[1] || '').trim();
      if (!a || !c) continue;
      entradas.push({ nome: montarNomeDupla(a, c), eh_dupla: 1 });
    }
  }

  if (b.nome2 && String(b.nome2).trim() !== '') {
    const a = String(b.nome || '').trim();
    const c = String(b.nome2).trim();
    if (a && c) entradas.push({ nome: montarNomeDupla(a, c), eh_dupla: 1 });
  } else if (Array.isArray(b.nomes)) {
    for (const n0 of b.nomes) {
      const n = String(n0 || '').trim();
      if (!n) continue;
      entradas.push({ nome: n, eh_dupla: n.includes(' & ') ? 1 : 0 });
    }
  } else if (b.nome && String(b.nome).trim() !== '') {
    const n = String(b.nome).trim();
    entradas.push({ nome: n, eh_dupla: n.includes(' & ') ? 1 : 0 });
  }

  if (!entradas.length) return fail(res, 'Informe o nome do aluno, ou dois nomes para formar uma dupla.');

  const pdo = db();
  const criados = [];
  const reativados = [];
  const jaExistem = [];
  const erros = [];

  for (const item of entradas) {
    let nome = item.nome;
    const ehDupla = Number(item.eh_dupla);

    if (ehDupla) {
      const partes = nome.split('&').map((s) => s.trim());
      if (partes.length !== 2) {
        erros.push({ nome, erro: 'Dupla inválida' });
        continue;
      }
      let invalido = false;
      for (const p of partes) {
        const err = validarNomePessoa(p);
        if (err) {
          erros.push({ nome, erro: err });
          invalido = true;
          break;
        }
      }
      if (invalido) continue;
      if (nomeNorm(partes[0]) === nomeNorm(partes[1])) {
        erros.push({ nome, erro: 'Os dois nomes da dupla precisam ser diferentes' });
        continue;
      }
      nome = montarNomeDupla(partes[0], partes[1]);
    } else {
      const err = validarNomePessoa(nome);
      if (err) {
        erros.push({ nome, erro: err });
        continue;
      }
    }

    if (nome.length > 120) {
      erros.push({ nome, erro: 'Nome muito longo' });
      continue;
    }

    const norm = nomeNorm(nome);
    const { data: exist } = await pdo
      .from('alunos')
      .select('id, nome, ativo')
      .eq('tenant_id', tid)
      .eq('nome_norm', norm)
      .maybeSingle();

    if (exist) {
      if (Number(exist.ativo) === 1) {
        jaExistem.push({ id: exist.id, nome: exist.nome, eh_dupla: ehDupla });
        continue;
      }
      await pdo.from('alunos').update({ ativo: 1, nome, eh_dupla: ehDupla }).eq('id', exist.id);
      reativados.push({ id: exist.id, nome, eh_dupla: ehDupla });
      continue;
    }

    const { data: inserido, error: insError } = await pdo
      .from('alunos')
      .insert({ tenant_id: tid, nome, nome_norm: norm, eh_dupla: ehDupla, ativo: 1 })
      .select('id')
      .single();

    if (insError) {
      erros.push({ nome, erro: 'Não foi possível cadastrar' });
      continue;
    }
    criados.push({ id: inserido.id, nome, eh_dupla: ehDupla, login: nome });
  }

  ok(res, {
    oficina: { id: tid, codigo: oficina.codigo, nome: oficina.nome },
    criados,
    reativados,
    ja_existem: jaExistem,
    erros,
    total_ok: criados.length + reativados.length,
  });
};
