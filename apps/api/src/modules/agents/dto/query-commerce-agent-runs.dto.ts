import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AgentRunStatus, AgentTriggerType } from '@prisma/client';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCommerceAgentRunsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  agentKey?: string;

  @IsOptional()
  @IsEnum(AgentRunStatus)
  status?: AgentRunStatus;

  @IsOptional()
  @IsEnum(AgentTriggerType)
  triggerType?: AgentTriggerType;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
