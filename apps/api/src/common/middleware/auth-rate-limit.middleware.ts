import { createHash } from 'node:crypto';

import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

import { RedisService } from '../../modules/jobs/redis.service';

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthRateLimitMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async use(request: Request, response: Response, next: NextFunction) {
    const ttlSeconds = this.configService.get<number>('environment.authRateLimitTtl', 60);
    const limit = this.configService.get<number>('environment.authRateLimitLimit', 10);
    const nodeEnv = this.configService.get<string>('environment.nodeEnv', 'development');
    const identity = `${request.method}:${request.baseUrl}${request.path}:${request.ip ?? 'unknown'}`;
    const keyHash = createHash('sha256').update(identity).digest('hex');
    const key = `nexora:${nodeEnv}:auth-rate-limit:${keyHash}`;

    try {
      const { count, ttl } = await this.redisService.incrementWithTtl(key, ttlSeconds);

      if (count > limit) {
        response.setHeader('Retry-After', String(Math.max(ttl, 1)));
        next(
          new HttpException(
            'Too many authentication requests were received. Please try again shortly.',
            HttpStatus.TOO_MANY_REQUESTS,
          ),
        );
        return;
      }

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        next(error);
        return;
      }

      this.logger.error('Redis-backed authentication rate limiting is unavailable.');
      next(
        new ServiceUnavailableException(
          'Authentication is temporarily unavailable because request protection is not ready.',
        ),
      );
    }
  }
}
