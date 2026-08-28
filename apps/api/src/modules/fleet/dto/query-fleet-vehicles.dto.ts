import {
  FleetAssignmentStatus,
  FleetComplianceStatus,
  FleetOnboardingStatus,
  FleetOperationalStatus,
  FleetVehicleClass,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryFleetVehiclesDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsEnum(FleetVehicleClass)
  vehicleClass?: FleetVehicleClass;

  @IsOptional()
  @IsEnum(FleetOnboardingStatus)
  onboardingStatus?: FleetOnboardingStatus;

  @IsOptional()
  @IsEnum(FleetOperationalStatus)
  operationalStatus?: FleetOperationalStatus;

  @IsOptional()
  @IsEnum(FleetComplianceStatus)
  complianceStatus?: FleetComplianceStatus;

  @IsOptional()
  @IsEnum(FleetAssignmentStatus)
  assignmentStatus?: FleetAssignmentStatus;
}
