import { IsEmail, IsNotEmpty, IsString, IsNumberString, ValidateNested, IsArray, IsOptional, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class SingleCoordinatorDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsNumberString({}, { message: 'Mobile must be a valid number string' })
  @Length(10, 10, { message: 'Mobile number must be exactly 10 digits' })
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobile: string;

  @IsNumberString({}, { message: 'Region is required' })
  region: string;

  @IsString()
  @IsNotEmpty({ message: 'School UDISE code is required' })
  school: string;
}

export class UpdateCoordinatorDto {
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

  @IsOptional()
  @IsNumberString({}, { message: 'Region is required' })
  region?: string;

  @IsOptional()
  @IsString()
  school?: string;
}


export class BulkCoordinatorItemDto {
  @IsOptional()
  @IsString()
  Name?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address in bulk sheet' })
  Email?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address in bulk sheet' })
  email?: string;

  @IsOptional()
  Mobile?: any;

  @IsOptional()
  mobile?: any;
}

export class BulkCoordinatorDto {
  @IsNumberString({}, { message: 'Region is required' })
  region: string;

  @IsString()
  @IsNotEmpty({ message: 'School UDISE code is required' })
  school: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkCoordinatorItemDto)
  coordinators: BulkCoordinatorItemDto[];
}
