import { WorkOrderStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class TransitionWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
