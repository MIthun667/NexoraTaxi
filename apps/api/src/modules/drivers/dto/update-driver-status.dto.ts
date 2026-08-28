import {
  DriverAssignmentStatus,
  DriverComplianceStatus,
  DriverOnboardingStatus,
  DriverOperationalStatus,
  DriverStatusCategory,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatusCategory)
  statusCategory!: DriverStatusCategory;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  newValue!:
    | DriverOnboardingStatus
    | DriverOperationalStatus
    | DriverComplianceStatus
    | DriverAssignmentStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;
}
