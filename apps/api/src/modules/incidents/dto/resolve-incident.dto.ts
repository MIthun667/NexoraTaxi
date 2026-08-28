import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveIncidentDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
