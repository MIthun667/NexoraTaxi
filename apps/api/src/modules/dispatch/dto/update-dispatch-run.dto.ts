import { DispatchRunStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class UpdateDispatchRunDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string | null;

  @IsOptional()
  @IsEnum(DispatchRunStatus)
  dispatchStatus?: DispatchRunStatus;
}
