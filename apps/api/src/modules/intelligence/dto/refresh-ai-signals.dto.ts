import { IsOptional, IsUUID } from 'class-validator';

export class RefreshAiSignalsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
