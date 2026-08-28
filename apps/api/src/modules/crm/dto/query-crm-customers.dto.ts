import { IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCrmCustomersDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
