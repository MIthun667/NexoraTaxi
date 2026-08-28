import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { CurrentPrincipal } from '../../../common/interfaces/current-principal.interface';
import { RbacService } from '../../authz/rbac.service';
import { SignedJwtTokenPayload } from '../interfaces/jwt-token-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly rbacService: RbacService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('environment.jwtAccessSecret'),
    });
  }

  async validate(payload: SignedJwtTokenPayload): Promise<CurrentPrincipal> {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Authentication token has an invalid purpose.');
    }

    try {
      return await this.rbacService.resolvePrincipal({
        userId: payload.userId,
        email: payload.email,
      });
    } catch {
      throw new UnauthorizedException('Authentication token is invalid or expired.');
    }
  }
}
