import { IsOptional, IsUUID } from 'class-validator';

export class RefreshAiDataTrustDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
