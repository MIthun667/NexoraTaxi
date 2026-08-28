import {
  CredentialDocumentType,
  CredentialVerificationStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCredentialDocumentDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsEnum(CredentialDocumentType)
  documentType!: CredentialDocumentType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  documentNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  issuingAuthority?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsEnum(CredentialVerificationStatus)
  verificationStatus?: CredentialVerificationStatus;

  @IsOptional()
  @IsUUID()
  verifiedByUserId?: string;

  @IsOptional()
  @IsDateString()
  verifiedAt?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  storageUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
