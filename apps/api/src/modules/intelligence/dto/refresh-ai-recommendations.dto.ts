import { IsOptional, IsUUID } from 'class-validator';

export class RefreshAiRecommendationsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
