import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(error: unknown, user: TUser): TUser {
    if (error || !user) {
      throw new UnauthorizedException('Authentication token is invalid or missing.');
    }

    return user;
  }
}
