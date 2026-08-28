import { IsOptional, IsUUID } from 'class-validator';

export class QueryDashboardOverviewDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
