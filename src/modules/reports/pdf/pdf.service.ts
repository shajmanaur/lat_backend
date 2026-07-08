import { Injectable, Logger } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ReportsService } from '../reports.service';
import { buildNationalSections, wrapReportHtml, ReportSection } from './report-html.builder';

// Puppeteer v25 is ESM-only. This backend compiles to CommonJS, so a static
// import would become a require() and throw ERR_REQUIRE_ESM. The Function()
// wrapper keeps this a genuine dynamic import() that TS won't down-level.
const importPuppeteer = () =>
  Function('return import("puppeteer")')() as Promise<typeof import('puppeteer')>;

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  // Exact first/last pages lifted from the reference PDF (see assets/national).
  private readonly coverPath = join(process.cwd(), 'assets', 'national', 'cover.pdf');
  private readonly backPath = join(process.cwd(), 'assets', 'national', 'back.pdf');

  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Renders each report section as its own PDF (so we know which pages belong
   * to which section), then assembles cover + content + back. Every content
   * page gets a running header with the section title and a page number,
   * mirrored like the target report: odd pages on the right, even on the left.
   */
  async getNationalPdf(assessment: string, testDate?: string): Promise<Buffer> {
    const report = await this.reportsService.getNationalReport(assessment, testDate);
    const sections = buildNationalSections(report);

    const puppeteer: any = await importPuppeteer();
    const launch = puppeteer.launch ?? puppeteer.default?.launch;
    const browser = await launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const rendered: Array<{ header: string; pdf: Uint8Array }> = [];
    try {
      const page = await browser.newPage();
      for (const sec of sections) {
        await page.setContent(wrapReportHtml(sec.html), { waitUntil: 'load' });
        rendered.push({
          header: sec.header,
          pdf: await page.pdf({ printBackground: true, preferCSSPageSize: true }),
        });
      }
    } finally {
      await browser.close();
    }

    return this.assemble(rendered);
  }

  private async assemble(rendered: Array<{ header: string; pdf: Uint8Array }>): Promise<Buffer> {
    const out = await PDFDocument.create();
    const helv = await out.embedFont(StandardFonts.Helvetica);
    const helvItalic = await out.embedFont(StandardFonts.HelveticaOblique);
    const stampColor = rgb(0.35, 0.4, 0.47);
    const marginX = 34; // ≈ the 12mm page side margin in points

    const appendAsset = async (path: string, label: string) => {
      if (!fs.existsSync(path)) {
        this.logger.warn(`${label} asset missing at ${path}; skipping.`);
        return;
      }
      const doc = await PDFDocument.load(fs.readFileSync(path));
      (await out.copyPages(doc, doc.getPageIndices())).forEach((p) => out.addPage(p));
    };

    await appendAsset(this.coverPath, 'Cover');

    // Content pages: stamp running header (top) and page number (bottom),
    // right-aligned on odd pages and left-aligned on even pages. Like the
    // target report, the first page of a section (the one carrying its title)
    // gets no running header — only continuation pages do.
    let pageNo = 0;
    for (const { header, pdf } of rendered) {
      const doc = await PDFDocument.load(pdf);
      const pages = await out.copyPages(doc, doc.getPageIndices());
      for (let pi = 0; pi < pages.length; pi++) {
        const p = pages[pi];
        out.addPage(p);
        pageNo++;
        const { width, height } = p.getSize();
        const odd = pageNo % 2 === 1;
        if (header && pi > 0) {
          const size = 9;
          const tw = helvItalic.widthOfTextAtSize(header, size);
          p.drawText(header, {
            x: odd ? width - marginX - tw : marginX,
            y: height - 30,
            size,
            font: helvItalic,
            color: stampColor,
          });
        }
        const num = String(pageNo);
        const nw = helv.widthOfTextAtSize(num, 9);
        p.drawText(num, {
          x: odd ? width - marginX - nw : marginX,
          y: 20,
          size: 9,
          font: helv,
          color: stampColor,
        });
      }
    }

    await appendAsset(this.backPath, 'Back');

    const bytes = await out.save();
    return Buffer.from(bytes);
  }
}
