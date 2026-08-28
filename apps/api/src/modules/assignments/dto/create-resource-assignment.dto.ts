import { AssignmentType, ResourceAssignmentStatus } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateResourceAssignmentDto {
  @IsUUID()
  organizationId!: string;

  @IsEnum(AssignmentType)
  assignmentType!: AssignmentType;

  @IsOptional()
  @IsEnum(ResourceAssignmentStatus)
  status?: ResourceAssignmentStatus;

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

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
