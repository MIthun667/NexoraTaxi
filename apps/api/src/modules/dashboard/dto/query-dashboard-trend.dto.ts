import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID } from 'class-validator';

export class QueryDashboardTrendDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 30, 90])
  days?: number = 7;
}
