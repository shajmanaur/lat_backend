import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, BorderStyle, WidthType, ShadingType, PageNumber,
} from 'docx';
import { ReportsService } from '../reports.service';
import { columnChartSvg, categoryBarChartSvg } from './chart.util';
import { attainmentPanelSvg, schoolPerfChart } from './annexure.util';
import {
  r1, andJoin, overallNarrative, gradeNarrative, subjectNarrative,
  subjectSpreadNarrative, competencyNarrative,
} from './report-html.builder';

const importPuppeteer = () =>
  Function('return import("puppeteer")')() as Promise<typeof import('puppeteer')>;

// A4 in DXA (1440 = 1in). Content width with 12mm side margins ≈ 10,546 DXA.
const PAGE = { width: 11906, height: 16838 };
const MARGIN = { top: 960, right: 680, bottom: 900, left: 680 };
const CONTENT_DXA = PAGE.width - MARGIN.left - MARGIN.right;
const STEEL = '5B7EA0';
const STEEL_LIGHT = '8BA6BF';
const BANNER = '44607B';
const MAX_IMG_PX = 700; // ≈ full A4 content width at 96dpi (matches the PDF)

type ImgMap = Map<string, { data: Buffer; width: number; height: number }>;

@Injectable()
export class DocxService {
  private readonly logger = new Logger(DocxService.name);
  private readonly coverPng = join(process.cwd(), 'assets', 'national', 'cover.png');
  private readonly backPng = join(process.cwd(), 'assets', 'national', 'back.png');

  constructor(private readonly reportsService: ReportsService) {}

  async getNationalDocx(assessment: string, testDate?: string): Promise<Buffer> {
    const report = await this.reportsService.getNationalReport(assessment, testDate);
    const images = await this.rasterizeCharts(report);
    const doc = this.buildDocument(report, images);
    return Packer.toBuffer(doc);
  }

  // ── Chart rasterization: every SVG the PDF shows, as a crisp PNG ─────────
  private chartSvgs(report: any): Map<string, string> {
    const svgs = new Map<string, string>();
    const s = report.summary;
    svgs.set('a1', columnChartSvg('Overall Average Scores', report.overall.regions, {
      nationalAvg: report.overall.nationalAvgPct, nationalStudents: s.totalStudents,
    }));
    for (const g of report.grades) {
      svgs.set(`g${g.gradeId}-overall`, columnChartSvg(`Overall Average Score of ${g.gradeName}`, g.regionRanking, {
        nationalAvg: g.nationalAvgPct, nationalStudents: g.students, showMarkers: true,
      }));
      svgs.set(`g${g.gradeId}-subjects`, categoryBarChartSvg(`${g.gradeName}: Average Scores by Subject`,
        g.subjects.map((x: any) => ({ label: x.subjectName, value: x.nationalAvgPct }))));
      const studentsByRegion: Record<string, number> = Object.fromEntries(
        g.regionRanking.map((r: any) => [r.regionName, r.students]));
      g.subjects.forEach((subj: any, si: number) => {
        svgs.set(`g${g.gradeId}-s${si}-avg`, columnChartSvg(`${g.gradeName}: ${subj.subjectName} Average Score`,
          subj.regionRanking.map((r: any) => ({ regionName: r.regionName, avgPct: r.avgPct, students: studentsByRegion[r.regionName], hi: r.hi, lo: r.lo })),
          { nationalAvg: subj.nationalAvgPct, nationalStudents: g.students, showMarkers: true }));
        if (subj.competencies.length) {
          svgs.set(`g${g.gradeId}-s${si}-comp`, categoryBarChartSvg(`${g.gradeName} ${subj.subjectName} Competency Performance`,
            subj.competencies.map((c: any) => ({ label: c.code, value: c.nationalAvgPct }))));
        }
      });
    }
    const regionNames: string[] = [...report.overall.regions].map((r: any) => r.regionName).sort((a: string, b: string) => a.localeCompare(b));
    svgs.set('anx1-ALL', this.attainmentSvg(report, null, 'All Regions'));
    for (const rn of regionNames) svgs.set(`anx1-${rn}`, this.attainmentSvg(report, rn, rn));
    for (const rn of regionNames) {
      if ((report.schoolsByRegion?.[rn] ?? []).length) svgs.set(`anx2-${rn}`, schoolPerfChart(report, rn));
    }
    return svgs;
  }

