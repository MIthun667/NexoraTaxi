import { IsOptional, IsUUID } from 'class-validator';

export class ManageConnectedStoreDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
