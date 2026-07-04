/*
Author: Vimal Kumar
Mobile: 9650389436
Description: This (example-api-standard-responses.decorator.ts) is created to show the 
              standard responses in swagger example response window. This will 
              automatically show the different response according to the status
              code.
How to Use:
@ApiStandardResponses(String)   // ✅ response: { value: "example string" }
@ApiStandardResponses(Number)   // ✅ response: { value: 123 }
@ApiStandardResponses(Boolean)  // ✅ response: { value: true }
@ApiStandardResponses(MyDto)    // ✅ response: MyDto fields
@ApiStandardResponses(null)     // ✅ no response field

*/

import {
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';
import {
  BooleanResponseDto,
  createResponseDto,
  NumberResponseDto,
  StringResponseDto,
} from '../dtos/swagger-example-response-dto';

function resolveWrappedType(type: any): Type<any> | null {
  if (type === String) return StringResponseDto;
  if (type === Number) return NumberResponseDto;
  if (type === Boolean) return BooleanResponseDto;
  if (typeof type === 'function') return type;
  return null;
}

export function ApiStandardResponses<T>(
  type:
    | Type<T>
    | StringConstructor
    | NumberConstructor
    | BooleanConstructor
    | null,
) {
  const resolvedType = resolveWrappedType(type);
  // console.log(resolvedType);
  return applyDecorators(
    ApiOkResponse({
      description: 'Request processed successfully',
      ...(resolvedType && {
        type: createResponseDto(
          resolvedType,
          true,
          200,
          'Request processed successfully',
        ),
      }),
    }),

    // ApiCreatedResponse({
    //   description: 'Resource created successfully',
    //   ...(resolvedType && {
    //     type: createResponseDto(
    //       resolvedType,
    //       true,
    //       201,
    //       'Resource created successfully',
    //     ),
    //   }),
    // }),

    // ApiBadRequestResponse({
    //   description: 'Bad Request',
    //   ...(resolvedType && {
    //     type: createResponseDto(resolvedType, false, 400, 'Bad Request'),
    //   }),
    // }),

    // ApiUnauthorizedResponse({
    //   description: 'Unauthorized',
    //   ...(resolvedType && {
    //     type: createResponseDto(resolvedType, false, 401, 'Unauthorized'),
    //   }),
    // }),

    // ApiForbiddenResponse({
    //   description: 'Forbidden',
    //   ...(resolvedType && {
    //     type: createResponseDto(resolvedType, false, 403, 'Forbidden'),
    //   }),
    // }),

    // ApiNotFoundResponse({
    //   description: 'Not Found',
    //   ...(resolvedType && {
    //     type: createResponseDto(resolvedType, false, 404, 'Not Found'),
    //   }),
    // }),
  );
}

//#region COMMENTED CODE
// import { applyDecorators, Type } from '@nestjs/common';
// import {
//   ApiCreatedResponse,
//   ApiForbiddenResponse,
//   ApiInternalServerErrorResponse,
//   ApiNotFoundResponse,
//   ApiOkResponse,
//   ApiUnauthorizedResponse,
// } from '@nestjs/swagger';
// import { createResponseDto } from '../dtos/example-response-dto';

// export function ApiStandardResponses<T>(type: Type<T>) {
//   return applyDecorators(
//     ApiCreatedResponse({
//       description: 'Resource created successfully',
//       type: createResponseDto(type, true, 201, 'Resource created successfully'),
//     }),
//     ApiOkResponse({
//       description: 'Request processed successfully',
//       type: createResponseDto(
//         type,
//         true,
//         200,
//         'Request processed successfully',
//       ),
//     }),
//     ApiUnauthorizedResponse({
//       description: 'Unauthorized access',
//       type: createResponseDto(type, false, 401, 'Unauthorized access'),
//     }),
//     ApiForbiddenResponse({
//       description: 'Forbidden request',
//       type: createResponseDto(type, false, 403, 'Forbidden request'),
//     }),
//     ApiNotFoundResponse({
//       description: 'Resource not found',
//       type: createResponseDto(type, false, 404, 'Resource not found'),
//     }),
//     ApiInternalServerErrorResponse({
//       description: 'Internal server error',
//       type: createResponseDto(type, false, 500, 'Internal server error'),
//     }),
//   );
// }
//#endregion
