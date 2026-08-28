import { DispatchRunStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDispatchRunDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  assignmentId!: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  runCode!: string;

  @IsOptional()
  @IsEnum(DispatchRunStatus)
  dispatchStatus?: DispatchRunStatus;
}
