import { IsString, IsUUID, MaxLength } from 'class-validator';

export class ConnectShopifyDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @MaxLength(255)
  shopDomain!: string;
}
