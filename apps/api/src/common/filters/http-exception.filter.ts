import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

import { PlatformLoggerService } from '../services/platform-logger.service';
import { PrismaErrorMapper } from '../utils/prisma-error.util';
import { RequestContextStorage } from '../utils/request-context.util';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PlatformLoggerService,
    private readonly httpAdapterHost: HttpAdapterHost,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const nodeEnv = this.configService.get<string>('environment.nodeEnv', 'development');
    const requestId = request.requestId ?? RequestContextStorage.getRequestId();
    const translatedException = PrismaErrorMapper.toHttpException(exception);
    const resolvedException = translatedException ?? exception;

    const status =
      resolvedException instanceof HttpException
        ? resolvedException.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      resolvedException instanceof HttpException
        ? resolvedException.getResponse()
        : 'Internal server error';

    const normalizedResponse = this.normalizeExceptionResponse(exceptionResponse);
    const code =
      normalizedResponse.code ??
      this.resolveErrorCode(resolvedException, status);

    const body = {
      success: false,
      message:
        normalizedResponse.message ??
        this.resolveFallbackMessage(status),
      error: {
        code,
        ...(normalizedResponse.details ? { details: normalizedResponse.details } : {}),
        ...(nodeEnv !== 'production' && exception instanceof Error
          ? { stack: exception.stack }
          : {}),
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        path: httpAdapter.getRequestUrl(request),
      },
    };

    this.logger.error({
      event: 'request.failed',
      requestId,
      method: request.method,
      path: request.originalUrl || request.url,
      statusCode: status,
      userId: request.principal?.userId ?? request.user?.userId,
      organizationId: request.principal?.organizationId ?? request.user?.organizationId,
      errorCode: code,
      errorName: resolvedException instanceof Error ? resolvedException.name : 'UnknownError',
    });

    httpAdapter.reply(response, body, status);
  }

  private normalizeExceptionResponse(response: unknown) {
    if (typeof response === 'string') {
      return { message: response };
    }

    if (!response || typeof response !== 'object') {
      return {};
    }

    const payload = response as {
      message?: string | string[];
      code?: string;
      details?: unknown;
    };

    return {
      message: Array.isArray(payload.message)
        ? payload.message.join(', ')
        : payload.message,
      code: payload.code,
      details: payload.details,
    };
  }

  private resolveErrorCode(exception: unknown, status: number) {
    if (exception instanceof HttpException) {
      if (status === HttpStatus.UNAUTHORIZED) {
        return 'UNAUTHORIZED';
      }

      if (status === HttpStatus.FORBIDDEN) {
        return 'FORBIDDEN';
      }

      if (status === HttpStatus.NOT_FOUND) {
        return 'RESOURCE_NOT_FOUND';
      }

      if (status === HttpStatus.CONFLICT) {
        return 'RESOURCE_CONFLICT';
      }

      if (status === HttpStatus.BAD_REQUEST) {
        return 'BAD_REQUEST';
      }
    }

    return 'INTERNAL_PLATFORM_ERROR';
  }

  private resolveFallbackMessage(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) {
      return 'Authentication failed.';
    }

    if (status === HttpStatus.FORBIDDEN) {
      return 'You do not have permission to perform this action.';
    }

    if (status === HttpStatus.NOT_FOUND) {
      return 'The requested resource was not found.';
    }

    if (status === HttpStatus.CONFLICT) {
      return 'Resource already exists.';
    }

    if (status === HttpStatus.BAD_REQUEST) {
      return 'The request could not be processed.';
    }

    return 'An internal platform error occurred.';
  }
}
