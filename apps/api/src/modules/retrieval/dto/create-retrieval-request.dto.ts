import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { RETRIEVAL_HARD_MAX_RECORDS } from '../retrieval.constants';
import { RetrievalType } from '../retrieval.types';

export class CreateRetrievalRequestDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  agentRunId?: string;

  @IsString()
  targetEntityType!: string;

  @IsOptional()
  @IsString()
  targetEntityId?: string;

  @IsArray()
  @ArrayMaxSize(6)
  retrievalTypes!: RetrievalType[];

  @IsOptional()
  @IsDateString()
  timeWindowFrom?: string;

  @IsOptional()
  @IsDateString()
  timeWindowTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(RETRIEVAL_HARD_MAX_RECORDS)
  maxRecords?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeRelated?: boolean;
}
