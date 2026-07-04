import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const methodType = request.method;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message || null
        : 'Internal server error';

    const error =
      exception instanceof HttpException
        ? exception.name || 'HttpException'
        : 'InternalServerError';

    const responsePayload = {
      methodType,
      status: false,
      statusCode: status,
      message,
      error,
      response: null,
      responseDate: new Date(),
      exception: exception.stack || null,
    };

    response.status(status).json(responsePayload);
  }
}
