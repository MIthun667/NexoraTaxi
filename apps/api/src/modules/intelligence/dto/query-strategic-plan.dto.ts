import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class QueryStrategicPlanDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsIn(['current_cycle', 'next_30_days', 'next_quarter'])
  planningWindow?: 'current_cycle' | 'next_30_days' | 'next_quarter';
}