  /** Same attainment rows the HTML annexure uses (kept private there). */
  private attainmentSvg(report: any, regionName: string | null, title: string): string {
    const SUBJ_COLOR: Record<string, string> = {
      English: '#5b9bd5', Hindi: '#ed9b6b', Maths: '#82c341', MATHS: '#82c341', Math: '#82c341',
      TWAU: '#26b3a6', Science: '#e05b4f', 'Social Science': '#9b7fc7', Sanskrit: '#e879b0',
    };
    const val = (arr: any[]) => (regionName ? arr.find((x: any) => x.regionName === regionName)?.avgPct ?? 0 : null);
    const rows: any[] = [{
      label: `Overall Average (${report.grades.map((g: any) => g.gradeNumber).join(',')})`,
      value: regionName ? val(report.overall.regions) ?? 0 : report.overall.nationalAvgPct,
      color: '#1f2937', bold: true,
    }];
    for (const g of report.grades) {
      const gp = `G${g.gradeNumber}`;
      rows.push({ label: `${gp}_Overall`, value: regionName ? val(g.regionRanking) ?? 0 : g.nationalAvgPct, color: '#3d5266', bold: true });
      for (const subj of g.subjects) {
        const col = SUBJ_COLOR[subj.subjectName] ?? '#8aa0b5';
        rows.push({ label: `${gp}_${subj.subjectName}`, value: regionName ? val(subj.regionRanking) ?? 0 : subj.nationalAvgPct, color: col, bold: true });
        for (const c of subj.competencies) {
          rows.push({ label: `${gp}_${subj.subjectName}_${c.code}`, value: regionName ? val(c.allRegions ?? []) ?? 0 : c.nationalAvgPct, color: col });
        }
      }
    }
    return attainmentPanelSvg(title, rows);
  }

