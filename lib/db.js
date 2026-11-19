const { Pool } = require('pg');

let pool;

function db() {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      throw new Error('Defina SUPABASE_DB_URL nas variáveis de ambiente (connection string do Supabase).');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

module.exports = { db };
