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
  @ApiQuery({ name: 'regionId', required: false, description: 'Filter by Region' })
  @ApiQuery({ name: 'udise', required: false, description: 'Filter by School' })
  @ApiQuery({ name: 'gradeId', required: false, description: 'Filter by Grade' })
  @ApiQuery({ name: 'section', required: false, description: 'Filter by Section' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by Name or APAAR' })
  @ApiStandardResponses(Object)
  async findAll(
    @Request() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('regionId') regionId?: string,
    @Query('udise') udise?: string,
    @Query('gradeId') gradeId?: string,
    @Query('section') section?: string,
    @Query('search') search?: string
  ) {
    const userId = req.user.sub;
    const roleId = req.user.role;
    const result = await this.studentsService.findAll(+page, +limit, userId, roleId, {
      regionId: regionId ? +regionId : undefined,
      udise,
      gradeId: gradeId ? +gradeId : undefined,
      section,
      search
    });
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

  @Get('meta/sections')
  @ApiOperation({ summary: 'Get distinct sections dynamically' })
  @ApiQuery({ name: 'udise', required: false })
  @ApiQuery({ name: 'gradeId', required: false })
  @ApiStandardResponses(Array)
  async getSections(@Query('udise') udise?: string, @Query('gradeId') gradeId?: string) {
    const sections = await this.studentsService.getDistinctSections(udise, gradeId ? +gradeId : undefined);
    return {
      status: 'success',
      data: sections
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
