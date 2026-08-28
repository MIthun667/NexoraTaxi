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

export class UpdateDriverDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string | null;

  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(32)
  driverCode?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value === null ? value : value,
  )
  @IsEmail()
  @MaxLength(255)
  workEmail?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(30)
  phoneNumber?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  licenseNumber?: string;

  @IsOptional()
  @IsDateString()
  licenseIssuedAt?: string | null;

  @IsOptional()
  @IsDateString()
  licenseExpiresAt?: string | null;

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

  @IsOptional()
  @IsDateString()
  joinedAt?: string;
}
