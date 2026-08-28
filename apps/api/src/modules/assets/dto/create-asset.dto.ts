import {
  AssetAvailabilityStatus,
  AssetComplianceStatus,
  AssetOperationalStatus,
  AssetType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAssetDto {
  @IsUUID()
  organizationId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(40)
  assetCode!: string;

  @IsEnum(AssetType)
  assetType!: AssetType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  assetClass?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  serialNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  registrationNumber?: string;

  @IsOptional()
  @IsEnum(AssetOperationalStatus)
  operationalStatus?: AssetOperationalStatus;

  @IsOptional()
  @IsEnum(AssetComplianceStatus)
  complianceStatus?: AssetComplianceStatus;

  @IsOptional()
  @IsEnum(AssetAvailabilityStatus)
  availabilityStatus?: AssetAvailabilityStatus;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  ownerOrganizationId?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
