import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const userId = req.user.sub;
    const result = await this.studentsService.findAll(+page, +limit, userId);
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

  @Post()
  async createStudent(@Request() req: any, @Body() payload: any) {
    const userId = req.user.sub;
    const data = await this.studentsService.createStudent(userId, payload);
    return {
      status: 'success',
      message: 'Student created successfully',
      data
    };
  }

  @Put(':id')
  async updateStudent(@Param('id') id: string, @Request() req: any, @Body() payload: any) {
    const userId = req.user.sub;
    const data = await this.studentsService.updateStudent(+id, userId, payload);
    return {
      status: 'success',
      message: 'Student updated successfully',
      data
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
