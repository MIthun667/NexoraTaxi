import { IsEnum, IsOptional } from 'class-validator';
import { AgentCategory } from '@prisma/client';

export class QueryAgentDefinitionsDto {
  @IsOptional()
  @IsEnum(AgentCategory)
  category?: AgentCategory;

  @IsOptional()
  isActive?: boolean;
}
