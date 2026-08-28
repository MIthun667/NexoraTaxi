import { IsUUID } from 'class-validator';

export class RefreshActionProposalsDto {
  @IsUUID()
  organizationId!: string;
}
