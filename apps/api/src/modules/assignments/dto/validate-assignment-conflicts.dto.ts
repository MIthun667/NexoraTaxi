import { AssignmentType } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ValidateAssignmentConflictsDto {
  @IsUUID()
  organizationId!: string;

  @IsEnum(AssignmentType)
  assignmentType!: AssignmentType;

  @IsOptional()
  @IsUUID()
  workforceMemberId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;
}
