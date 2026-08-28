import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateActionProposalDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  recommendationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
