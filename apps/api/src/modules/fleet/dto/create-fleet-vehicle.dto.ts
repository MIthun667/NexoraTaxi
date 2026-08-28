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

export class CreateFleetVehicleDto {
  @IsUUID()
  organizationId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(32)
  vehicleCode!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  plateNumber!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  vin?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  make!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  model!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  modelYear!: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsEnum(FleetVehicleClass)
  vehicleClass!: FleetVehicleClass;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  registrationNumber?: string;

  @IsOptional()
  @IsDateString()
  registrationIssuedAt?: string;

  @IsOptional()
  @IsDateString()
  registrationExpiresAt?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  insurancePolicyNumber?: string;

  @IsOptional()
  @IsDateString()
  insuranceExpiresAt?: string;

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

  @IsDateString()
  joinedAt!: string;
}
