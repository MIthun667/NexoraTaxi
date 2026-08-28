import { IsUUID } from 'class-validator';

export class GenerateAiWeeklyDigestDto {
  @IsUUID()
  organizationId!: string;
}
