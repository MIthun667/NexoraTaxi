import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(private readonly configService: ConfigService) {}

  use(request: Request, response: Response, next: NextFunction) {
    const ttlSeconds = this.configService.get<number>('environment.authRateLimitTtl', 60);
    const limit = this.configService.get<number>('environment.authRateLimitLimit', 10);
    const key = `${request.method}:${request.baseUrl}${request.path}:${request.ip}`;
    const now = Date.now();

    this.cleanup(now);

    const current = this.entries.get(key);

    if (!current || current.resetAt <= now) {
      this.entries.set(key, {
        count: 1,
        resetAt: now + ttlSeconds * 1000,
      });
      next();
      return;
    }

    if (current.count >= limit) {
      response.setHeader('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      next(
        new HttpException(
          'Too many authentication requests were received. Please try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );
      return;
    }

    current.count += 1;
    this.entries.set(key, current);
    next();
  }

  private cleanup(now: number) {
    for (const [key, value] of this.entries.entries()) {
      if (value.resetAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}
