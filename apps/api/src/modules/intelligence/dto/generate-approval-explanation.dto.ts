import { IsOptional, IsUUID } from 'class-validator';

export class GenerateApprovalExplanationDto {
  @IsOptional()
  @IsUUID()
  approvalRequestId?: string;

  @IsOptional()
  @IsUUID()
  approvalStepId?: string;
}
