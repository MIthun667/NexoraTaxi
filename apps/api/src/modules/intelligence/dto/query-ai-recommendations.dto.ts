import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class QueryAiRecommendationsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsIn([
    'improve_visibility',
    'review_sync_health',
    'monitor_revenue_decline',
    'investigate_customer_slowdown',
    'reduce_product_concentration',
    'review_payment_reliability',
    'capitalize_on_demand_spike',
    'validate_unusual_change',
  ])
  type?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  urgency?: string;

  @IsOptional()
  @IsIn(['revenue', 'orders', 'customers', 'products', 'integrations', 'payments', 'data_quality'])
  affectedArea?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  confidence?: string;

  @IsOptional()
  @IsIn(['active', 'archived', 'superseded'])
  status?: string;
}
