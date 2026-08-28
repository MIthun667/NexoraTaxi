import { IsOptional, IsObject } from 'class-validator';

export class PublishSchedulePlanDto {
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
