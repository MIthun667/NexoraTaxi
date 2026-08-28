import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AskExecutiveQaDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  question!: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
