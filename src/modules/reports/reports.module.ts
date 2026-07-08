import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfService } from './pdf/pdf.service';
import { DocxService } from './pdf/docx.service';
import { ReportJobService } from './pdf/report-job.service';

/**
 * Self-contained reporting module. It reads through the global TypeORM
 * DataSource only, so it needs no entity registration and touches no
 * existing module.
 */
@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PdfService, DocxService, ReportJobService],
})
export class ReportsModule {}
