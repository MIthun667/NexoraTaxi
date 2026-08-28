import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { AuthzModule } from '../authz/authz.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), PrismaModule, AuthzModule, SharedModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, JwtStrategy, JwtAuthGuard],
  exports: [TokenService, PasswordService, JwtAuthGuard],
})
export class AuthModule {}
