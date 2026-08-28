import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { CreateApprovalStepDto } from './create-approval-step.dto';

export class CreateApprovalRequestDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  workflowInstanceId?: string;

  @IsString()
  @MaxLength(80)
  entityType!: string;

  @IsString()
  @MaxLength(100)
  entityId!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsUUID()
  requestedByUserId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalStepDto)
  steps!: CreateApprovalStepDto[];
}
