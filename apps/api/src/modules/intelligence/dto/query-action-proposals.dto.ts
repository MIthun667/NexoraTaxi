import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryActionProposalsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION', 'DEFERRED', 'ARCHIVED'])
  status?: string;
}
