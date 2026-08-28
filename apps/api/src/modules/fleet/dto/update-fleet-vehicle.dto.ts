import {
  FleetAssignmentStatus,
  FleetComplianceStatus,
  FleetOnboardingStatus,
  FleetOperationalStatus,
  FleetVehicleClass,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateFleetVehicleDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(32)
  vehicleCode?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  plateNumber?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  vin?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  make?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  modelYear?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  color?: string | null;

  @IsOptional()
  @IsEnum(FleetVehicleClass)
  vehicleClass?: FleetVehicleClass;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  registrationNumber?: string | null;

  @IsOptional()
  @IsDateString()
  registrationIssuedAt?: string | null;

  @IsOptional()
  @IsDateString()
  registrationExpiresAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  insurancePolicyNumber?: string | null;

  @IsOptional()
  @IsDateString()
  insuranceExpiresAt?: string | null;

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

  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
