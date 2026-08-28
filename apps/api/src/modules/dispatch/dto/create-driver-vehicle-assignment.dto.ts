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

export class CreateDriverVehicleAssignmentDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  driverId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsOptional()
  @IsEnum(DriverVehicleAssignmentStatus)
  assignmentStatus?: DriverVehicleAssignmentStatus;

  @IsOptional()
  @IsDateString()
  assignedAt?: string;

  @IsOptional()
  @IsUUID()
  assignedByUserId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
