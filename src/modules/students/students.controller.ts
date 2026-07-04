import { Controller, Get, Param, Query } from '@nestjs/common';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const result = await this.studentsService.findAll(+page, +limit);
    return {
      status: 'success',
      data: result.data,
      meta: {
        total: result.total,
        page: +page,
        limit: +limit,
      }
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.studentsService.findOne(+id);
    return {
      status: 'success',
      data,
    };
  }
}
