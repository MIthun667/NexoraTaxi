import { IsOptional, IsUUID } from 'class-validator';

export class GenerateAiExecutiveSummaryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
