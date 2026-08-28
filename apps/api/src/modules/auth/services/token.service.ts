import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import {
  JwtTokenPayload,
  SignedJwtTokenPayload,
} from '../interfaces/jwt-token-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async generateAccessToken(payload: JwtTokenPayload): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, tokenType: 'access' } satisfies SignedJwtTokenPayload,
      {
        secret: this.configService.getOrThrow<string>('environment.jwtAccessSecret'),
        expiresIn: this.configService.get<string>(
          'environment.jwtAccessExpires',
          '15m',
        ) as never,
      },
    );
  }

  async generateRefreshToken(payload: JwtTokenPayload): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload, tokenType: 'refresh' } satisfies SignedJwtTokenPayload,
      {
        secret: this.configService.getOrThrow<string>('environment.jwtRefreshSecret'),
        expiresIn: this.configService.get<string>(
          'environment.jwtRefreshExpires',
          '7d',
        ) as never,
      },
    );
  }

  async verifyAccessToken(token: string): Promise<JwtTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<SignedJwtTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('environment.jwtAccessSecret'),
      });

      if (payload.tokenType !== 'access') {
        throw new UnauthorizedException('Authentication token has an invalid purpose.');
      }

      return this.toJwtTokenPayload(payload);
    } catch {
      throw new UnauthorizedException('Authentication token is invalid or expired.');
    }
  }

  async verifyRefreshToken(token: string): Promise<JwtTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<SignedJwtTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('environment.jwtRefreshSecret'),
      });

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Refresh token has an invalid purpose.');
      }

      return this.toJwtTokenPayload(payload);
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
  }

  private toJwtTokenPayload(payload: SignedJwtTokenPayload): JwtTokenPayload {
    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      email: payload.email,
    };
  }
}
