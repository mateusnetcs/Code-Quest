const { fail } = require('../../lib/http');

// Vercel Hobby tem um limite de 12 Serverless Functions por deployment —
// então as rotas /api/professor/* viram uma função só, roteando pelo slug.
// As URLs que o painel chama (ex: /api/professor/dashboard) continuam as mesmas.
const handlers = {
  login: require('../../lib/handlers/professor/login'),
  logout: require('../../lib/handlers/professor/logout'),
  dashboard: require('../../lib/handlers/professor/dashboard'),
  alunos: require('../../lib/handlers/professor/alunos'),
  aluno_criar: require('../../lib/handlers/professor/aluno_criar'),
  aluno_toggle: require('../../lib/handlers/professor/aluno_toggle'),
  aluno_detalhe: require('../../lib/handlers/professor/aluno_detalhe'),
  oficinas: require('../../lib/handlers/professor/oficinas'),
  oficina_criar: require('../../lib/handlers/professor/oficina_criar'),
  oficina_trocar: require('../../lib/handlers/professor/oficina_trocar'),
  erros: require('../../lib/handlers/professor/erros'),
  tempos: require('../../lib/handlers/professor/tempos'),
  habilidades: require('../../lib/handlers/professor/habilidades'),
};

module.exports = async (req, res) => {
  // Lê o nome da rota direto da URL (em vez de req.query) — mais robusto
  // entre o roteamento de dev (Next/Vercel usam chaves diferentes pra
  // catch-all) e o de produção.
  const path = (req.url || '').split('?')[0];
  const slug = path.split('/').filter(Boolean).pop();
  const handler = handlers[slug];
  if (!handler) return fail(res, 'Rota não encontrada.', 404);
  return handler(req, res);
};
