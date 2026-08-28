import {
  DriverAssignmentStatus,
  DriverComplianceStatus,
  DriverOnboardingStatus,
  DriverOperationalStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDriversDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(DriverOnboardingStatus)
  onboardingStatus?: DriverOnboardingStatus;

  @IsOptional()
  @IsEnum(DriverOperationalStatus)
  operationalStatus?: DriverOperationalStatus;

  @IsOptional()
  @IsEnum(DriverComplianceStatus)
  complianceStatus?: DriverComplianceStatus;

  @IsOptional()
  @IsEnum(DriverAssignmentStatus)
  assignmentStatus?: DriverAssignmentStatus;
}
