const { createClient } = require('@supabase/supabase-js');

let client;

/** Cliente Supabase autenticado com a secret key (bypassa RLS). Só usar no servidor. */
function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY nas variáveis de ambiente.');
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

module.exports = { db };
