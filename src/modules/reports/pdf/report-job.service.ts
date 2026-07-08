import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PdfService } from './pdf.service';
import { DocxService } from './docx.service';

type JobStatus = 'pending' | 'ready' | 'error';

interface Job {
  id: string;
  status: JobStatus;
  fileName: string;
  mime: string;
  pdf?: Buffer; // generated file bytes (PDF or DOCX — named for compat)
  error?: string;
  createdAt: number;
}

/**
 * Runs National-report PDF generation in the background so the HTTP request
 * that starts it returns immediately. The client polls status, then downloads
 * when ready. Jobs (and their in-memory PDF buffers) are pruned after a TTL.
 */
@Injectable()
export class ReportJobService {
  private readonly logger = new Logger(ReportJobService.name);
  private readonly jobs = new Map<string, Job>();
  private readonly TTL = 30 * 60 * 1000; // 30 minutes

  constructor(
    private readonly pdfService: PdfService,
    private readonly docxService: DocxService,
  ) {}

  private prune() {
    const now = Date.now();
    for (const [id, j] of this.jobs) if (now - j.createdAt > this.TTL) this.jobs.delete(id);
  }

  private start(fileName: string, mime: string, produce: () => Promise<Buffer>): string {
    this.prune();
    const id = randomUUID();
    const job: Job = { id, status: 'pending', fileName, mime, createdAt: Date.now() };
    this.jobs.set(id, job);

    // Fire-and-forget generation.
    void (async () => {
      const t0 = Date.now();
      try {
        job.pdf = await produce();
        job.status = 'ready';
        this.logger.log(`Job ${id} (${fileName}) ready in ${((Date.now() - t0) / 1000).toFixed(1)}s (${job.pdf.length} bytes)`);
      } catch (e: any) {
        job.status = 'error';
        job.error = e?.message || 'Generation failed';
        this.logger.error(`Job ${id} failed: ${job.error}`);
      }
    })();

    return id;
  }

  startNational(assessment: string, date?: string): string {
    const base = `National_Report_${(assessment || 'LAT').replace(/[^\w]+/g, '_')}`;
    return this.start(`${base}.pdf`, 'application/pdf', () => this.pdfService.getNationalPdf(assessment, date));
  }

  startNationalDocx(assessment: string, date?: string): string {
    const base = `National_Report_${(assessment || 'LAT').replace(/[^\w]+/g, '_')}`;
    return this.start(
      `${base}.docx`,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      () => this.docxService.getNationalDocx(assessment, date),
    );
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }
}
