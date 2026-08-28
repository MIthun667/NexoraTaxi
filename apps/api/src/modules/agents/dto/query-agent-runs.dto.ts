import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AgentRunStatus, AgentTriggerType } from '@prisma/client';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAgentRunsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  agentCode?: string;

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
