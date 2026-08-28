import { IsIn, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAgentTriggersDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsIn([
    'scheduled',
    'signal_triggered',
    'execution_followup',
    'manual',
  ])
  triggerType?: string;

  @IsOptional()
  @IsIn(['pending', 'processed', 'skipped', 'failed'])
  status?: string;

  @IsOptional()
  agentKey?: string;
}
