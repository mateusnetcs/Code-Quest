const { db } = require('../../lib/db');
const { cors, ok } = require('../../lib/http');
const { requireProfessor } = require('../../lib/auth');

/** GET — habilidades prejudicadas, com módulo e atividade */
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const auth = requireProfessor(req, res);
  if (!auth) return;

  const tid = auth.tenant_id;
  const pdo = db();

  const { rows: porSkillRaw } = await pdo.query(
    `SELECT CASE WHEN skill IS NULL OR skill = '' THEN '(sem skill)' ELSE skill END AS skill,
            COALESCE(SUM(erros),0) AS erros,
            COUNT(*) AS tentativas,
            COALESCE(SUM(tempo_ms),0) AS tempo_ms
     FROM tentativas
     WHERE tenant_id = $1
     GROUP BY skill
     ORDER BY erros DESC, tentativas DESC`,
    [tid]
  );
  const porSkill = porSkillRaw.map((r) => ({
    skill: r.skill,
    erros: Number(r.erros),
    tentativas: Number(r.tentativas),
    tempo_ms: Number(r.tempo_ms),
  }));

  const { rows: detalheRaw } = await pdo.query(
    `SELECT CASE WHEN skill IS NULL OR skill = '' THEN '(sem skill)' ELSE skill END AS skill,
            modulo_id,
            atividade_id,
            atividade_key,
            COALESCE(SUM(erros),0) AS erros,
            COUNT(*) AS tentativas,
            COALESCE(SUM(tempo_ms),0) AS tempo_ms
     FROM tentativas
     WHERE tenant_id = $1
     GROUP BY skill, modulo_id, atividade_id, atividade_key
     ORDER BY erros DESC, tentativas DESC, atividade_key`,
    [tid]
  );
  const detalhe = detalheRaw.map((r) => ({
    skill: r.skill,
    modulo_id: Number(r.modulo_id),
    atividade_id: Number(r.atividade_id),
    atividade_key: r.atividade_key,
    erros: Number(r.erros),
    tentativas: Number(r.tentativas),
    tempo_ms: Number(r.tempo_ms),
  }));

  ok(res, {
    habilidade_mais_prejudicada: porSkill[0] || null,
    habilidades: porSkill,
    detalhe,
  });
};
