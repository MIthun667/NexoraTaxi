import { CredentialVerificationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class VerifyCredentialDocumentDto {
  @IsEnum(CredentialVerificationStatus)
  verificationStatus!: CredentialVerificationStatus;

  @IsOptional()
  @IsDateString()
  verifiedAt?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
