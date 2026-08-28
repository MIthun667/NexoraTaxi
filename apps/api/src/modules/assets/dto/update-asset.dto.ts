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

export class UpdateAssetDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(40)
  assetCode?: string;

  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  assetClass?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  serialNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  registrationNumber?: string | null;

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
  zoneId?: string | null;

  @IsOptional()
  @IsUUID()
  ownerOrganizationId?: string | null;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
