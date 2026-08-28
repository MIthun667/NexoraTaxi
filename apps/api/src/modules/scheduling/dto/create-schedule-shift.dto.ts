import { ScheduleShiftStatus, ShiftType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScheduleShiftDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  schedulePlanId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(40)
  shiftCode!: string;

  @IsEnum(ShiftType)
  shiftType!: ShiftType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsEnum(ScheduleShiftStatus)
  status?: ScheduleShiftStatus;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityRequired?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityAllocated?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
