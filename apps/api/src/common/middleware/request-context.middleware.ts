import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { PlatformLoggerService } from '../services/platform-logger.service';
import { RequestContextStorage } from '../utils/request-context.util';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly logger: PlatformLoggerService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const requestId = this.readRequestId(request) ?? randomUUID();
    const startedAt = Date.now();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    this.applySecurityHeaders(response);

    this.logger.debug({
      event: 'request.received',
      requestId,
      method: request.method,
      path: request.originalUrl || request.url,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    });

    RequestContextStorage.run(
      {
        requestId,
        request,
        response,
        startedAt,
      },
      () => {
        response.on('finish', () => {
          const durationMs = Date.now() - startedAt;
          const principal = request.principal ?? request.user;

          this.logger.log({
            event: 'request.completed',
            requestId,
            method: request.method,
            path: request.originalUrl || request.url,
            statusCode: response.statusCode,
            durationMs,
            userId: principal?.userId,
            organizationId: principal?.organizationId,
          });
        });

        next();
      },
    );
  }

  private readRequestId(request: Request) {
    const incoming = request.header('x-request-id');
    return incoming && incoming.trim().length > 0 ? incoming.trim() : undefined;
  }

  private applySecurityHeaders(response: Response) {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-DNS-Prefetch-Control', 'off');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
}
