const { fail } = require('../../lib/http');

// Vercel Hobby tem um limite de 12 Serverless Functions por deployment —
// então as rotas /api/aluno/* viram uma função só, roteando pelo slug.
// As URLs que o jogo chama (ex: /api/aluno/login) continuam as mesmas.
const handlers = {
  login: require('../../lib/handlers/aluno/login'),
  logout: require('../../lib/handlers/aluno/logout'),
  progresso_get: require('../../lib/handlers/aluno/progresso_get'),
  progresso_save: require('../../lib/handlers/aluno/progresso_save'),
  tentativa: require('../../lib/handlers/aluno/tentativa'),
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
