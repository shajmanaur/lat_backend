import { columnChartSvg, categoryBarChartSvg } from './chart.util';
import { attainmentPanelSvg, schoolPerfChart, AttainmentRow } from './annexure.util';

/**
 * Builds the print HTML for the National report BODY (between the reused cover
 * and back pages). Ported from the reference national-report page so the
 * layout, sections and narratives match. Every number and every narrative
 * sentence is derived from the `report` object (ReportsService.getNationalReport)
 * — nothing is hard-coded.
 */

export const r1 = (x: number) => (Math.round((Number(x) || 0) * 10) / 10).toFixed(1);
export function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string),
  );
}
const SUBJ_LETTER = ['C', 'D', 'E', 'F', 'G', 'H', 'I'];

/** "A, B and C" — natural-language list (last item joined with "and"). */
export function andJoin(items: any[]): string {
  const arr = (items ?? []).map(String).filter(Boolean);
  if (arr.length <= 1) return arr.join('');
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
}

// Subject colour map for the Annexure 1 attainment bars (ported from reference).
const SUBJ_COLOR: Record<string, string> = {
  English: '#5b9bd5', Hindi: '#ed9b6b', Mathematics: '#82c341', Maths: '#82c341', MATHS: '#82c341',
  'Environmental Studies (EVS)': '#f2c40d', EVS: '#f2c40d', TWAU: '#26b3a6',
  Science: '#e05b4f', 'Social Science': '#9b7fc7', Sanskrit: '#e879b0', SANSKRIT: '#e879b0',
};
// Short subject labels for the compact Annexure 1 rows (match the target PDF).
const SUBJ_ABBR: Record<string, string> = {
  'Social Science': 'SSt', MATHS: 'Maths', Mathematics: 'Maths', SANSKRIT: 'Sanskrit',
  'Environmental Studies (EVS)': 'EVS',
};
const abbrSubject = (s: string) => SUBJ_ABBR[s] ?? s;

/* Annexure 1: attainment rows for one region (null = All Regions / national). */
function attainmentRows(report: any, regionName: string | null): AttainmentRow[] {
  const val = (arr: any[]) => (regionName ? arr.find((x: any) => x.regionName === regionName)?.avgPct ?? 0 : null);
  const rows: AttainmentRow[] = [];
  rows.push({
    label: `Overall Average (${report.grades.map((g: any) => g.gradeNumber).join(',')})`,
    value: regionName ? val(report.overall.regions) ?? 0 : report.overall.nationalAvgPct,
    color: '#1f2937', bold: true,
  });
  for (const g of report.grades) {
    const gp = `G${g.gradeNumber}`;
    rows.push({ label: `${gp}_Overall`, value: regionName ? val(g.regionRanking) ?? 0 : g.nationalAvgPct, color: '#3d5266', bold: true });
    for (const subj of g.subjects) {
      const col = SUBJ_COLOR[subj.subjectName] ?? '#8aa0b5';
      const sub = abbrSubject(subj.subjectName);
      rows.push({ label: `${gp}_${sub}`, value: regionName ? val(subj.regionRanking) ?? 0 : subj.nationalAvgPct, color: col, bold: true });
      for (const c of subj.competencies) {
        rows.push({ label: `${gp}_${sub}_${c.code}`, value: regionName ? val(c.allRegions ?? []) ?? 0 : c.nationalAvgPct, color: col });
      }
    }
  }
  return rows;
}

