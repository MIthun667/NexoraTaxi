import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ConnectStripeDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @MinLength(16)
  @MaxLength(255)
  secretKey!: string;
}
