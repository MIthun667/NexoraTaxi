import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class QueryAiSignalsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsIn([
    'revenue_drop',
    'order_slowdown',
    'customer_slowdown',
    'product_concentration_risk',
    'sync_issue',
    'payment_visibility_gap',
    'data_coverage_limit',
    'demand_spike',
    'unusual_change',
  ])
  type?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsOptional()
  @IsIn(['revenue', 'orders', 'customers', 'products', 'integrations', 'payments', 'data_quality'])
  affectedArea?: string;

  @IsOptional()
  @IsIn(['fresh', 'delayed', 'stale'])
  freshnessStatus?: string;
}
