import { AgentActionProposalStatus, AgentRiskLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAgentActionProposalsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AgentActionProposalStatus)
  status?: AgentActionProposalStatus;

  @IsOptional()
  @IsEnum(AgentRiskLevel)
  riskLevel?: AgentRiskLevel;

  @IsOptional()
  @IsString()
  agentCode?: string;
}
