import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { JwtTokenPayload } from '../interfaces/jwt-token-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async generateAccessToken(payload: JwtTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('environment.jwtAccessSecret'),
      expiresIn: this.configService.get<string>(
        'environment.jwtAccessExpires',
        '15m',
      ) as never,
    });
  }

  async generateRefreshToken(payload: JwtTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('environment.jwtRefreshSecret'),
      expiresIn: this.configService.get<string>(
        'environment.jwtRefreshExpires',
        '7d',
      ) as never,
    });
  }

  async verifyAccessToken(token: string): Promise<JwtTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('environment.jwtAccessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Authentication token is invalid or expired.');
    }
  }

  async verifyRefreshToken(token: string): Promise<JwtTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('environment.jwtRefreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
  }
}
