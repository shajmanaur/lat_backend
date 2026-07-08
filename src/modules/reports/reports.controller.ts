import { Controller, Get, Post, Param, Query, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { PdfService } from './pdf/pdf.service';
import { ReportJobService } from './pdf/report-job.service';
import { NationalReportQueryDto } from './dto/national-report-query.dto';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly pdfService: PdfService,
    private readonly jobService: ReportJobService,
  ) {}

  @Get('national')
  @ApiOperation({ summary: 'National LAT report data (region- and competency-wise) from the current DB' })
  @ApiResponse({ status: 200, description: 'National report data returned successfully.' })
  async getNational(@Query() query: NationalReportQueryDto) {
    const refresh = query.refresh === '1' || query.refresh === 'true';
    return this.reportsService.getNationalReport(query.assessment ?? 'LAT', query.date, { refresh });
  }

  @Get('national/pdf')
  @ApiOperation({ summary: 'National LAT report as a PDF (synchronous — may take a while at full scale)' })
  async getNationalPdf(@Query() query: NationalReportQueryDto, @Res() res: Response) {
    const assessment = query.assessment ?? 'LAT';
    const pdf = await this.pdfService.getNationalPdf(assessment, query.date);
    const fileName = `National_Report_${assessment.replace(/[^\w]+/g, '_')}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${fileName}"`, 'Content-Length': pdf.length });
    res.end(pdf);
  }

  // ── Async PDF/Word generation: start → poll status → download ─────────────
  @Post('national/pdf/jobs')
  @ApiOperation({ summary: 'Start background generation of the National PDF; returns a job id' })
  startNationalPdfJob(@Query() query: NationalReportQueryDto) {
    const jobId = this.jobService.startNational(query.assessment ?? 'LAT', query.date);
    return { jobId, status: 'pending' };
  }

  @Post('national/docx/jobs')
  @ApiOperation({ summary: 'Start background generation of the National Word document; returns a job id (poll/download via the pdf/jobs endpoints)' })
  startNationalDocxJob(@Query() query: NationalReportQueryDto) {
    const jobId = this.jobService.startNationalDocx(query.assessment ?? 'LAT', query.date);
    return { jobId, status: 'pending' };
  }

  @Get('national/pdf/jobs/:id')
  @ApiOperation({ summary: 'Poll the status of a National PDF job' })
  getNationalPdfJob(@Param('id') id: string) {
    const job = this.jobService.get(id);
    if (!job) throw new NotFoundException('Job not found or expired');
    return { jobId: job.id, status: job.status, fileName: job.fileName, error: job.error ?? null };
  }

  @Get('national/pdf/jobs/:id/download')
  @ApiOperation({ summary: 'Download the finished PDF for a job' })
  downloadNationalPdfJob(@Param('id') id: string, @Res() res: Response) {
    const job = this.jobService.get(id);
    if (!job) throw new NotFoundException('Job not found or expired');
    if (job.status !== 'ready' || !job.pdf) {
      res.status(409).json({ status: job.status, error: job.error ?? null });
      return;
    }
    res.set({ 'Content-Type': job.mime || 'application/pdf', 'Content-Disposition': `attachment; filename="${job.fileName}"`, 'Content-Length': job.pdf.length });
    res.end(job.pdf);
  }
}
