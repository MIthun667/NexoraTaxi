import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AgentActionProposalStatus } from '@prisma/client';

export class ReviewAgentActionProposalDto {
  @IsEnum(AgentActionProposalStatus)
  status!: AgentActionProposalStatus;

  @IsOptional()
  @IsString()
  reviewerComment?: string;
}
