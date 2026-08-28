import { IsOptional, IsUUID } from 'class-validator';

export class QueryLearningInsightsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
