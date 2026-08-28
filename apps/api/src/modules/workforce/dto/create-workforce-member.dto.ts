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

export class CreateWorkforceMemberDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(40)
  workerCode!: string;

  @IsEnum(WorkforceMemberType)
  workerType!: WorkforceMemberType;

  @IsOptional()
  @IsEnum(WorkforceEmploymentModel)
  employmentModel?: WorkforceEmploymentModel;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  displayName?: string;

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
  primaryDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  primaryPositionId?: string;

  @IsOptional()
  @IsUUID()
  homeZoneId?: string;

  @IsOptional()
  @IsObject()
  skills?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
