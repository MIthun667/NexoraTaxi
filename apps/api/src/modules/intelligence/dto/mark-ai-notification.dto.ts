import { IsUUID } from 'class-validator';

export class MarkAiNotificationDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  notificationId!: string;
}
