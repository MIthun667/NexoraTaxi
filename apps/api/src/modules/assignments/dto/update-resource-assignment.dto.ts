import { AssignmentType, ResourceAssignmentStatus } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';

export class UpdateResourceAssignmentDto {
  @IsOptional()
  @IsEnum(AssignmentType)
  assignmentType?: AssignmentType;

  @IsOptional()
  @IsEnum(ResourceAssignmentStatus)
  status?: ResourceAssignmentStatus;

  @IsOptional()
  @IsUUID()
  workforceMemberId?: string | null;

  @IsOptional()
  @IsUUID()
  assetId?: string | null;

  @IsOptional()
  @IsUUID()
  shiftId?: string | null;

  @IsOptional()
  @IsUUID()
  workOrderId?: string | null;

  @IsOptional()
  @IsUUID()
  zoneId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
