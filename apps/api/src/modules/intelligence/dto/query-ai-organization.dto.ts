import { IsOptional, IsUUID } from 'class-validator';

export class QueryAiOrganizationDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