  private async rasterizeCharts(report: any): Promise<ImgMap> {
    const svgs = this.chartSvgs(report);
    const html = `<!DOCTYPE html><html><body style="margin:0;background:#fff">${[...svgs]
      .map(([k, svg]) => `<div class="shot" data-key="${k}" style="display:inline-block;background:#fff;padding:2px">${svg}</div>`)
      .join('')}</body></html>`;

    const puppeteer: any = await importPuppeteer();
    const launch = puppeteer.launch ?? puppeteer.default?.launch;
    const browser = await launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const out: ImgMap = new Map();
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 2 });
      await page.setContent(html, { waitUntil: 'load' });
      const handles = await page.$$('.shot');
      for (const h of handles) {
        const key = await h.evaluate((el: any) => el.dataset.key);
        const box = await h.boundingBox();
        if (!key || !box) continue;
        const data = (await h.screenshot({ type: 'png' })) as Buffer;
        out.set(key, { data, width: Math.round(box.width), height: Math.round(box.height) });
      }
    } finally {
      await browser.close();
    }
    return out;
  }

  // ── Word building helpers ────────────────────────────────────────────────
  private t(text: string, opts: any = {}): TextRun {
    return new TextRun({ text, font: 'Arial', size: 21, ...opts });
  }
  private h2(text: string): Paragraph {
    return new Paragraph({ spacing: { before: 240, after: 120 }, children: [this.t(text, { bold: true, size: 30, color: '2F4256' })] });
  }
  private h4(text: string): Paragraph {
    return new Paragraph({ spacing: { before: 160, after: 80 }, children: [this.t(text, { bold: true, size: 24, color: '1F2937' })] });
  }
  private sub(text: string): Paragraph {
    return new Paragraph({ spacing: { before: 180, after: 80 }, children: [this.t(text.toUpperCase(), { bold: true, size: 19, color: '4B5563' })] });
  }
  private body(text: string): Paragraph {
    return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 300 }, children: [this.t(text, { color: '1F2937' })] });
  }
  private note(lines: string[]): Paragraph[] {
    return lines.map((l) => new Paragraph({ spacing: { after: 30 }, children: [this.t(l, { italics: true, size: 18, color: '6B7280' })] }));
  }
  private banner(text: string): Paragraph {
    return new Paragraph({
      shading: { fill: BANNER, type: ShadingType.CLEAR },
      spacing: { before: 120, after: 200 },
      children: [this.t(`  ${text}`, { bold: true, size: 27, color: 'FFFFFF' })],
    });
  }
  private img(images: ImgMap, key: string): Paragraph[] {
    const im = images.get(key);
    if (!im) return [];
    const scale = Math.min(1, MAX_IMG_PX / im.width);
    return [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
      children: [new ImageRun({
        type: 'png', data: im.data,
        transformation: { width: Math.round(im.width * scale), height: Math.round(im.height * scale) },
        altText: { title: key, description: key, name: key },
      } as any)],
    })];
  }
  private cell(children: Paragraph[], width: number, opts: { fill?: string; } = {}): TableCell {
    const border = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: { top: border, bottom: border, left: border, right: border },
      margins: { top: 80, bottom: 80, left: 110, right: 110 },
      shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
      children,
    });
  }
  private headCell(text: string, width: number, fill = STEEL, columnSpan?: number): TableCell {
    const border = { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' };
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      columnSpan,
      borders: { top: border, bottom: border, left: border, right: border },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      shading: { fill, type: ShadingType.CLEAR },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [this.t(text, { bold: true, size: 18, color: 'FFFFFF' })] })],
    });
  }
  private textCell(text: string, width: number, opts: any = {}): TableCell {
    return this.cell([new Paragraph({
      alignment: opts.align ?? AlignmentType.CENTER,
      children: [this.t(text, { bold: opts.bold ?? false, size: opts.size ?? 20, color: opts.color ?? '111827' })],
    })], width, { fill: opts.fill });
  }

  // ── Document assembly (mirrors the PDF sections) ─────────────────────────
  private buildDocument(report: any, images: ImgMap): Document {
    const s = report.summary;
    const assessment = report.meta?.sessionName || 'LAT';

    const sections: any[] = [];
    const pageProps = { page: { size: { width: PAGE.width, height: PAGE.height }, margin: MARGIN } };

    // Header/footer factory: like the PDF — running header only on
    // continuation pages (titlePage=true keeps the first page clean), text on
    // the right of odd pages / left of even pages, page number the same way.
    const hf = (header: string) => ({
      properties: { ...pageProps, titlePage: true },
      headers: {
        default: new Header({ children: header ? [new Paragraph({ alignment: AlignmentType.RIGHT, children: [this.t(header, { italics: true, size: 18, color: '59636E' })] })] : [] }),
        even: new Header({ children: header ? [new Paragraph({ alignment: AlignmentType.LEFT, children: [this.t(header, { italics: true, size: 18, color: '59636E' })] })] : [] }),
        first: new Header({ children: [] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '59636E' })] })] }),
        even: new Footer({ children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '59636E' })] })] }),
        first: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '59636E' })] })] }),
      },
    });

    // 1. Cover — full-page image, no header/footer, no page number.
    if (fs.existsSync(this.coverPng)) {
      sections.push({
        properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
        headers: { default: new Header({ children: [] }) },
        footers: { default: new Footer({ children: [] }) },
        children: [new Paragraph({
          children: [new ImageRun({
            type: 'png', data: fs.readFileSync(this.coverPng),
            transformation: { width: 794, height: 1123 },
            altText: { title: 'Cover', description: 'Cover page', name: 'cover' },
          } as any)],
        })],
      });
    }

    // 2. Front matter.
    const front: any[] = [
      this.h2('About LAT'),
      this.body('LAT stands for Learners’ Achievement Test. It is a diagnostic test designed to ascertain if students have achieved their learning goals and if they need further remediation. The test is structured around NCF competencies and grade-aligned learning outcomes.'),
      this.h4('Objectives of LAT'),
      this.body('1. Evaluate Students’ Academic Performance: To measure the academic performance of students in various subjects in order to determine whether they have achieved the learning goals.'),
      this.body('2. Identify Learning Gaps: To identify areas where students are struggling or have gaps in their understanding.'),
      this.body('3. Improve Learning Outcomes: To use assessment results to improve student learning outcomes and academic performance.'),
      this.h4(`${assessment} in Collaboration with Sri Aurobindo Society (SAS)`),
      this.body(`Sri Aurobindo Society has played a crucial role in the development of the question paper as well as in the analysis and reporting of ${assessment} across ${s.regionsParticipated} KVS regions. SAS is actively involved in the ground-level implementation of the National Education Policy (NEP) 2020 in collaboration with Kendriya Vidyalaya Sangathan (KVS). This collaboration aims to ensure the effective execution of NEP 2020 guidelines and improve the overall quality of education in Kendriya Vidyalayas.`),
      this.h2('Summary of Changes'),
    ];
    {
      // Three question-count tables side by side, like the PDF's qgrid.
      const gap = 140;
      const colW = Math.floor((CONTENT_DXA - 2 * gap) / 3);
      const innerW = [Math.round(colW * 0.45), Math.round(colW * 0.55)];
      const qTable = (g: any) => {
        const total = g.subjects.reduce((sum: number, x: any) => sum + (Number(x.numQuestions) || 0), 0);
        return new Table({
          width: { size: colW, type: WidthType.DXA },
          columnWidths: innerW,
          rows: [
            new TableRow({ children: [this.headCell(`Number of Questions in ${g.gradeName}`, colW, STEEL, 2)] }),
            new TableRow({ children: [this.headCell('Subject', innerW[0], STEEL_LIGHT), this.headCell(assessment, innerW[1], STEEL_LIGHT)] }),
            ...g.subjects.map((x: any) => new TableRow({
              children: [this.textCell(x.subjectName, innerW[0], { align: AlignmentType.LEFT, bold: true, fill: 'F8FAFC', size: 17 }), this.textCell(String(x.numQuestions), innerW[1], { size: 17 })],
            })),
            new TableRow({ children: [this.textCell('Total', innerW[0], { align: AlignmentType.LEFT, bold: true, fill: 'DBE4EE', size: 17 }), this.textCell(String(total), innerW[1], { bold: true, fill: 'DBE4EE', size: 17 })] }),
          ],
        });
      };
      const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as any;
      const wrapCell = (children: any[], width: number) => new TableCell({
        width: { size: width, type: WidthType.DXA },
        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        children,
      });
      const grades3 = (report.annexure || []).slice(0, 3);
      front.push(new Table({
        width: { size: CONTENT_DXA, type: WidthType.DXA },
        columnWidths: [colW, gap, colW, gap, colW].slice(0, grades3.length * 2 - 1),
        rows: [new TableRow({
          children: grades3.flatMap((g: any, i: number) => {
            const cells = [wrapCell([qTable(g)], colW)];
            if (i < grades3.length - 1) cells.push(wrapCell([new Paragraph({ children: [] })], gap));
            return cells;
          }),
        })],
      }));
      // Any further grades (>3) get their own row below.
      for (const g of (report.annexure || []).slice(3)) front.push(qTable(g));
      front.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    }
    front.push(
      this.h2('Date of Test'),
      this.body(`The test was conducted on ${report.meta?.reportDate || ''} across ${s.regionsParticipated} KVS regions.`),
      this.h2('Summary'),
    );
    {
      const cols = 3 + report.grades.length;
      const w = Math.floor(CONTENT_DXA / cols);
      const widths = Array(cols).fill(w);
      front.push(new Table({
        width: { size: w * cols, type: WidthType.DXA },
        columnWidths: widths,
        rows: [
          new TableRow({
            children: [
              this.headCell('Regions Participated', w), this.headCell('Schools Participated', w), this.headCell('Grades', w),
              // Non-breaking spaces so "Grade 3" can never split across lines.
              ...report.grades.map((g: any) => this.headCell(`Students (${String(g.gradeName).replace(/ /g, ' ')})`, w)),
            ],
          }),
          new TableRow({
            children: [
              this.textCell(String(s.regionsParticipated), w, { bold: true }),
              this.textCell(Number(s.schools).toLocaleString('en-IN'), w, { bold: true }),
              this.textCell(andJoin(s.grades || []), w, { bold: true }),
              ...report.grades.map((g: any) => this.textCell(Number(g.students).toLocaleString('en-IN'), w, { bold: true })),
            ],
          }),
        ],
      }));
      front.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
      const sw = Math.floor(CONTENT_DXA / report.grades.length);
      front.push(new Table({
        width: { size: sw * report.grades.length, type: WidthType.DXA },
        columnWidths: Array(report.grades.length).fill(sw),
        rows: [
          new TableRow({ children: report.grades.map((g: any) => this.headCell(`Subjects — ${g.gradeName}`, sw, STEEL_LIGHT)) }),
          new TableRow({ children: report.grades.map((g: any) => this.textCell(andJoin(s.subjectsByGrade?.[g.gradeId] ?? []), sw, { align: AlignmentType.LEFT, size: 17, fill: 'F8FAFC' })) }),
        ],
      }));
    }
    front.push(
      this.h2('Analysis'),
      this.body(`The following section presents the overall average scores (all subjects combined) and average scores attained in various subjects by ${s.regionsParticipated} KVS regions across the country that participated in LAT. It further explores the competencies achieved by students in each region.`),
    );
    sections.push({ ...hf(''), children: front });

    // 3. Part A intro + A.1.
    const partA: any[] = [
      this.h2('Part A: Regional Performance Analysis'),
      this.h4('A.1: Overall Score'),
      this.body('This section demonstrates the overall scores of the regions based on their performance across different subjects and grades.'),
      ...this.img(images, 'a1'),
      ...this.note([
        'Note: The average score of each region shown in the graph is expressed in percentage.',
        'Numbers in brackets indicate the number of students who participated in the test.',
      ]),
      this.body(overallNarrative(report.overall.regions, report.overall.nationalAvgPct)),
      this.h4('A.2: Grade-wise and Subject-wise Performance of all Regions'),
      this.body(`This section presents the overall average and subject-wise scores for ${report.grades.map((g: any) => g.gradeName).join(', ')} across the ${s.regionsParticipated} KVS regions that participated in LAT. It further explores the competencies achieved by students in each grade in each region.`),
    ];
    sections.push({ ...hf('Part A: Regional Performance Analysis'), children: partA });

    // 4. One section per grade.
    report.grades.forEach((g: any, gi: number) => {
      const prev = gi > 0 ? report.grades[gi - 1] : null;
      const kids: any[] = [
        this.banner(`${gi + 1}. ${g.gradeName}`),
        this.h4(`A. Overall Score (Region-wise) — ${r1(g.nationalAvgPct)}%`),
        ...this.img(images, `g${g.gradeId}-overall`),
        ...this.note([
          'Note: The average scores of each region shown in the graph are represented as percentages.',
          'Numbers in brackets indicate the number of students who participated in the test.',
        ]),
        this.body(gradeNarrative(g, prev)),
        this.h4('B. Average Scores by Subject'),
        ...this.img(images, `g${g.gradeId}-subjects`),
        ...this.note(['Note: The average score of each subject shown in the graph is expressed in percentage.']),
        this.body(subjectSpreadNarrative(g)),
      ];
      g.subjects.forEach((subj: any, si: number) => {
        kids.push(this.h4(`${String.fromCharCode(67 + si)}. ${subj.subjectName} — ${r1(subj.nationalAvgPct)}%`));
        kids.push(this.sub('1. Average Score (Region-wise)'));
        kids.push(...this.img(images, `g${g.gradeId}-s${si}-avg`));
        kids.push(...this.note([
          'Note: The average scores of each region shown in the graph are represented as percentages.',
          'Numbers in brackets indicate the number of students who participated in the test.',
        ]));
        kids.push(this.body(subjectNarrative(subj, g.nationalAvgPct)));
        if (subj.competencies.length) {
          kids.push(this.sub('2. Competencies Achieved (Overall)'));
          kids.push(...this.img(images, `g${g.gradeId}-s${si}-comp`));
          kids.push(...this.note(['Note: The overall average score for each competency shown in the graph is expressed in percentage.']));
          for (const c of [...subj.competencies].sort((a: any, b: any) => b.nationalAvgPct - a.nationalAvgPct)) {
            kids.push(new Paragraph({ spacing: { after: 30 }, children: [this.t(`${c.code}: `, { bold: true, size: 18, color: '3730A3' }), this.t(c.description, { size: 18, color: '374151' })] }));
          }
          kids.push(this.performerTable(g, subj));
          kids.push(this.body(competencyNarrative(subj.competencies, subj.subjectName)));
        }
      });
      sections.push({ ...hf(`Part A: ${g.gradeName} Analysis`), children: kids });
    });

    // 5. Conclusion.
    const gs = [...report.grades].sort((a: any, b: any) => a.gradeNumber - b.gradeNumber);
    const topRegions = report.overall.regions.slice(0, 3).map((x: any) => x.regionName).join(', ');
    const bottomRegions = report.overall.regions.slice(-3).map((x: any) => x.regionName).join(', ');
    const conclusion: any[] = [
      this.h2('Conclusion'),
      this.body(`The LAT ${assessment} results indicate learning outcomes across grades, with an overall national average of ${r1(report.overall.nationalAvgPct)}%.`),
    ];
    if (gs.length >= 2) {
      conclusion.push(this.body(`${gs[0].gradeName} shows the strongest attainment (${r1(gs[0].nationalAvgPct)}%), while ${gs[gs.length - 1].gradeName} is noticeably lower (${r1(gs[gs.length - 1].nationalAvgPct)}%), highlighting the challenge of sustaining competencies as academic complexity increases.`));
    }
    conclusion.push(
      this.h4('Regional Rankings and Trends'),
      this.body(`Consistently high-performing regions include ${topRegions}, reflecting sustained academic strength across grades and subjects.`),
      this.body(`Regions showing persistent weakness include ${bottomRegions}, which would benefit from focused, region-specific interventions.`),
      ...this.note([
        '* Refer to Annexure 1 for a detailed performance analysis of all regions across various competencies.',
        '* Refer to Annexure 2 for the overall school-wise performance of each region.',
        '* Refer to Annexure 3 for details on the structure of LAT question papers and the competencies tested.',
      ]),
    );
    sections.push({ ...hf('Conclusion'), children: conclusion });

    // 6. Annexure 1 — attainment panels.
    const regionNames: string[] = [...report.overall.regions].map((r: any) => r.regionName).sort((a: string, b: string) => a.localeCompare(b));
    const anx1: any[] = [this.h2('Annexure 1'), this.body('Attainment of Competencies (Region-wise)')];
    anx1.push(...this.img(images, 'anx1-ALL'));
    for (const rn of regionNames) anx1.push(...this.img(images, `anx1-${rn}`));
    sections.push({ ...hf('Annexure 1: Attainment of Competencies'), children: anx1 });

    // 7. Annexure 2 — school-wise performance per region.
    const anx2: any[] = [this.h2('Annexure 2'), this.body('Overall School-wise Performance')];
    for (const rn of regionNames) anx2.push(...this.img(images, `anx2-${rn}`));
    sections.push({ ...hf('Annexure 2: Overall School-wise Performance'), children: anx2 });

    // 8. Annexure 3 — question paper and competency details.
    const anx3: any[] = [this.h2('Annexure 3'), this.body('LAT Question Paper and Competency Details')];
    for (const g of report.annexure || []) {
      anx3.push(this.h4(`${g.gradeName} LAT Question Paper and Competency Details`));
      for (const sub of g.subjects) {
        const w = [Math.round(CONTENT_DXA * 0.14), Math.round(CONTENT_DXA * 0.86)];
        anx3.push(new Table({
          width: { size: CONTENT_DXA, type: WidthType.DXA },
          columnWidths: w,
          rows: [
            new TableRow({ children: [this.headCell(`${sub.subjectName} — No. of questions: ${sub.numQuestions}`, CONTENT_DXA, STEEL, 2)] }),
            ...sub.competencies.map((c: any) => new TableRow({
              children: [
                this.textCell(c.code, w[0], { bold: true, color: '3730A3', fill: 'F8FAFC' }),
                this.textCell(c.description, w[1], { align: AlignmentType.LEFT, size: 17 }),
              ],
            })),
          ],
        }));
        anx3.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
      }
    }
    sections.push({ ...hf('Annexure 3: Question Paper and Competency Details'), children: anx3 });

    // 9. Back cover.
    if (fs.existsSync(this.backPng)) {
      sections.push({
        properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: 0, right: 0, bottom: 0, left: 0 } } },
        headers: { default: new Header({ children: [] }) },
        footers: { default: new Footer({ children: [] }) },
        children: [new Paragraph({
          children: [new ImageRun({
            type: 'png', data: fs.readFileSync(this.backPng),
            transformation: { width: 794, height: 1123 },
            altText: { title: 'Back', description: 'Back page', name: 'back' },
          } as any)],
        })],
      });
    }

    return new Document({
      evenAndOddHeaderAndFooters: true,
      styles: { default: { document: { run: { font: 'Arial', size: 21 } } } },
      sections,
    });
  }

  private performerTable(g: any, subj: any): Table {
    const w = [Math.round(CONTENT_DXA * 0.3), Math.round(CONTENT_DXA * 0.27), Math.round(CONTENT_DXA * 0.27), Math.round(CONTENT_DXA * 0.16)];
    const lines = (arr: any[], color: string) =>
      arr.map((r: any) => new Paragraph({ spacing: { after: 15 }, children: [this.t(`${r.regionName} `, { bold: true, size: 18, color }), this.t(`(${r1(r.avgPct)})`, { size: 18, color: '6B7280' })] }));
    return new Table({
      width: { size: CONTENT_DXA, type: WidthType.DXA },
      columnWidths: w,
      rows: [
        new TableRow({ children: [this.headCell(`${g.gradeName}: Top and Bottom Performers in ${subj.subjectName}`, CONTENT_DXA, STEEL, 4)] }),
        new TableRow({
          children: [
            this.headCell('Competency', w[0], STEEL_LIGHT), this.headCell('Top Performers', w[1], STEEL_LIGHT),
            this.headCell('Bottom Performers', w[2], STEEL_LIGHT), this.headCell('Nat. Avg', w[3], STEEL_LIGHT),
          ],
        }),
        ...subj.competencies.map((c: any) => new TableRow({
          children: [
            this.cell([
              new Paragraph({ children: [this.t(c.code, { bold: true, size: 18, color: '3730A3' })] }),
              new Paragraph({ children: [this.t(c.description, { size: 16, color: '6B7280' })] }),
            ], w[0]),
            this.cell(lines(c.top ?? [], '047857'), w[1]),
            this.cell(lines(c.bottom ?? [], 'E11D48'), w[2]),
            this.textCell(`${r1(c.nationalAvgPct)}%`, w[3], { bold: true, color: '16A34A' }),
          ],
        })),
      ],
    });
  }
}
