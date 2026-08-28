import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShopifyCallbackDto {
  @IsString()
  @MaxLength(255)
  shop!: string;

  @IsString()
  code!: string;

  @IsString()
  hmac!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
