import {
  AssetAvailabilityStatus,
  AssetComplianceStatus,
  AssetOperationalStatus,
  AssetType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAssetsDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(AssetType)
  assetType?: AssetType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  assetClass?: string;

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
}
