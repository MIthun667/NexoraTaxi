import {
  WorkforceAvailabilityStatus,
  WorkforceComplianceStatus,
  WorkforceEmploymentModel,
  WorkforceMemberType,
  WorkforceOperationalStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateWorkforceMemberDto {
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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(40)
  workerCode?: string;

  @IsOptional()
  @IsEnum(WorkforceMemberType)
  workerType?: WorkforceMemberType;

  @IsOptional()
  @IsEnum(WorkforceEmploymentModel)
  employmentModel?: WorkforceEmploymentModel | null;

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
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  displayName?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(255)
  workEmail?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(30)
  phoneNumber?: string | null;

  @IsOptional()
  @IsEnum(WorkforceOperationalStatus)
  operationalStatus?: WorkforceOperationalStatus;

  @IsOptional()
  @IsEnum(WorkforceComplianceStatus)
  complianceStatus?: WorkforceComplianceStatus;

  @IsOptional()
  @IsEnum(WorkforceAvailabilityStatus)
  availabilityStatus?: WorkforceAvailabilityStatus;

  @IsOptional()
  @IsUUID()
  primaryDepartmentId?: string | null;

  @IsOptional()
  @IsUUID()
  primaryPositionId?: string | null;

  @IsOptional()
  @IsUUID()
  homeZoneId?: string | null;

  @IsOptional()
  @IsObject()
  skills?: Record<string, unknown> | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
