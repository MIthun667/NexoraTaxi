import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReviewActionProposalDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  actionProposalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
