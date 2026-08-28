import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class GenerateStrategicReviewDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsIn(['last_7_days', 'current_week', 'last_30_days'])
  reviewWindow?: 'last_7_days' | 'current_week' | 'last_30_days';
}
