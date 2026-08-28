import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiResponse, SuccessResponse } from '../../shared/responses/response.types';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<SuccessResponse<T>, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<SuccessResponse<T>>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => ({
        success: true,
        message: response?.message ?? 'Request completed successfully',
        data: response?.data ?? (null as T),
        ...(response?.meta ? { meta: response.meta } : {}),
      })),
    );
  }
}