/* ── Code-generated narratives (ported verbatim from the reference) ── */
export function overallNarrative(regions: any[], nationalAvg: number): string {
  if (!regions.length) return '';
  const top = regions[0];
  const bottom = regions[regions.length - 1];
  const top3 = regions.slice(0, 3).map((r) => r.regionName).join(', ');
  const gap = r1(top.avgPct - bottom.avgPct);
  return `${top.regionName} has emerged as the top-performing region in LAT this year with an average score of ${r1(top.avgPct)}%. The national average across ${regions.length} participating regions is ${r1(nationalAvg)}%. The top-performing regions — ${top3} — represent a geographically diverse spread across India, indicating that high academic performance is not confined to any particular zone. The performance gap between the highest and lowest scoring regions stands at ${gap} percentage points.`;
}
export function gradeNarrative(g: any, prevGrade: any): string {
  const top3 = g.regionRanking.slice(0, 3).map((r: any) => r.regionName).join(', ');
  let trend = '';
  if (prevGrade) {
    const diff = r1(Math.abs(g.nationalAvgPct - prevGrade.nationalAvgPct));
    trend =
      g.nationalAvgPct < prevGrade.nationalAvgPct
        ? ` This represents a decline of ${diff} percentage points compared to ${prevGrade.gradeName} (${r1(prevGrade.nationalAvgPct)}%), suggesting increasing academic challenges as students progress.`
        : ` This is ${diff} percentage points higher than ${prevGrade.gradeName}.`;
  }
  return `${g.gradeName} overall scores stand at ${r1(g.nationalAvgPct)}%, with ${g.students.toLocaleString('en-IN')} students participating across all regions.${trend} Regions like ${top3} demonstrate strong performance, reflecting consistent educational quality.`;
}
export function subjectNarrative(subj: any, gradeAvg: number): string {
  const top = subj.regionRanking[0];
  const diff = r1(Math.abs(subj.nationalAvgPct - gradeAvg));
  const rel = subj.nationalAvgPct > gradeAvg ? 'slightly higher than' : subj.nationalAvgPct < gradeAvg ? 'marginally lower than' : 'on par with';
  const gap = r1((subj.regionRanking[0]?.avgPct ?? 0) - (subj.regionRanking[subj.regionRanking.length - 1]?.avgPct ?? 0));
  return `The average score for ${subj.subjectName} across all regions is ${r1(subj.nationalAvgPct)}%, which is ${rel} the overall grade average (${r1(gradeAvg)}%) by ${diff} percentage points. ${top?.regionName ?? ''} leads in ${subj.subjectName} performance. The performance gap between the highest and lowest scoring regions is ${gap} percentage points, highlighting regional variation that may benefit from targeted support.`;
}
export function subjectSpreadNarrative(g: any): string {
  const subs = [...(g.subjects ?? [])].sort((a, b) => b.nationalAvgPct - a.nationalAvgPct);
  if (!subs.length) return '';
  const hi = subs[0], lo = subs[subs.length - 1];
  const range = r1(hi.nationalAvgPct - lo.nationalAvgPct);
  return `Among the ${subs.length} subjects assessed in ${g.gradeName}, ${hi.subjectName} records the highest average score (${r1(hi.nationalAvgPct)}%) while ${lo.subjectName} records the lowest (${r1(lo.nationalAvgPct)}%). The ${Number(range) < 5 ? 'narrow' : 'notable'} range between the highest and lowest subject averages (${range} percentage points) indicates that learning outcomes are ${Number(range) < 5 ? 'fairly evenly distributed across subjects' : 'unevenly distributed, pointing to subjects that need targeted support'}.`;
}
export function competencyNarrative(comps: any[], subject: string): string {
  if (!comps.length) return '';
  const sorted = [...comps].sort((a, b) => b.nationalAvgPct - a.nationalAvgPct);
  const highest = sorted[0], lowest = sorted[sorted.length - 1];
  if (comps.length === 1) return `The national average for ${comps[0].description} is ${r1(comps[0].nationalAvgPct)}%.`;
  return `In ${subject}, students perform best in '${highest.description}' (${r1(highest.nationalAvgPct)}%) and show comparatively lower scores in '${lowest.description}' (${r1(lowest.nationalAvgPct)}%). This points to an opportunity to strengthen the lower-scoring competency through targeted classroom strategies.`;
}

