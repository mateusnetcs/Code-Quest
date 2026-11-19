# Code Quest BNCC

Jogo educativo de inclusão digital (alinhado à BNCC Computação) + painel do
professor + emissão/verificação de certificados, do projeto de extensão
**Code Quest BNCC** (PIBEXT / UEMASUL).

## Partes do site

- `jogo.html` — o jogo. Login só com nome (cadastrado antes pelo professor) +
  código da oficina.
- `professor.html` — painel do professor: cadastro de alunos, oficinas/turmas,
  rankings de erro, tempos e habilidades BNCC mais impactadas.
- `index.html` — emissor de certificados (lista fixa dos participantes, gera o
  certificado com QR Code de autenticação).
- `verificar.html` — destino do QR Code; confere se um certificado foi
  realmente emitido, consultando `dados-certificados.json`.
- `relatorios/` — Diário da Expedição: análise dos registros reais do jogo
  (Turma01, Turma02 e o comparativo entre as duas).

## Backend

`api/` — Vercel Serverless Functions em Node.js (mesmas rotas que antes eram
PHP: `/api/aluno/...`, `/api/professor/...`, `/api/me`). Banco de dados:
Postgres no [Supabase](https://supabase.com). Login de aluno e de professor
usa um cookie de sessão assinado (JWT), `httpOnly`.

A API usada é a REST do Supabase (PostgREST), não uma conexão direta ao
Postgres — por isso não precisa da senha do banco, só da `secret key` do
projeto. Consultas com `GROUP BY`/`SUM` (rankings, dashboard) passam por
funções RPC já definidas em `supabase/schema.sql` (`POST /rest/v1/rpc/...`).

### Variáveis de ambiente (Vercel → Project Settings → Environment Variables)

| Nome | De onde vem |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API → **secret key** (`sb_secret_...`) — nunca no frontend |
| `SESSION_SECRET` | Uma string aleatória longa, só sua (ex: `openssl rand -base64 48`) |

### Primeiro deploy

1. Crie um projeto no [Supabase](https://supabase.com).
2. No **SQL Editor** do Supabase, rode o conteúdo de `supabase/schema.sql`
   (cria as tabelas, as funções RPC dos relatórios e já deixa um professor
   padrão: usuário `professor`, senha `professor123` — troque depois do
   primeiro login).
3. No Vercel, importe este repositório e configure as variáveis de ambiente
   acima.
4. (Opcional) Se você já tem dados reais num `api/data/codequest.sqlite`
   local, migre-os para o Supabase antes do deploy:
   ```bash
   npm install
   SUPABASE_URL="https://xxxxx.supabase.co" SUPABASE_SECRET_KEY="sb_secret_..." npm run migrate
   ```
   O script lê o SQLite local e grava no Supabase preservando os IDs
   (`scripts/migrate-to-supabase.js`). Não precisa rodar de novo em deploys
   seguintes.

### Rodando local

```bash
npm install
vercel dev
```

(`vercel dev` serve o site estático e as funções de `api/` juntos, no mesmo
endereço — é exatamente isso que `jogo.html`/`professor.html` esperam, já que
chamam a API em `/api/...` relativo à própria origem.)

## Segurança

O Supabase expõe, por padrão, uma API REST pública (PostgREST). As tabelas em
`supabase/schema.sql` já sobem com Row Level Security ligado e **nenhuma
policy** — ou seja, a chave pública (`publishable`/`anon`) do Supabase não
enxerga nada dessas tabelas. Só quem usa a `secret key` (as funções em `api/`,
nunca o navegador) consegue ler e escrever.
