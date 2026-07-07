import { IsEmail, IsNotEmpty, IsString, IsNumberString, ValidateNested, IsArray, IsOptional, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SingleCoordinatorDto {
  @ApiProperty({ example: 'John Doe', description: 'Coordinator Name' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Coordinator Email' })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: '9876543210', description: '10-digit mobile number' })
  @IsNumberString({}, { message: 'Mobile must be a valid number string' })
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: string;

  @ApiProperty({ example: '10', description: 'Region ID' })
  @IsNumberString({}, { message: 'Region is required' })
  region: string;

  @ApiProperty({ example: '07010400114', description: 'School UDISE code' })
  @IsString()
  @IsNotEmpty({ message: 'School UDISE code is required' })
  school: string;
}

export class UpdateCoordinatorDto {
  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Mobile must be a valid number string' })
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  mobile?: string;

  @ApiProperty({ example: '10', required: false })
  @IsOptional()
  @IsNumberString({}, { message: 'Region is required' })
  region?: string;

  @ApiProperty({ example: '07010400114', required: false })
  @IsOptional()
  @IsString()
  school?: string;
}


export class BulkCoordinatorItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  Name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address in bulk sheet' })
  Email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address in bulk sheet' })
  email?: string;

  @IsOptional()
  Mobile?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  mobile?: any;
}

export class BulkCoordinatorDto {
  @ApiProperty({ example: '10' })
  @IsNumberString({}, { message: 'Region is required' })
  region: string;

  @ApiProperty({ example: '07010400114' })
  @IsString()
  @IsNotEmpty({ message: 'School UDISE code is required' })
  school: string;

  @ApiProperty({ type: [BulkCoordinatorItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCoordinatorItemDto)
  coordinators: BulkCoordinatorItemDto[];
}
