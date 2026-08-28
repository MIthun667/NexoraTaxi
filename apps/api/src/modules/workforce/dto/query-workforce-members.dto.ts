import {
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceMemberType,
  WorkforceOperationalStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryWorkforceMembersDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  positionId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsEnum(WorkforceMemberType)
  workerType?: WorkforceMemberType;

  @IsOptional()
  @IsEnum(WorkforceOperationalStatus)
  operationalStatus?: WorkforceOperationalStatus;

  @IsOptional()
  @IsEnum(WorkforceComplianceStatus)
  complianceStatus?: WorkforceComplianceStatus;

  @IsOptional()
  @IsEnum(WorkforceAvailabilityStatus)
  availabilityStatus?: WorkforceAvailabilityStatus;
}
