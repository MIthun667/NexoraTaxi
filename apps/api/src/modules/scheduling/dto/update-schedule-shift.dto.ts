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

export class UpdateScheduleShiftDto {
  @IsOptional()
  @IsUUID()
  schedulePlanId?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(40)
  shiftCode?: string;

  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsEnum(ScheduleShiftStatus)
  status?: ScheduleShiftStatus;

  @IsOptional()
  @IsUUID()
  zoneId?: string | null;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityRequired?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacityAllocated?: number | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
