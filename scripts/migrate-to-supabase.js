#!/usr/bin/env node
/**
 * Migra os dados do banco local (api/data/codequest.sqlite) para o Supabase,
 * via API REST (secret key) — não precisa da senha do Postgres.
 *
 * Rode uma vez, depois de criar o projeto no Supabase e aplicar
 * supabase/schema.sql no SQL Editor:
 *
 *   npm install
 *   SUPABASE_URL="https://xxxxx.supabase.co" SUPABASE_SECRET_KEY="sb_secret_..." npm run migrate
 *
 * Preserva os IDs originais (para manter as relações entre tabelas) e, no
 * final, chama a função realign_sequences() para as próximas inserções do
 * app não colidirem com os ids importados. Idempotente: pode rodar de novo
 * sem duplicar linhas (upsert por id).
 */

const path = require('path');
const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'api', 'data', 'codequest.sqlite');
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;

if (!URL || !KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY.');
  process.exit(1);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function upsertAll(supabase, table, rows, onConflict = 'id') {
  if (!rows.length) return;
  for (const part of chunk(rows, 500)) {
    const { error } = await supabase.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const supabase = createClient(URL, KEY, { auth: { persistSession: false } });

  const tenants = sqlite.prepare('SELECT * FROM tenants').all();
  await upsertAll(supabase, 'tenants', tenants);
  console.log(`tenants: ${tenants.length}`);

  const professores = sqlite.prepare('SELECT * FROM professores').all();
  await upsertAll(supabase, 'professores', professores);
  console.log(`professores: ${professores.length}`);

  const alunos = sqlite
    .prepare('SELECT * FROM alunos')
    .all()
    .map((a) => ({ ...a, eh_dupla: a.eh_dupla ?? 0 }));
  await upsertAll(supabase, 'alunos', alunos);
  console.log(`alunos: ${alunos.length}`);

  const progresso = sqlite.prepare('SELECT * FROM progresso').all();
  await upsertAll(supabase, 'progresso', progresso);
  console.log(`progresso: ${progresso.length}`);

  const tentativas = sqlite.prepare('SELECT * FROM tentativas').all();
  await upsertAll(supabase, 'tentativas', tentativas);
  console.log(`tentativas: ${tentativas.length}`);

  const { error: seqError } = await supabase.rpc('realign_sequences');
  if (seqError) throw new Error('realign_sequences: ' + seqError.message);

  sqlite.close();
  console.log('Migração concluída.');
}

main().catch((err) => {
  console.error('Falhou:', err.message);
  process.exitCode = 1;
});
