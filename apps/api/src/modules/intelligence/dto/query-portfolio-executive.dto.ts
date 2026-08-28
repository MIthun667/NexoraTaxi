import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class QueryPortfolioExecutiveDto {
  @IsOptional()
  @IsIn(['healthy', 'limited', 'issue_detected', 'not_connected'])
  status?: 'healthy' | 'limited' | 'issue_detected' | 'not_connected';

  @IsOptional()
  @IsIn(['healthy', 'limited', 'issue_detected', 'not_connected'])
  trustState?: 'healthy' | 'limited' | 'issue_detected' | 'not_connected';

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  attentionOnly?: boolean;
}
