import {
  FleetAssignmentStatus,
  FleetComplianceStatus,
  FleetOnboardingStatus,
  FleetOperationalStatus,
  FleetStatusCategory,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFleetStatusDto {
  @IsEnum(FleetStatusCategory)
  statusCategory!: FleetStatusCategory;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  newValue!:
    | FleetOnboardingStatus
    | FleetOperationalStatus
    | FleetComplianceStatus
    | FleetAssignmentStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;
}
