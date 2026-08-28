import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AnalyzeScenarioDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsString()
  @MaxLength(120)
  scenarioType!: string;

  @IsOptional()
  @IsUUID()
  proposalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actionExecutionType?: string;
}
