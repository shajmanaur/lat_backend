import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';
import { OmrUploadService } from './omr-upload.service';

@ApiTags('OMR Upload')
@ApiBearerAuth('access-token')
@Controller('omr/upload')
@UseGuards(JwtAuthGuard)
export class OmrUploadController {
  constructor(private readonly omrUploadService: OmrUploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload OMR Excel Data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    const userId = req.user.sub || req.user.userId;
    const result = await this.omrUploadService.processUpload(file, userId);
    
    return {
      status: 'success',
      data: result
    };
  }
}
