import { ActionOutcomeType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RecordLearningOutcomeDto {
  @IsUUID()
  executionId!: string;

  @IsEnum(ActionOutcomeType)
  outcomeType!: ActionOutcomeType;

  @IsOptional()
  @IsNumber()
  outcomeScore?: number;

  @IsOptional()
  @IsObject()
  impactMetrics?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
