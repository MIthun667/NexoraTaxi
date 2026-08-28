import { IncidentActionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIncidentActionDto {
  @IsEnum(IncidentActionType)
  actionType!: IncidentActionType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  summary!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
