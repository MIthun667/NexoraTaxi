import { IsOptional, IsUUID } from 'class-validator';

export class OrchestrateCommerceAgentsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
