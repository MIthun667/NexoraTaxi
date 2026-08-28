import { IsUUID } from 'class-validator';

export class QueryStripeOrganizationDto {
  @IsUUID()
  organizationId!: string;
}
