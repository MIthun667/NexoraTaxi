import { IsOptional, IsUUID } from 'class-validator';

export class GenerateAiRecommendationsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
