import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStrategicPriorityDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsIn(['revenue', 'customers', 'integrations', 'operations', 'trust', 'payments', 'catalog'])
  category!: 'revenue' | 'customers' | 'integrations' | 'operations' | 'trust' | 'payments' | 'catalog';

  @IsOptional()
  @IsIn(['identified', 'in_progress', 'blocked', 'completed'])
  status?: 'identified' | 'in_progress' | 'blocked' | 'completed';

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  urgency?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsArray()
  @Type(() => String)
  successCriteria?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  owner?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  linkedSignals?: unknown[];

  @IsOptional()
  linkedRecommendations?: unknown[];

  @IsOptional()
  linkedProposals?: unknown[];

  @IsOptional()
  linkedScenarios?: unknown[];

  @IsOptional()
  linkedExecutions?: unknown[];

  @IsOptional()
  linkedAgentRuns?: unknown[];

  @IsOptional()
  linkedOutcomeSummary?: Record<string, unknown> | null;
}
