import { SchedulePlanStatus, SchedulePlanType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSchedulePlanDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsEnum(SchedulePlanType)
  planType?: SchedulePlanType;

  @IsOptional()
  @IsEnum(SchedulePlanStatus)
  status?: SchedulePlanStatus;

  @IsOptional()
  @IsDateString()
  planningWindowStart?: string;

  @IsOptional()
  @IsDateString()
  planningWindowEnd?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
