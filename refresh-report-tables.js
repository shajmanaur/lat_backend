/**
 * Rebuilds ALL report summary tables, scoped by assessment:
 *   - report_student_scores          (per student overall, per assessment)
 *   - report_competency_region       (region × competency, per assessment)
 *   - report_student_subject_scores  (per student per subject, per assessment)
 *   - report_competency_school       (school × competency, per assessment)
 *
 * Every table carries assessment_id (from omr_question_master.assessment_id),
 * so multiple assessments can coexist and the report endpoints filter on it.
 *
 * Attribution chain: response → question (assessment/grade/subject/competency)
 *                    response → student → school → region.
 * Only submitted responses (status = 1) and active questions are scored.
 *
 * Tables are built under a __new suffix and swapped in at the end, so the
 * running report endpoints keep working while this script runs.
 * Supersedes refresh-report-part-b.js.
 *
 * Usage: node refresh-report-tables.js
 */
const fs = require('fs');
const mysql = require('./node_modules/mysql2/promise');

const env = Object.fromEntries(
  fs.readFileSync(__dirname + '/.env', 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const SRC = `
      FROM omr_student_response r
      JOIN omr_question_master q  ON q.id = r.question_id AND q.status = 1
      JOIN student_master st      ON st.student_id = r.student_id
      JOIN school_master sc       ON sc.udise_code = st.udise_code
      JOIN region_master rg       ON rg.region_id = sc.region_id
      JOIN subject_master sub     ON sub.subject_id = q.subject_id
     WHERE r.status = 1`;

const BUILDS = [
  {
    name: 'report_student_scores',
    sql: `SELECT q.assessment_id, st.student_id, st.grade_id, sc.region_id, rg.region_name,
                 st.udise_code, sc.school_name,
                 SUM(r.is_correct)                            AS correct,
                 COUNT(*)                                     AS total,
                 ROUND(SUM(r.is_correct) / COUNT(*) * 100, 2) AS pct
            ${SRC}
           GROUP BY q.assessment_id, st.student_id, st.grade_id, sc.region_id, rg.region_name,
                    st.udise_code, sc.school_name`,
    indexes: ['ADD INDEX idx_assess_region (assessment_id, region_name)', 'ADD INDEX idx_school (udise_code)'],
  },
  {
    name: 'report_competency_region',
    sql: `SELECT q.assessment_id, sc.region_id, rg.region_name, q.grade_id, q.subject_id, sub.subject_name,
                 q.competency_code AS code, q.ncf_competency AS description,
                 COUNT(*)          AS total,
                 SUM(r.is_correct) AS correct
            ${SRC}
           GROUP BY q.assessment_id, sc.region_id, rg.region_name, q.grade_id, q.subject_id, sub.subject_name,
                    q.competency_code, q.ncf_competency`,
    indexes: ['ADD INDEX idx_assess (assessment_id)'],
  },
  {
    name: 'report_student_subject_scores',
    sql: `SELECT q.assessment_id, st.student_id, st.grade_id, sc.region_id, rg.region_name,
                 st.udise_code, sc.school_name, q.subject_id, sub.subject_name,
                 SUM(r.is_correct)                            AS correct,
                 COUNT(*)                                     AS total,
                 ROUND(SUM(r.is_correct) / COUNT(*) * 100, 2) AS pct
            ${SRC}
           GROUP BY q.assessment_id, st.student_id, st.grade_id, sc.region_id, rg.region_name,
                    st.udise_code, sc.school_name, q.subject_id, sub.subject_name`,
    indexes: ['ADD INDEX idx_assess_region (assessment_id, region_name)', 'ADD INDEX idx_school (udise_code)'],
  },
  {
    name: 'report_competency_school',
    sql: `SELECT q.assessment_id, sc.region_id, rg.region_name, st.udise_code, sc.school_name,
                 q.grade_id, q.subject_id, sub.subject_name,
                 q.competency_code AS code, q.ncf_competency AS description,
                 COUNT(*)          AS total,
                 SUM(r.is_correct) AS correct
            ${SRC}
           GROUP BY q.assessment_id, sc.region_id, rg.region_name, st.udise_code, sc.school_name,
                    q.grade_id, q.subject_id, sub.subject_name, q.competency_code, q.ncf_competency`,
    indexes: ['ADD INDEX idx_assess_region (assessment_id, region_name)', 'ADD INDEX idx_school (udise_code)'],
  },
];

(async () => {
  const conn = await mysql.createConnection({
    host: env.TYPEORM_DB_HOST,
    port: +env.TYPEORM_DB_PORT || 3306,
    user: env.TYPEORM_DB_USERNAME,
    password: env.TYPEORM_DB_PASSWORD,
    database: env.TYPEORM_DB_DATABASE,
  });
  const run = async (label, sql) => {
    const t0 = Date.now();
    await conn.query(sql);
    console.log(`  ${label} — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  };

  for (const b of BUILDS) {
    console.log(`Building ${b.name} …`);
    await run('drop stale __new', `DROP TABLE IF EXISTS \`${b.name}__new\``);
    await run('create+fill', `CREATE TABLE \`${b.name}__new\` AS ${b.sql}`);
    await run('index', `ALTER TABLE \`${b.name}__new\` ${b.indexes.join(', ')}`);
  }

  // Atomic-ish swap at the very end: report endpoints only see complete tables.
  console.log('Swapping in new tables …');
  for (const b of BUILDS) {
    await run(`swap ${b.name}`, `DROP TABLE IF EXISTS \`${b.name}\``);
    await run(`rename ${b.name}`, `RENAME TABLE \`${b.name}__new\` TO \`${b.name}\``);
  }

  for (const b of BUILDS) {
    const [[{ c }]] = await conn.query(`SELECT COUNT(*) c FROM \`${b.name}\``);
    console.log(`${b.name}: ${c} rows`);
  }
  await conn.end();
  console.log('Done.');
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
