import { WorkforceStatusCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWorkforceStatusDto {
  @IsEnum(WorkforceStatusCategory)
  category!: WorkforceStatusCategory;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @MaxLength(80)
  nextValue!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
