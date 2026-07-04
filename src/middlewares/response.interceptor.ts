import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface ResponseParameter<T> {
  methodType: string;
  status: boolean;
  statusCode: number;
  message: string;
  error: string;
  response?: any;
  responseDate: Date;
  exception?: any;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ResponseParameter<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseParameter<T>> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const methodType = req.method;
    const path = req.url;

    return next.handle().pipe(
      map((data) => {
        // Check if the data is empty (null, undefined, empty array, or empty object)
        const isEmpty =
          data === null ||
          data === undefined ||
          (Array.isArray(data) && data.length === 0) ||
          (typeof data === 'object' &&
            !Array.isArray(data) &&
            Object.keys(data).length === 0);

        // If data is empty, override the status code to 404
        if (isEmpty) {
          res.statusCode = 404;
        }

        return {
          methodType,
          status: !isEmpty,
          statusCode: res.statusCode,
          message: isEmpty ? 'Data Not Found' : 'Success',
          error: '',
          response: data,
          responseDate: new Date(),
          exception: null,
        };
      }),
      catchError((err) => {
        console.log(err);
        res.statusCode = err.status || 500;
        return of({
          methodType,
          status: false,
          statusCode: res.statusCode,
          message: Array.isArray(err.response?.message)
            ? err.response.message
            : err.message || 'Internal Server Error',
          error: err.response.error || 'Unexpected error',
          response: err.response?.response || null,
          responseDate: new Date(),
          exception: process.env.NODE_ENV === 'development' ? err.stack : null,
        });
      }),
    );
  }
}
