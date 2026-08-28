import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStrategicPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsIn(['current_cycle', 'next_30_days', 'next_quarter'])
  planningWindow?: 'current_cycle' | 'next_30_days' | 'next_quarter';

  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived';
}
