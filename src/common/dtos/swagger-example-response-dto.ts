/*
Author: Vimal Kumar
Mobile: 9650389436
Description: This (example-response-dto.ts) is created to show the 
              standard responses dto, that is used in the file path
              ('src/common/decorators/example-api-standard-responses.decorator')
              It is has the functionality of passing the values in columns from 
              the `example-api-standard-responses.decorator`. Initialised the 
              default values in columns.
*/

import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';

export function createResponseDto<T>(
  type: Type<T> | null,
  apiStatus = true,
  apiStatusCode = 200,
  apiMessage = 'Success',
  nameSuffix = uuidv4(),
): Type<any> {
  class CustomResponseDto {
    @ApiProperty({ example: 'GET/POST/PUT/PATCH/DELETE' })
    methodType: string;

    @ApiProperty({ example: apiStatus })
    status: boolean;

    @ApiProperty({ example: apiStatusCode })
    statusCode: number;

    @ApiProperty({ example: apiMessage })
    message: string;

    @ApiProperty({ example: apiStatus == true ? '' : apiMessage })
    error: string;

    @ApiProperty({ example: new Date().toISOString() })
    responseDate: Date;

    @ApiProperty({ required: false, example: {} })
    exception?: any;

    @ApiProperty({ type, required: false })
    response?: T;
  }

  // Force evaluation of decorators with the correct values
  Object.defineProperty(CustomResponseDto, 'name', {
    value: `CustomResponseDto_${nameSuffix}_${apiStatusCode}`,
  });

  return CustomResponseDto;
}

// import { Type } from '@nestjs/common';
// import { ApiProperty } from '@nestjs/swagger';

// export function createResponseDto<T>(
//   type: Type<T>,
//   apiStatus?: boolean,
// ): Type<any> {
//   class CustomResponseDto {
//     @ApiProperty()
//     methodType: string;

//     @ApiProperty()
//     status: boolean;

//     @ApiProperty()
//     statusCode: number;

//     @ApiProperty()
//     message: string;

//     @ApiProperty()
//     error: string;

//     @ApiProperty()
//     responseDate: Date;

//     @ApiProperty({ required: false })
//     exception?: any;

//     @ApiProperty({ type, required: false })
//     response?: T;
//   }

//   return CustomResponseDto;
// }

export class StringResponseDto {
  @ApiProperty({ example: 'example string' })
  value: string;
}

export class NumberResponseDto {
  @ApiProperty({ example: 123 })
  value: number;
}

export class BooleanResponseDto {
  @ApiProperty({ example: true })
  value: boolean;
}
