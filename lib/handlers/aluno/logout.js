const { cors, ok } = require('../../../lib/http');
const { clearSession } = require('../../../lib/auth');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  clearSession(res);
  ok(res, { logout: true });
};
