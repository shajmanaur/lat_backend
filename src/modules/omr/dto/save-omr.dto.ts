import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class OmrResponseItemDto {
  @ApiProperty({ example: 1, description: 'The ID of the question' })
  @IsNumber()
  @IsNotEmpty()
  question_id: number;

  @ApiProperty({ example: 'A', description: 'The selected option (A, B, C, D)', required: false })
  @IsString()
  selected_option: string;
}

export class SaveOmrDto {
  @ApiProperty({ example: 123, description: 'The student ID' })
  @IsNumber()
  @IsNotEmpty()
  student_id: number;

  @ApiProperty({ type: [OmrResponseItemDto], description: 'Array of student responses' })
  @IsArray()
  @IsNotEmpty()
  responses: OmrResponseItemDto[];

  @ApiProperty({ example: 1, description: 'Status: 0 for Draft, 1 for Submitted' })
  @IsNumber()
  @IsNotEmpty()
  status: number;
}
