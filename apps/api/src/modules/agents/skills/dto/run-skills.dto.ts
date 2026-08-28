import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class RunSkillsDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  agentRunId!: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillIds?: string[];
}
