import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiStandardResponses } from '../../common/decorators/swagger-response-example-api-standard.decorator';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/auth-roles.guard';

@ApiTags('Students')
@ApiBearerAuth('access-token')
@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of students' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: '10' })
  @ApiStandardResponses(Object)
  async findAll(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    const userId = req.user.sub;
    const roleId = req.user.role;
    const result = await this.studentsService.findAll(+page, +limit, userId, roleId);
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
  @ApiOperation({ summary: 'Create a new student' })
  @ApiStandardResponses(Object)
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
  @ApiOperation({ summary: 'Update an existing student' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiStandardResponses(Object)
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
  @ApiOperation({ summary: 'Get a single student by ID' })
  @ApiParam({ name: 'id', description: 'Student ID' })
  @ApiStandardResponses(Object)
  async findOne(@Param('id') id: string) {
    const data = await this.studentsService.findOne(+id);
    return {
      status: 'success',
      data,
    };
  }
}
