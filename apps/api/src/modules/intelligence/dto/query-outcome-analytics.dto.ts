import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class QueryOutcomeAnalyticsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(180)
  lookbackDays?: number;
}
