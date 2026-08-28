import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class PublishDomainEventDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsString()
  eventType!: string;

  @IsString()
  aggregateType!: string;

  @IsOptional()
  @IsString()
  aggregateId?: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  triggeredByUserId?: string;
}
