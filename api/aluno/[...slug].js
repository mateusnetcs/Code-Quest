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
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const handler = handlers[slug];
  if (!handler) return fail(res, 'Rota não encontrada.', 404);
  return handler(req, res);
};
