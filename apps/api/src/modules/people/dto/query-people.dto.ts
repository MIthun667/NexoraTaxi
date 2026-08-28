import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPeopleDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  /**
   * Prefer `workforce` for new development.
   * `drivers` remains a legacy compatibility source while contributor-facing people/workforce
   * surfaces continue to replace taxi-era contracts.
   */
  @IsOptional()
  @IsIn(['workforce', 'drivers'])
  sourceModule?: 'workforce' | 'drivers';
}
