import { IsObject, IsOptional } from 'class-validator';

export class ReleaseResourceAssignmentDto {
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
