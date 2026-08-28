import {
  DispatchIncidentSeverity,
  DispatchIncidentStatus,
  DispatchIncidentType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateDispatchIncidentDto {
  @IsOptional()
  @IsUUID()
  runId?: string | null;

  @IsOptional()
  @IsUUID()
  assignmentId?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  incidentCode?: string;

  @IsOptional()
  @IsEnum(DispatchIncidentType)
  incidentType?: DispatchIncidentType;

  @IsOptional()
  @IsEnum(DispatchIncidentSeverity)
  severity?: DispatchIncidentSeverity;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @IsEnum(DispatchIncidentStatus)
  status?: DispatchIncidentStatus;

  @IsOptional()
  @IsUUID()
  reportedByUserId?: string | null;

  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}
