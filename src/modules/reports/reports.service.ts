import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';

/**
 * Builds the LAT National report data — the exact shape the report layout
 * consumes — entirely from the MAIN tables (omr_student_response,
 * omr_question_master, student_master, school_master, region_master).
 * No persistent summary tables are used.
 *
 * Performance: at ~16M responses, returning per-student rows to Node is far
 * too slow, so all aggregation is done in SQL. A per-student totals table is
 * built once (single scan over responses) into a session TEMPORARY table on a
 * dedicated connection, then grouped cheaply for the overall / grade / school
 * figures. The competency breakdown is a second grouped scan (it needs the
 * question join). Expect several minutes per generation on the remote DB —
 * concurrent identical requests are deduplicated onto one in-flight build so
 * repeated Refresh clicks cannot stack scans.
 *
 * Only submitted responses (omr_student_response.status = 1) are scored;
 * grades, subjects, competencies, regions and scores all come from the DB,
 * scoped to the assessment the questions belong to (assessment_id).
 */
@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  private readonly logger = new Logger(ReportsService.name);

  /** In-flight builds keyed by assessment/date so parallel requests share one scan. */
  private readonly inflight = new Map<string, Promise<any>>();

  // ── Last-generated report cache ──────────────────────────────────────────
  // The report is served from the last generated snapshot until the user
  // explicitly asks for a refresh (?refresh=1). Persisted to disk so it
  // survives backend restarts (a build takes ~10 minutes).
  private readonly cacheDir = join(process.cwd(), 'cache');

  private cachePath(key: string): string {
    return join(this.cacheDir, `report_${key.replace(/[^\w-]+/g, '_').toLowerCase()}.json`);
  }
  private readCache(key: string): any | null {
    try {
      const p = this.cachePath(key);
      if (!fs.existsSync(p)) return null;
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e: any) {
      this.logger.warn(`Report cache read failed: ${e?.message}`);
      return null;
    }
  }
  private writeCache(key: string, data: any): void {
    try {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      fs.writeFileSync(this.cachePath(key), JSON.stringify(data));
    } catch (e: any) {
      this.logger.warn(`Report cache write failed: ${e?.message}`);
    }
  }

  private q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.dataSource.query(sql, params);
  }
  private static n(v: any): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }
  private static r1(v: any): number {
    return Math.round(ReportsService.n(v) * 10) / 10;
  }
  /** '2026-07-08' → '8th July, 2026' */
  private static ordinalDate(iso: string): string {
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return '';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const suffix = d % 100 >= 11 && d % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[d % 10] ?? 'th';
    return `${d}${suffix} ${months[m - 1]}, ${y}`;
  }

  private static romanToInt(s: string): number {
    const m: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
    const str = String(s || '').toUpperCase().trim();
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    let total = 0;
    for (let i = 0; i < str.length; i++) {
      const cur = m[str[i]] ?? 0;
      const next = m[str[i + 1]] ?? 0;
      total += cur < next ? -cur : cur;
    }
    return total || 0;
  }

  /**
   * Resolves which assessment the report is for: by name against
   * assessment_master first, else the assessment the scored questions belong
   * to (omr_question_master.assessment_id), preferring the latest start date.
   * exam_start_date is a DATE column — cast to CHAR to avoid timezone shifts.
   */
  private async resolveAssessment(assessment: string): Promise<{ id: number; name: string; startDate: string | null } | null> {
    const norm = (x: any) => String(x ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    const rows = await this.q(
      `SELECT a.assessment_id AS id, a.assessment_name AS name, CAST(a.exam_start_date AS CHAR) AS startDate,
              EXISTS(SELECT 1 FROM omr_question_master q WHERE q.assessment_id = a.assessment_id AND q.status = 1) AS hasQuestions
         FROM assessment_master a
        WHERE a.status = 1
        ORDER BY a.exam_start_date IS NULL, a.exam_start_date DESC`,
    );
    // Prefer a name match only if that assessment actually has questions —
    // otherwise fall back to the assessment the scored data belongs to.
    const byName = rows.find((r: any) => norm(r.name) === norm(assessment) && Number(r.hasQuestions) === 1);
    const byQuestions = rows.find((r: any) => Number(r.hasQuestions) === 1);
    const hit = byName ?? byQuestions ?? null;
    return hit ? { id: Number(hit.id), name: hit.name, startDate: hit.startDate ?? null } : null;
  }

  async getNationalReport(assessment: string, testDate?: string, opts: { refresh?: boolean } = {}) {
    // Key the snapshot by the resolved assessment id — not the free-typed
    // inputs — so retyping the name/date can never trigger a silent rebuild.
    const assess = await this.resolveAssessment(assessment);
    const key = `assessment_${assess?.id ?? 'none'}`;

    // Serve the last generated snapshot unless an explicit refresh is asked.
    if (!opts.refresh) {
      const cached = this.readCache(key);
      if (cached) return cached;
    }

    const existing = this.inflight.get(key);
    if (existing) return existing;
    const build = this.buildNationalReport(assessment, testDate)
      .then((data) => {
        this.writeCache(key, data);
        return data;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, build);
    return build;
  }

  private async buildNationalReport(assessment: string, testDate?: string) {
    const r1 = ReportsService.r1;
    const n = ReportsService.n;

    // ── Reference data ──────────────────────────────────────────────────────
    const gradeRows = await this.q(
      `SELECT grade_id, grade_name FROM grade_master WHERE status = 1 ORDER BY priority, grade_id`,
    );
    const grades = gradeRows.map((g: any) => {
      const number = ReportsService.romanToInt(g.grade_name);
      const gn = String(g.grade_name || '');
      return { id: Number(g.grade_id), number, name: /grade/i.test(gn) ? gn : `Grade ${number || gn}` };
    });
    const subjectMap = await this.q(
      `SELECT m.grade_id, s.subject_id, s.subject_name
         FROM subject_grade_mapping m
         JOIN subject_master s ON s.subject_id = m.subject_id
        WHERE m.status = 1 AND s.status = 1
        ORDER BY m.grade_id, s.priority, s.subject_id`,
    );
    const [regionCountRow] = await this.q(`SELECT COUNT(*) AS c FROM region_master WHERE status = 1`);

    const assess = await this.resolveAssessment(assessment);
    const aid = assess?.id ?? 0;
    const examDate = assess?.startDate ? ReportsService.ordinalDate(assess.startDate) : '';

    // ── Live aggregation from the main tables ───────────────────────────────
    // One heavy scan builds per-student totals into a session TEMPORARY table
    // (dedicated connection — temp tables are per-connection in MySQL), which
    // the overall / grade / school figures then group cheaply. The competency
    // breakdown is a second grouped scan. Takes minutes on ~16M responses.
    let overallRows: any[], gradeRegionRows: any[], schoolGradeRows: any[], compRows: any[], subjMMRows: any[];
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      const rq = <T = any>(sql: string, params: any[] = []): Promise<T[]> => runner.query(sql, params);
      await rq(`DROP TEMPORARY TABLE IF EXISTS tmp_student_scores`);
      await rq(
        `CREATE TEMPORARY TABLE tmp_student_scores AS
         SELECT st.student_id, st.grade_id, sc.region_id, rg.region_name,
                st.udise_code, sc.school_name,
                SUM(r.is_correct)                            AS correct,
                COUNT(*)                                     AS total,
                ROUND(SUM(r.is_correct) / COUNT(*) * 100, 2) AS pct
           FROM omr_student_response r
           JOIN omr_question_master q ON q.id = r.question_id AND q.status = 1 AND q.assessment_id = ?
           JOIN student_master st     ON st.student_id = r.student_id
           JOIN school_master sc      ON sc.udise_code = st.udise_code
           JOIN region_master rg      ON rg.region_id = sc.region_id
          WHERE r.status = 1
          GROUP BY st.student_id, st.grade_id, sc.region_id, rg.region_name, st.udise_code, sc.school_name`,
        [aid],
      );
      overallRows = await rq(
        `SELECT region_id AS regionId, region_name AS regionName,
                ROUND(AVG(pct), 1) AS avgPct, COUNT(*) AS students,
                ROUND(MAX(pct), 1) AS hi, ROUND(MIN(pct), 1) AS lo
           FROM tmp_student_scores GROUP BY region_id, region_name`,
      );
      gradeRegionRows = await rq(
        `SELECT grade_id AS gradeId, region_id AS regionId, region_name AS regionName,
                ROUND(AVG(pct), 1) AS avgPct, COUNT(*) AS students,
                ROUND(MAX(pct), 1) AS hi, ROUND(MIN(pct), 1) AS lo
           FROM tmp_student_scores GROUP BY grade_id, region_id, region_name`,
      );
      schoolGradeRows = await rq(
        `SELECT udise_code AS udise, school_name AS schoolName, region_name AS regionName,
                grade_id AS gradeId, SUM(correct) AS correct, SUM(total) AS total
           FROM tmp_student_scores GROUP BY udise_code, school_name, region_name, grade_id`,
      );
      // Region × competency needs the question join, so it is its own scan.
      compRows = await rq(
        `SELECT rg.region_name AS regionName, q.grade_id AS gradeId, q.subject_id AS subjectId,
                sub.subject_name AS subjectName, q.competency_code AS code, q.ncf_competency AS description,
                COUNT(*) AS total, SUM(r.is_correct) AS correct
           FROM omr_student_response r
           JOIN omr_question_master q ON q.id = r.question_id AND q.status = 1 AND q.assessment_id = ?
           JOIN subject_master sub    ON sub.subject_id = q.subject_id
           JOIN student_master st     ON st.student_id = r.student_id
           JOIN school_master sc      ON sc.udise_code = st.udise_code
           JOIN region_master rg      ON rg.region_id = sc.region_id
          WHERE r.status = 1
          GROUP BY rg.region_name, q.grade_id, q.subject_id, sub.subject_name, q.competency_code, q.ncf_competency`,
        [aid],
      );
      // Highest/lowest individual student score per region per subject
      // (drives the hi/lo ticks on the subject-wise region charts). Needs a
      // per-student-per-subject pass, so it is a third scan.
      await rq(`DROP TEMPORARY TABLE IF EXISTS tmp_student_subject`);
      await rq(
        `CREATE TEMPORARY TABLE tmp_student_subject AS
         SELECT st.student_id, q.grade_id, q.subject_id, rg.region_name,
                ROUND(SUM(r.is_correct) / COUNT(*) * 100, 2) AS pct
           FROM omr_student_response r
           JOIN omr_question_master q ON q.id = r.question_id AND q.status = 1 AND q.assessment_id = ?
           JOIN student_master st     ON st.student_id = r.student_id
           JOIN school_master sc      ON sc.udise_code = st.udise_code
           JOIN region_master rg      ON rg.region_id = sc.region_id
          WHERE r.status = 1
          GROUP BY st.student_id, q.grade_id, q.subject_id, rg.region_name`,
        [aid],
      );
      subjMMRows = await rq(
        `SELECT grade_id AS gradeId, subject_id AS subjectId, region_name AS regionName,
                ROUND(MAX(pct), 1) AS hi, ROUND(MIN(pct), 1) AS lo
           FROM tmp_student_subject GROUP BY grade_id, subject_id, region_name`,
      );
    } finally {
      await runner.release(); // drops the session temp tables with the connection
    }
    const annexRows = await this.q(
      `SELECT q.grade_id AS gradeId, q.subject_id AS subjectId, sub.subject_name AS subjectName,
              q.competency_code AS code, q.ncf_competency AS description,
              COUNT(*) AS numQuestions, MIN(q.item_number) AS ord
         FROM omr_question_master q
         JOIN subject_master sub ON sub.subject_id = q.subject_id
        WHERE q.status = 1 AND q.assessment_id = ?
        GROUP BY q.grade_id, q.subject_id, sub.subject_name, q.competency_code, q.ncf_competency
        ORDER BY q.grade_id, sub.subject_name, ord`, [aid],
    );

    // ── 1. Overall region ranking (all grades combined) ─────────────────────
    const overallRegions = overallRows
      .map((e) => ({ regionName: e.regionName, students: n(e.students), avgPct: r1(e.avgPct), hi: r1(e.hi), lo: r1(e.lo) }))
      .sort((a, b) => b.avgPct - a.avgPct)
      .map((r, i) => ({ rank: i + 1, ...r }));
    const nationalAvgPct = overallRegions.length
      ? r1(overallRegions.reduce((s, r) => s + r.avgPct, 0) / overallRegions.length)
      : 0;
    const totalStudents = overallRegions.reduce((s, r) => s + r.students, 0);
    const schools = new Set(schoolGradeRows.map((r) => String(r.udise))).size;

    // ── 2. Per-grade structure ──────────────────────────────────────────────
    const gradesOut = grades
      .filter((g) => gradeRegionRows.some((r) => Number(r.gradeId) === g.id))
      .map((g) => {
        const gid = g.id;
        const regionRanking = gradeRegionRows
          .filter((r) => Number(r.gradeId) === gid)
          .map((e) => ({ regionName: e.regionName, students: n(e.students), avgPct: r1(e.avgPct), hi: r1(e.hi), lo: r1(e.lo) }))
          .sort((a, b) => b.avgPct - a.avgPct)
          .map((r, i) => ({ rank: i + 1, ...r }));
        const students = regionRanking.reduce((s, r) => s + r.students, 0);
        const gradeNationalAvg = regionRanking.length
          ? r1(regionRanking.reduce((s, r) => s + r.avgPct, 0) / regionRanking.length)
          : 0;

        const mappedSubjects = subjectMap.filter((s: any) => Number(s.grade_id) === gid);
        const subjectsOut = mappedSubjects
          .filter((sm: any) => compRows.some((r) => Number(r.gradeId) === gid && Number(r.subjectId) === Number(sm.subject_id)))
          .map((sm: any) => {
            const sid = Number(sm.subject_id);
            const subjRows = compRows.filter((r) => Number(r.gradeId) === gid && Number(r.subjectId) === sid);

            const rAgg = new Map<string, { regionName: string; total: number; correct: number }>();
            for (const row of subjRows) {
              const e = rAgg.get(row.regionName) ?? { regionName: row.regionName, total: 0, correct: 0 };
              e.total += n(row.total);
              e.correct += n(row.correct);
              rAgg.set(row.regionName, e);
            }
            const subjRegionRanking = [...rAgg.values()]
              .map((x) => {
                const mm = subjMMRows.find(
                  (m: any) => Number(m.gradeId) === gid && Number(m.subjectId) === sid && m.regionName === x.regionName,
                );
                return {
                  regionName: x.regionName,
                  avgPct: x.total > 0 ? r1((x.correct / x.total) * 100) : 0,
                  hi: mm ? r1(mm.hi) : undefined,
                  lo: mm ? r1(mm.lo) : undefined,
                };
              })
              .sort((a, b) => b.avgPct - a.avgPct)
              .map((x, i) => ({ rank: i + 1, ...x }));
            const subjTotal = [...rAgg.values()].reduce((s, x) => s + x.total, 0);
            const subjCorrect = [...rAgg.values()].reduce((s, x) => s + x.correct, 0);
            const subjNationalAvg = subjTotal > 0 ? r1((subjCorrect / subjTotal) * 100) : 0;

            const orderRows = annexRows
              .filter((a) => Number(a.gradeId) === gid && Number(a.subjectId) === sid)
              .sort((a, b) => n(a.ord) - n(b.ord));
            const seen = new Set<string>();
            const codeOrder = orderRows.map((a) => a.code).filter((c: string) => (seen.has(c) ? false : seen.add(c)));

            const competencies = codeOrder.map((code: string) => {
              const cRows = subjRows.filter((r) => r.code === code);
              const description = cRows[0]?.description ?? code;
              const perRegion = cRows
                .map((r) => ({ regionName: r.regionName, avgPct: n(r.total) > 0 ? r1((n(r.correct) / n(r.total)) * 100) : 0 }))
                .sort((a, b) => b.avgPct - a.avgPct);
              const cTotal = cRows.reduce((s: number, r) => s + n(r.total), 0);
              const cCorrect = cRows.reduce((s: number, r) => s + n(r.correct), 0);
              return {
                code,
                description,
                nationalAvgPct: cTotal > 0 ? r1((cCorrect / cTotal) * 100) : 0,
                allRegions: perRegion,
                top: perRegion.slice(0, 5),
                bottom: perRegion.slice(-5).reverse(),
              };
            });

            return { subjectName: sm.subject_name, nationalAvgPct: subjNationalAvg, regionRanking: subjRegionRanking, competencies };
          });

        return {
          gradeId: gid,
          gradeName: g.name,
          gradeNumber: g.number,
          students,
          nationalAvgPct: gradeNationalAvg,
          regionRanking,
          subjects: subjectsOut,
        };
      });

    // ── Annexure structure ──────────────────────────────────────────────────
    const annexure = grades
      .filter((g) => annexRows.some((r) => Number(r.gradeId) === g.id))
      .map((g) => {
        const gRows = annexRows.filter((r) => Number(r.gradeId) === g.id);
        const mapped = subjectMap.filter((s: any) => Number(s.grade_id) === g.id);
        const subjects = mapped
          .filter((sm: any) => gRows.some((r) => Number(r.subjectId) === Number(sm.subject_id)))
          .map((sm: any) => {
            const sRows = gRows
              .filter((r) => Number(r.subjectId) === Number(sm.subject_id))
              .sort((a, b) => n(a.ord) - n(b.ord));
            return {
              subjectName: sm.subject_name,
              numQuestions: sRows.reduce((s: number, r) => s + n(r.numQuestions), 0),
              competencies: sRows.map((r) => ({ code: r.code, description: r.description })),
            };
          });
        return { gradeNumber: g.number, gradeName: g.name, subjects };
      });

    const subjectsByGrade: Record<number, string[]> = {};
    for (const s of subjectMap) {
      const gid = Number(s.grade_id);
      (subjectsByGrade[gid] ??= []).push(s.subject_name);
    }

    // ── Annexure 2: per-region school-wise performance ──────────────────────
    const schoolAgg = new Map<string, { schoolName: string; regionName: string; correct: number; total: number; byGrade: Record<number, number> }>();
    for (const row of schoolGradeRows) {
      const key = String(row.udise);
      const e = schoolAgg.get(key) ?? { schoolName: row.schoolName, regionName: row.regionName, correct: 0, total: 0, byGrade: {} };
      const t = n(row.total);
      e.correct += n(row.correct);
      e.total += t;
      e.byGrade[Number(row.gradeId)] = t > 0 ? r1((n(row.correct) / t) * 100) : 0;
      schoolAgg.set(key, e);
    }
    const schoolsByRegion: Record<string, any[]> = {};
    for (const e of schoolAgg.values()) {
      const overall = e.total > 0 ? r1((e.correct / e.total) * 100) : 0;
      (schoolsByRegion[e.regionName] ??= []).push({ schoolName: e.schoolName, overall, byGrade: e.byGrade });
    }
    for (const rn of Object.keys(schoolsByRegion)) schoolsByRegion[rn].sort((a, b) => b.overall - a.overall);

    return {
      meta: {
        // Name and date both come from the assessment the questions are
        // linked to (assessment_master via omr_question_master.assessment_id);
        // the free-text inputs are only fallbacks.
        sessionName: assess?.name?.trim() || assessment,
        sessionCode: '',
        reportDate: examDate || testDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
        generatedAt: new Date().toISOString(),
      },
      summary: {
        regions: n(regionCountRow?.c),
        regionsParticipated: overallRegions.length,
        schools,
        grades: gradesOut.map((g) => g.gradeNumber),
        totalStudents,
        studentsByGrade: Object.fromEntries(gradesOut.map((g) => [g.gradeNumber, g.students])),
        subjectsByGrade,
      },
      overall: { nationalAvgPct, regions: overallRegions },
      grades: gradesOut,
      annexure,
      schoolsByRegion,
    };
  }

  /** Region names that actually have scored students (for the region picker). */
  async getRegionNames(): Promise<string[]> {
    const rows = await this.q(`SELECT DISTINCT region_name AS rn FROM report_student_scores ORDER BY region_name`);
    return rows.map((r: any) => String(r.rn));
  }

  /**
   * Region report = the National report (Part A) + region-specific Part B:
   *  - B.1 ranking of the region's schools (regional + all-India rank)
   *  - B.2 per-school averages down to competency level and max/min scores,
   *    with the region / all-regions comparison values.
   * Region and national averages for the comparison columns are already in the
   * national structure; this adds school-level data and max/min figures from
   * the Part B summary tables (see refresh-report-part-b.js).
   */
  async getRegionReport(regionName: string, assessment: string, testDate?: string) {
    const r1 = ReportsService.r1;
    const n = ReportsService.n;
    const national = await this.getNationalReport(assessment, testDate);
    const aid = (await this.resolveAssessment(assessment))?.id ?? 0;

    const region = (await this.getRegionNames()).find((x) => x.toUpperCase() === String(regionName).toUpperCase());
    if (!region) throw new Error(`Unknown region "${regionName}"`);

    // ── B.1: school ranking (regional + all-India), from overall scores ─────
    const allSchoolRows = await this.q(
      `SELECT udise_code AS udise, school_name AS schoolName, region_name AS regionName,
              SUM(correct) AS correct, SUM(total) AS total
         FROM report_student_scores WHERE assessment_id = ? GROUP BY udise_code, school_name, region_name`, [aid],
    );
    const rankedAll = allSchoolRows
      .map((s: any) => ({ ...s, pct: n(s.total) > 0 ? (n(s.correct) / n(s.total)) * 100 : 0 }))
      .sort((a: any, b: any) => b.pct - a.pct)
      .map((s: any, i: number) => ({ ...s, allIndiaRank: i + 1 }));
    const schoolRanking = rankedAll
      .filter((s: any) => s.regionName === region)
      .map((s: any, i: number) => ({
        udise: String(s.udise),
        schoolName: s.schoolName,
        overall: r1(s.pct),
        regionalRank: i + 1,
        allIndiaRank: s.allIndiaRank,
      }));

    // ── Per-student rows (region) for overall max/min per school+grade ──────
    const studentRows = await this.q(
      `SELECT udise_code AS udise, grade_id AS gradeId, pct
         FROM report_student_scores WHERE assessment_id = ? AND region_name = ?`, [aid, region],
    );
    const subjStudentRows = await this.q(
      `SELECT udise_code AS udise, grade_id AS gradeId, subject_name AS subjectName, pct
         FROM report_student_subject_scores WHERE assessment_id = ? AND region_name = ?`, [aid, region],
    );
    // National max/min per grade (overall) and per grade+subject.
    const natGradeMM = await this.q(
      `SELECT grade_id AS gradeId, MAX(pct) AS mx, MIN(pct) AS mn
         FROM report_student_scores WHERE assessment_id = ? GROUP BY grade_id`, [aid],
    );
    const natSubjMM = await this.q(
      `SELECT grade_id AS gradeId, subject_name AS subjectName, MAX(pct) AS mx, MIN(pct) AS mn
         FROM report_student_subject_scores WHERE assessment_id = ? GROUP BY grade_id, subject_name`, [aid],
    );

    // ── School-level averages: grade overall, subject, competency ───────────
    const schoolGradeRows = await this.q(
      `SELECT udise_code AS udise, grade_id AS gradeId, SUM(correct) AS correct, SUM(total) AS total
         FROM report_student_scores WHERE assessment_id = ? AND region_name = ? GROUP BY udise_code, grade_id`, [aid, region],
    );
    const schoolCompRows = await this.q(
      `SELECT udise_code AS udise, grade_id AS gradeId, subject_name AS subjectName, code,
              SUM(correct) AS correct, SUM(total) AS total
         FROM report_competency_school WHERE assessment_id = ? AND region_name = ?
        GROUP BY udise_code, grade_id, subject_name, code`, [aid, region],
    );

    // ── Assemble per-school detail (max/min computed in JS from row sets) ───
    type MM = { max: number; maxN: number; min: number; minN: number };
    const mmOf = (pcts: number[]): MM | null => {
      if (!pcts.length) return null;
      const max = Math.max(...pcts), min = Math.min(...pcts);
      return {
        max: r1(max), maxN: pcts.filter((p) => p === max).length,
        min: r1(min), minN: pcts.filter((p) => p === min).length,
      };
    };
    const byKey = <T,>(rows: T[], key: (r: T) => string) => {
      const m = new Map<string, T[]>();
      for (const row of rows) {
        const k = key(row);
        (m.get(k) ?? m.set(k, []).get(k)!).push(row);
      }
      return m;
    };
    const stuBySchoolGrade = byKey(studentRows, (r: any) => `${r.udise}|${r.gradeId}`);
    const subjBySchoolGradeSubj = byKey(subjStudentRows, (r: any) => `${r.udise}|${r.gradeId}|${r.subjectName}`);
    const regionGradePcts = byKey(studentRows, (r: any) => String(r.gradeId));
    const regionSubjPcts = byKey(subjStudentRows, (r: any) => `${r.gradeId}|${r.subjectName}`);

    const schools = schoolRanking.map((rank) => {
      const byGrade: Record<number, any> = {};
      for (const g of national.grades) {
        const gid = g.gradeId;
        const sg = schoolGradeRows.find((x: any) => String(x.udise) === rank.udise && Number(x.gradeId) === gid);
        if (!sg || n(sg.total) === 0) continue; // grade with no data → "No data received"
        const overall = r1((n(sg.correct) / n(sg.total)) * 100);
        const overallMM = mmOf((stuBySchoolGrade.get(`${rank.udise}|${gid}`) ?? []).map((x: any) => n(x.pct)));

        const subjects: Record<string, any> = {};
        for (const subj of g.subjects) {
          const comps = schoolCompRows.filter(
            (x: any) => String(x.udise) === rank.udise && Number(x.gradeId) === gid && x.subjectName === subj.subjectName,
          );
          if (!comps.length) continue;
          const sTotal = comps.reduce((s: number, x: any) => s + n(x.total), 0);
          const sCorrect = comps.reduce((s: number, x: any) => s + n(x.correct), 0);
          subjects[subj.subjectName] = {
            pct: sTotal > 0 ? r1((sCorrect / sTotal) * 100) : 0,
            mm: mmOf((subjBySchoolGradeSubj.get(`${rank.udise}|${gid}|${subj.subjectName}`) ?? []).map((x: any) => n(x.pct))),
            competencies: Object.fromEntries(
              comps.map((x: any) => [x.code, n(x.total) > 0 ? r1((n(x.correct) / n(x.total)) * 100) : 0]),
            ),
          };
        }
        byGrade[gid] = { overall, mm: overallMM, subjects };
      }
      const missingGrades = national.grades.filter((g: any) => !byGrade[g.gradeId]).map((g: any) => g.gradeName);
      return { ...rank, byGrade, missingGrades };
    });

    // ── Region / national max-min comparison values ─────────────────────────
    const regionMM: Record<number, any> = {};
    const nationalMM: Record<number, any> = {};
    for (const g of national.grades) {
      const gid = g.gradeId;
      const rOverall = mmOf((regionGradePcts.get(String(gid)) ?? []).map((x: any) => n(x.pct)));
      const nRow = natGradeMM.find((x: any) => Number(x.gradeId) === gid);
      const rSubjects: Record<string, any> = {};
      const nSubjects: Record<string, any> = {};
      for (const subj of g.subjects) {
        rSubjects[subj.subjectName] = mmOf((regionSubjPcts.get(`${gid}|${subj.subjectName}`) ?? []).map((x: any) => n(x.pct)));
        const nsRow = natSubjMM.find((x: any) => Number(x.gradeId) === gid && x.subjectName === subj.subjectName);
        nSubjects[subj.subjectName] = nsRow ? { max: r1(nsRow.mx), min: r1(nsRow.mn) } : null;
      }
      regionMM[gid] = { overall: rOverall, subjects: rSubjects };
      nationalMM[gid] = { overall: nRow ? { max: r1(nRow.mx), min: r1(nRow.mn) } : null, subjects: nSubjects };
    }

    // Region participation summary for the B.1 analysis table.
    const studentsByGrade: Record<number, number> = {};
    for (const g of national.grades) studentsByGrade[g.gradeNumber] = (regionGradePcts.get(String(g.gradeId)) ?? []).length;

    return {
      ...national,
      region: {
        regionName: region,
        schools: schoolRanking.length,
        studentsByGrade,
        schoolRanking,
        schoolDetails: schools,
        regionMM,
        nationalMM,
      },
    };
  }
}