/* ── Section builders ── */
function performerTable(g: any, subj: any): string {
  const rows = subj.competencies
    .map((c: any) => {
      const top = c.top.map((r: any) => `${esc(r.regionName)} <span class="mut">(${r1(r.avgPct)})</span>`).join('<br/>');
      const bottom = c.bottom.map((r: any) => `${esc(r.regionName)} <span class="mut">(${r1(r.avgPct)})</span>`).join('<br/>');
      return `<tr>
        <td class="cell-cmp"><span class="code">${esc(c.code)}</span><div class="cmpd">${esc(c.description)}</div></td>
        <td class="top">${top || '—'}</td>
        <td class="bot">${bottom || '—'}</td>
        <td class="nat">${r1(c.nationalAvgPct)}%</td>
      </tr>`;
    })
    .join('');
  return `<div class="perf">
    <div class="perf-h">${esc(g.gradeName)}: Top and Bottom Performers in ${esc(subj.subjectName)}</div>
    <table class="perf-t">
      <thead><tr><th>Competency</th><th class="thg">Top Performers</th><th class="thr">Bottom Performers</th><th>Nat. Avg</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function subjectBlock(g: any, subj: any, si: number, hl?: string): string {
  const studentsByRegion: Record<string, number> = Object.fromEntries(g.regionRanking.map((r: any) => [r.regionName, r.students]));
  const avgChart = columnChartSvg(`${g.gradeName}: ${subj.subjectName} Average Score`, subj.regionRanking.map((r: any) => ({ regionName: r.regionName, avgPct: r.avgPct, students: studentsByRegion[r.regionName], hi: r.hi, lo: r.lo })), { nationalAvg: subj.nationalAvgPct, nationalStudents: g.students, highlightRegion: hl, showMarkers: true });

  let competencyHtml = '';
  if (subj.competencies.length) {
    const compChart = categoryBarChartSvg(`${g.gradeName} ${subj.subjectName} Competency Performance`, subj.competencies.map((c: any) => ({ label: c.code, value: c.nationalAvgPct })));
    const legend = [...subj.competencies]
      .sort((a: any, b: any) => b.nationalAvgPct - a.nationalAvgPct)
      .map((c: any) => `<li><b>${esc(c.code)}:</b> ${esc(c.description)}</li>`)
      .join('');
    competencyHtml = `
      <div class="avoid">
        <p class="sub">2. Competencies Achieved (Overall)</p>
        <div class="chartbox">${compChart}</div>
        <p class="note">Note: The overall average score for each competency shown in the graph is expressed in percentage.</p>
      </div>
      <ul class="legend">${legend}</ul>
      ${performerTable(g, subj)}
      <p class="narr">${esc(competencyNarrative(subj.competencies, subj.subjectName))}</p>`;
  }

  return `<section class="card subject">
    <div class="subj-head"><span class="badge">${SUBJ_LETTER[si] ?? '•'}</span>${esc(subj.subjectName)}<span class="pct">${r1(subj.nationalAvgPct)}%</span></div>
    <div class="subj-body">
      <div class="avoid">
        <p class="sub">1. Average Score (Region-wise)</p>
        <div class="chartbox">${avgChart}</div>
        <p class="note">Note: The average scores of each region shown in the graph are represented as percentages.<br/>Numbers in brackets indicate the number of students who participated in the test.</p>
      </div>
      <p class="narr">${esc(subjectNarrative(subj, g.nationalAvgPct))}</p>
      ${competencyHtml}
    </div>
  </section>`;
}

export function gradeSection(g: any, gi: number, prevGrade: any, hl?: string): string {
  const overallChart = columnChartSvg(`Overall Average Score of ${g.gradeName}`, g.regionRanking, { nationalAvg: g.nationalAvgPct, nationalStudents: g.students, showMarkers: true, highlightRegion: hl });
  const subjectChart = categoryBarChartSvg(`${g.gradeName}: Average Scores by Subject`, g.subjects.map((s: any) => ({ label: s.subjectName, value: s.nationalAvgPct })));
  return `<div class="grade">
    <div class="grade-pill">${gi + 1}. ${esc(g.gradeName)}</div>

    <section class="card">
      <div class="avoid">
        <h4><span class="tick"></span>A. Overall Score (Region-wise)<span class="pct">${r1(g.nationalAvgPct)}%</span></h4>
        <div class="chartbox">${overallChart}</div>
        <p class="note">Note: The average scores of each region shown in the graph are represented as percentages.<br/>Numbers in brackets indicate the number of students who participated in the test.</p>
      </div>
      <p class="narr">${esc(gradeNarrative(g, prevGrade))}</p>
    </section>

    <section class="card avoid">
      <h4><span class="tick"></span>B. Average Scores by Subject</h4>
      <div class="chartbox">${subjectChart}</div>
      <p class="note">Note: The average score of each subject shown in the graph is expressed in percentage.</p>
      <p class="narr">${esc(subjectSpreadNarrative(g))}</p>
    </section>

    ${g.subjects.map((s: any, si: number) => subjectBlock(g, s, si, hl)).join('')}
  </div>`;
}

/** One renderable report section with its running-header text (empty = none). */
export interface ReportSection {
  header: string;
  html: string;
}

export function buildNationalSections(report: any): ReportSection[] {
  const assessment = report.meta?.sessionName || 'LAT';
  const s = report.summary;

  const questionTables = (report.annexure || [])
    .map((g: any) => {
      const total = g.subjects.reduce((sum: number, x: any) => sum + (Number(x.numQuestions) || 0), 0);
      const rows = g.subjects.map((x: any) => `<tr><td class="k">${esc(x.subjectName)}</td><td>${x.numQuestions}</td></tr>`).join('');
      return `<table class="grid qtab avoid">
        <colgroup><col class="c1"/><col class="c2"/></colgroup>
        <tr><td class="hdr" colspan="2">Number of Questions in ${esc(g.gradeName)}</td></tr>
        <tr><th>Subject</th><th>${esc(assessment)}</th></tr>
        ${rows}
        <tr><td class="k tot"><b>Total</b></td><td class="tot"><b>${total}</b></td></tr>
      </table>`;
    })
    .join('');

  // "Grade 3" etc. rendered with a non-breaking space so the grade number can
  // never wrap onto its own line inside the header cells.
  const nbGrade = (g: any) => esc(g.gradeName).replace(/ /g, '&nbsp;');
  const summaryTable = `
    <table class="grid">
      <tr>
        <th>Regions Participated</th><th>Schools Participated</th><th>Grades</th>
        ${report.grades.map((g: any) => `<th style="white-space:nowrap">Students (${nbGrade(g)})</th>`).join('')}
      </tr>
      <tr>
        <td>${s.regionsParticipated}</td>
        <td>${Number(s.schools).toLocaleString('en-IN')}</td>
        <td style="white-space:nowrap">${esc(andJoin(s.grades || []))}</td>
        ${report.grades.map((g: any) => `<td>${Number(g.students).toLocaleString('en-IN')}</td>`).join('')}
      </tr>
    </table>
    <table class="grid subs">
      <tr>${report.grades.map((g: any) => `<th>Subjects — ${nbGrade(g)}</th>`).join('')}</tr>
      <tr>${report.grades.map((g: any) => `<td>${esc(andJoin(s.subjectsByGrade?.[g.gradeId] ?? []))}</td>`).join('')}</tr>
    </table>`;

  const gs = [...report.grades].sort((a: any, b: any) => a.gradeNumber - b.gradeNumber);
  const conclGradeLine =
    gs.length >= 2
      ? `${gs[0].gradeName} shows the strongest attainment (${r1(gs[0].nationalAvgPct)}%), while ${gs[gs.length - 1].gradeName} is noticeably lower (${r1(gs[gs.length - 1].nationalAvgPct)}%), highlighting the challenge of sustaining competencies as academic complexity increases.`
      : '';
  const topRegions = report.overall.regions.slice(0, 3).map((x: any) => x.regionName).join(', ');
  const bottomRegions = report.overall.regions.slice(-3).map((x: any) => x.regionName).join(', ');

  const annexure3 = (report.annexure || [])
    .map((g: any) => {
      const subjects = g.subjects
        .map((sub: any) => {
          const comps = sub.competencies.map((c: any) => `<li><span class="code">${esc(c.code)}</span> ${esc(c.description)}</li>`).join('');
          return `<div class="qp avoid"><div class="qp-h">${esc(sub.subjectName)}<span class="qp-n">No. of questions: ${sub.numQuestions}</span></div><ul class="qp-l">${comps}</ul></div>`;
        })
        .join('');
      return `<div class="avoid"><h4 class="anx-g">${esc(g.gradeName)} LAT Question Paper and Competency Details</h4><div class="qp-grid">${subjects}</div></div>`;
    })
    .join('');

  // Region names (alphabetical) for the annexures.
  const regionNames: string[] = [...report.overall.regions].map((r: any) => r.regionName).sort((a: string, b: string) => a.localeCompare(b));

  const annexure1Html = `
    <div class="anx1-grid">
      <div class="anx-panel avoid">${attainmentPanelSvg('All Regions', attainmentRows(report, null))}</div>
      ${regionNames.map((rn) => `<div class="anx-panel avoid">${attainmentPanelSvg(rn, attainmentRows(report, rn))}</div>`).join('')}
    </div>`;

  const annexure2Html = regionNames
    .filter((rn) => (report.schoolsByRegion?.[rn] ?? []).length > 0)
    .map((rn) => `<div class="anx2-region avoid">${schoolPerfChart(report, rn)}</div>`)
    .join('');

  const frontHtml = `
  <section class="card">
    <h3 class="sec">About LAT</h3>
    <p>LAT stands for <b>Learners' Achievement Test</b>. It is a diagnostic test designed to ascertain if students have achieved their learning goals and if they need further remediation. The test is structured around NCF competencies and grade-aligned learning outcomes.</p>
    <h4>Objectives of LAT</h4>
    <ol>
      <li><b>Evaluate Students' Academic Performance:</b> To measure the academic performance of students in various subjects in order to determine whether they have achieved the learning goals.</li>
      <li><b>Identify Learning Gaps:</b> To identify areas where students are struggling or have gaps in their understanding.</li>
      <li><b>Improve Learning Outcomes:</b> To use assessment results to improve student learning outcomes and academic performance.</li>
    </ol>
    <h4>${esc(assessment)} in Collaboration with Sri Aurobindo Society (SAS)</h4>
    <p>Sri Aurobindo Society has played a crucial role in the development of the question paper as well as in the analysis and reporting of ${esc(assessment)} across ${s.regionsParticipated} KVS regions. SAS is actively involved in the ground-level implementation of the National Education Policy (NEP) 2020 in collaboration with Kendriya Vidyalaya Sangathan (KVS). This collaboration aims to ensure the effective execution of NEP 2020 guidelines and improve the overall quality of education in Kendriya Vidyalayas.</p>
  </section>

  <section class="card">
    <h3 class="sec">Summary of Changes</h3>
    <div class="qgrid">${questionTables}</div>
  </section>

  <section class="card">
    <h3 class="sec">Date of Test</h3>
    <p>The test was conducted on <b>${esc(report.meta?.reportDate || '')}</b> across ${s.regionsParticipated} KVS regions.</p>
    <h3 class="sec" style="margin-top:14px">Summary</h3>
    ${summaryTable}
  </section>

  <section class="card">
    <h3 class="sec">Analysis</h3>
    <p>The following section presents the overall average scores (all subjects combined) and average scores attained in various subjects by ${s.regionsParticipated} KVS regions across the country that participated in LAT. It further explores the competencies achieved by students in each region.</p>
  </section>`;

  const partAHtml = `
  <section class="card">
    <span class="pill">Part A: Regional Performance Analysis</span>
    <h3 class="sec">A.1: Overall Score</h3>
    <p>This section demonstrates the overall scores of the regions based on their performance across different subjects and grades.</p>
    <div class="chartbox avoid">${columnChartSvg('Overall Average Scores', report.overall.regions, { nationalAvg: report.overall.nationalAvgPct, nationalStudents: s.totalStudents })}</div>
    <p class="note">Note: The average score of each region shown in the graph is expressed in percentage.<br/>Numbers in brackets indicate the number of students who participated in the test.</p>
    ${report.overall.regions.length ? `<p class="narr">${esc(overallNarrative(report.overall.regions, report.overall.nationalAvgPct))}</p>` : ''}
  </section>

  <section class="card avoid">
    <span class="pill">Part A.2</span>
    <h3 class="sec">Grade-wise and Subject-wise Performance of all Regions</h3>
    <p>This section presents the overall average and subject-wise scores for ${report.grades.map((g: any) => esc(g.gradeName)).join(', ')} across the ${s.regionsParticipated} KVS regions that participated in LAT. It further explores the competencies achieved by students in each grade in each region.</p>
  </section>`;

  const conclusionHtml = `
  <section class="card avoid">
    <h3 class="sec">Conclusion</h3>
    <p>The LAT ${esc(assessment)} results indicate learning outcomes across grades, with an overall national average of <b>${r1(report.overall.nationalAvgPct)}%</b>.</p>
    ${conclGradeLine ? `<p>${esc(conclGradeLine)}</p>` : ''}
    <h4 style="margin-top:8px">Regional Rankings and Trends</h4>
    ${topRegions ? `<p>Consistently high-performing regions include ${esc(topRegions)}, reflecting sustained academic strength across grades and subjects.</p>` : ''}
    ${bottomRegions ? `<p>Regions showing persistent weakness include ${esc(bottomRegions)}, which would benefit from focused, region-specific interventions.</p>` : ''}
    <p class="note" style="margin-top:8px">* Refer to Annexure 1 for a detailed performance analysis of all regions across various competencies.</p>
    <p class="note">* Refer to Annexure 2 for the overall school-wise performance of each region.</p>
    <p class="note">* Refer to Annexure 3 for details on the structure of LAT question papers and the competencies tested.</p>
  </section>`;

  const anx1Html = `
  <section class="card">
    <h3 class="sec">Annexure 1</h3>
    <p class="anx-sub">Attainment of Competencies (Region-wise)</p>
    ${annexure1Html}
  </section>`;

  const anx2Html = `
  <section class="card">
    <h3 class="sec">Annexure 2</h3>
    <p class="anx-sub">Overall School-wise Performance</p>
    ${annexure2Html}
  </section>`;

  const anx3Html = `
  <section class="card">
    <span class="pill" style="background:linear-gradient(90deg,#0f766e,#0d9488)">Annexure 3</span>
    <h3 class="sec">LAT Question Paper and Competency Details</h3>
    <p class="note">Competencies assessed in each grade and subject with number of questions.</p>
    ${annexure3}
  </section>`;

  return [
    { header: '', html: frontHtml },
    { header: 'Part A: Regional Performance Analysis', html: partAHtml },
    ...report.grades.map((g: any, gi: number) => ({
      header: `Part A: ${g.gradeName} Analysis`,
      html: gradeSection(g, gi, gi > 0 ? report.grades[gi - 1] : null),
    })),
    { header: 'Conclusion', html: conclusionHtml },
    { header: 'Annexure 1: Attainment of Competencies', html: anx1Html },
    { header: 'Annexure 2: Overall School-wise Performance', html: anx2Html },
    { header: 'Annexure 3: Question Paper and Competency Details', html: anx3Html },
  ];
}

/** Full-page print CSS shared by every report section. */
export const REPORT_CSS = `
  @page { size: A4; margin: 17mm 12mm 16mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, Helvetica, sans-serif; color: #374151; font-size: 10.5pt; line-height: 1.5; margin: 0; }
  h3.sec { color: #2f4256; font-size: 15pt; font-weight: 800; margin: 0 0 8px; }
  h4 { color: #1f2937; font-size: 12pt; font-weight: 700; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
  h4 .pct { margin-left: auto; font-weight: 800; color: #16a34a; }
  h4 .tick { width: 6px; height: 18px; background: #4f46e5; border-radius: 3px; display: inline-block; }
  p { margin: 6px 0; }
  p.note { font-size: 8.5pt; color: #9ca3af; margin: 3px 0 6px; font-style: italic; }
  p.narr { font-size: 10pt; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; padding: 10px 12px; margin: 8px 0; text-align: justify; }
  p.sub { font-size: 9pt; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin: 10px 0 2px; }
  ol { margin: 6px 0 6px 18px; } li { margin: 2px 0; }
  .card { background: #fff; border: 1px solid #eef1f4; border-radius: 14px; padding: 16px 18px; margin: 12px 0; }
  .chartbox { border: 1px solid #eef1f4; border-radius: 10px; padding: 8px; margin: 8px 0; }
  .pill { display: inline-block; font-size: 8pt; font-weight: 700; color: #fff; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: .06em; background: linear-gradient(90deg,#4f46e5,#7c3aed); margin-bottom: 8px; }
  /* Full-width steel-blue grade banner (matches the target report). */
  .grade-pill { display: block; color: #fff; font-size: 13pt; font-weight: 800; padding: 10px 18px; border-radius: 4px; background: #44607b; margin: 4px 0 12px; }
  .subj-head { display: flex; align-items: center; gap: 10px; font-weight: 700; color: #1f2937; font-size: 11.5pt; border-bottom: 1px solid #eef1f4; padding-bottom: 10px; margin-bottom: 10px; }
  .subj-head .badge { width: 26px; height: 26px; border-radius: 7px; background: #4f46e5; color: #fff; font-size: 10pt; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; }
  .subj-head .pct { margin-left: auto; font-weight: 800; color: #16a34a; }
  ul.legend { list-style: none; margin: 6px 0 10px; padding: 0; }
  ul.legend li { font-size: 8.5pt; color: #6b7280; }
  table.grid { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 9.5pt; }
  table.grid th, table.grid td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: center; }
  /* One table colour scheme everywhere (matches the steel-blue qtab tables). */
  table.grid th { background: #5b7ea0; color: #fff; font-weight: 700; font-size: 8.5pt; }
  table.grid td { color: #1f2937; font-weight: 600; }
  table.grid.subs th { background: #8ba6bf; color: #fff; text-align: left; }
  table.grid.subs td { background: #f8fafc; font-weight: 400; color: #4b5563; text-align: left; font-size: 8.5pt; }
  table.qtab { width: 100%; height: 100%; table-layout: fixed; }
  table.qtab col.c1 { width: 45%; } table.qtab col.c2 { width: 55%; }
  table.qtab .hdr { background: #5b7ea0; color: #fff; font-weight: 700; font-size: 9pt; height: 40px; }
  table.qtab th { background: #8ba6bf; color: #fff; height: 32px; }
  table.qtab td.k { background: #f8fafc; font-weight: 600; text-align: left; }
  table.qtab .tot { background: #dbe4ee; }
  /* Equal-height tables: headers are pinned, body rows share the remaining
     height evenly, so tables with fewer subjects get taller rows and all
     three tables start and end at the same lines. */
  .qgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; align-items: stretch; }
  .perf { border: 1px solid #eef1f4; border-radius: 10px; overflow: hidden; margin: 8px 0 4px; }
  .perf-h { background: #eef2ff; color: #3730a3; font-weight: 700; font-size: 9.5pt; padding: 7px 10px; border-bottom: 1px solid #eef1f4; }
  table.perf-t { border-collapse: collapse; width: 100%; font-size: 8.8pt; }
  table.perf-t th { background: #f8fafc; text-align: left; padding: 6px 8px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #eef1f4; }
  table.perf-t th.thg { color: #059669; } table.perf-t th.thr { color: #e11d48; }
  table.perf-t td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
  table.perf-t td.top { color: #047857; font-weight: 600; } table.perf-t td.bot { color: #e11d48; font-weight: 600; }
  table.perf-t td.nat { text-align: center; font-weight: 800; color: #16a34a; }
  .mut { color: #9ca3af; font-weight: 400; }
  .code { font-family: monospace; font-size: 8pt; color: #3730a3; background: #eef2ff; padding: 1px 5px; border-radius: 4px; }
  .cmpd { color: #6b7280; margin-top: 3px; font-size: 8.2pt; }
  .qp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px; }
  .qp { border: 1px solid #eef1f4; border-radius: 10px; overflow: hidden; }
  .qp-h { display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; padding: 6px 10px; font-weight: 700; color: #1f2937; font-size: 9.5pt; border-bottom: 1px solid #eef1f4; }
  .qp-n { color: #0f766e; font-size: 8pt; font-weight: 600; }
  ul.qp-l { list-style: none; margin: 0; padding: 4px 10px; } ul.qp-l li { font-size: 8.5pt; padding: 3px 0; color: #4b5563; }
  h4.anx-g { color: #3730a3; margin: 10px 0 8px; }
  .anx-sub { font-weight: 700; color: #374151; margin: 0 0 12px; }
  .anx1-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 18px; align-items: start; }
  .anx2-region { margin: 0 0 18px; }
  .a2title { font-weight: 700; text-align: center; color: #1f2937; font-size: 11pt; margin: 12px 0 4px; }
  table.a2 { border-collapse: collapse; width: 100%; font-size: 8.5pt; }
  table.a2 thead { display: table-header-group; }
  table.a2 th, table.a2 td { border: 1px solid #cfd8e3; padding: 3px 6px; text-align: center; color: #1f2937; }
  table.a2 th { font-weight: 700; font-size: 8pt; }
  table.a2 th.nm, table.a2 td.nm { text-align: right; background: #fff; white-space: nowrap; font-weight: 500; }
  table.a2 tr.hl td { font-weight: 800; border-top: 2px solid #111; border-bottom: 2px solid #111; }
  table.a2 tr.hl td:first-child { border-left: 2px solid #111; }
  table.a2 tr.hl td:last-child { border-right: 2px solid #111; }
  .anx-panel { border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px 8px; break-inside: avoid; page-break-inside: avoid; }
  .break-before { page-break-before: always; }
  .avoid { page-break-inside: avoid; break-inside: avoid; }
`;

/** Wraps section body HTML in the shared print skeleton. */
export function wrapReportHtml(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${REPORT_CSS}</style></head><body>${body}</body></html>`;
}

/** Single-document fallback (sync /pdf endpoint) — no running headers. */
export function buildNationalReportHtml(report: any): string {
  const body = buildNationalSections(report)
    .map((sec, i) => (i > 0 ? `<div class="break-before"></div>${sec.html}` : sec.html))
    .join('');
  return wrapReportHtml(body);
}
