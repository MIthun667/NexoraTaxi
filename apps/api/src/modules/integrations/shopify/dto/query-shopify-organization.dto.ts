import { IsUUID } from 'class-validator';

export class QueryShopifyOrganizationDto {
  @IsUUID()
  organizationId!: string;
}
