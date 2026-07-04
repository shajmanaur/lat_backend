import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const GetUniqueFromCookie = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    try {
      return 27;
    } catch (err) {
      throw new BadRequestException(err);
    }
  },
);
