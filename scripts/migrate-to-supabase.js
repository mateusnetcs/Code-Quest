#!/usr/bin/env node
/**
 * Migra os dados do banco local (api/data/codequest.sqlite) para o Supabase.
 *
 * Rode uma vez, depois de criar o projeto no Supabase e aplicar supabase/schema.sql:
 *
 *   npm install
 *   SUPABASE_DB_URL="postgresql://...pooler.supabase.com:6543/postgres" npm run migrate
 *
 * Preserva os IDs originais (para manter as relações entre tabelas) e ajusta
 * as sequences do Postgres no final. Idempotente: pode rodar de novo sem
 * duplicar linhas (usa ON CONFLICT DO NOTHING nas chaves únicas conhecidas).
 */

const path = require('path');
const Database = require('better-sqlite3');
const { Pool } = require('pg');

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, '..', 'api', 'data', 'codequest.sqlite');
const DB_URL = process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.error('Defina SUPABASE_DB_URL (connection string do Supabase, pooler na porta 6543).');
  process.exit(1);
}

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tenants = sqlite.prepare('SELECT * FROM tenants').all();
    for (const t of tenants) {
      await client.query(
        `INSERT INTO tenants (id, codigo, nome, criado_em) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET codigo = EXCLUDED.codigo, nome = EXCLUDED.nome`,
        [t.id, t.codigo, t.nome, t.criado_em]
      );
    }
    console.log(`tenants: ${tenants.length}`);

    const professores = sqlite.prepare('SELECT * FROM professores').all();
    for (const p of professores) {
      await client.query(
        `INSERT INTO professores (id, tenant_id, usuario, senha_hash, nome) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, nome = EXCLUDED.nome`,
        [p.id, p.tenant_id, p.usuario, p.senha_hash, p.nome]
      );
    }
    console.log(`professores: ${professores.length}`);

    const alunos = sqlite.prepare('SELECT * FROM alunos').all();
    for (const a of alunos) {
      await client.query(
        `INSERT INTO alunos (id, tenant_id, nome, nome_norm, eh_dupla, ativo, criado_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, ativo = EXCLUDED.ativo`,
        [a.id, a.tenant_id, a.nome, a.nome_norm, a.eh_dupla ?? 0, a.ativo, a.criado_em]
      );
    }
    console.log(`alunos: ${alunos.length}`);

    const progresso = sqlite.prepare('SELECT * FROM progresso').all();
    for (const p of progresso) {
      await client.query(
        `INSERT INTO progresso (id, aluno_id, atividade_key, modulo_id, atividade_id, xp, concluido, concluido_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.aluno_id, p.atividade_key, p.modulo_id, p.atividade_id, p.xp, p.concluido, p.concluido_em]
      );
    }
    console.log(`progresso: ${progresso.length}`);

    const tentativas = sqlite.prepare('SELECT * FROM tentativas').all();
    for (const t of tentativas) {
      await client.query(
        `INSERT INTO tentativas (id, aluno_id, tenant_id, modulo_id, atividade_id, atividade_key, skill, erros, tempo_ms, concluiu, criado_em)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [t.id, t.aluno_id, t.tenant_id, t.modulo_id, t.atividade_id, t.atividade_key, t.skill, t.erros, t.tempo_ms, t.concluiu, t.criado_em]
      );
    }
    console.log(`tentativas: ${tentativas.length}`);

    // Realinha as sequences das colunas identity para continuarem depois do maior id importado.
    for (const tbl of ['tenants', 'professores', 'alunos', 'progresso', 'tentativas']) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${tbl}', 'id'), COALESCE((SELECT MAX(id) FROM ${tbl}), 1))`
      );
    }

    await client.query('COMMIT');
    console.log('Migração concluída.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Falhou, nada foi gravado:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}

main();
