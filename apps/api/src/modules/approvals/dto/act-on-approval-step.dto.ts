import { ApprovalDecisionType } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ActOnApprovalStepDto {
  @IsEnum(ApprovalDecisionType)
  decisionType!: ApprovalDecisionType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
