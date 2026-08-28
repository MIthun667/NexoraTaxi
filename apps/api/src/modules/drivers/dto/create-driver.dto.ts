import {
  DriverAssignmentStatus,
  DriverComplianceStatus,
  DriverOnboardingStatus,
  DriverOperationalStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateDriverDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(32)
  driverCode!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  workEmail?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  licenseNumber!: string;

  @IsOptional()
  @IsDateString()
  licenseIssuedAt?: string;

  @IsOptional()
  @IsDateString()
  licenseExpiresAt?: string;

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

  @IsDateString()
  joinedAt!: string;
}
