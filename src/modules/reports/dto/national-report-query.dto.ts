import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class NationalReportQueryDto {
  @ApiPropertyOptional({
    description:
      'Assessment name/month stamped on the report (there is no column for it in the DB).',
    example: 'LAT April 2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assessment?: string;

  @ApiPropertyOptional({
    description: 'Optional "Date of Test" text shown on the summary page.',
    example: '3rd April 2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  date?: string;

  @ApiPropertyOptional({
    description:
      'Set to "1"/"true" to regenerate the report from the main tables (takes several minutes). Otherwise the last generated snapshot is served.',
    example: '1',
  })
  @IsOptional()
  @IsString()
  refresh?: string;
}
