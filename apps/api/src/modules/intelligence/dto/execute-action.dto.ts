import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ExecuteActionDto {
  @IsUUID()
  proposalId: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}

export class ReviewActionDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
