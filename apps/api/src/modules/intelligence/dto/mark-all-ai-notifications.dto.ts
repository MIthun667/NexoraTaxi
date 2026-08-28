import { IsUUID } from 'class-validator';

export class MarkAllAiNotificationsDto {
  @IsUUID()
  organizationId!: string;
}
