import { DriverVehicleAssignmentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateDriverVehicleAssignmentDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string | null;

  @IsOptional()
  @IsUUID()
  shiftId?: string | null;

  @IsOptional()
  @IsEnum(DriverVehicleAssignmentStatus)
  assignmentStatus?: DriverVehicleAssignmentStatus;

  @IsOptional()
  @IsDateString()
  assignedAt?: string;

  @IsOptional()
  @IsUUID()
  assignedByUserId?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}
