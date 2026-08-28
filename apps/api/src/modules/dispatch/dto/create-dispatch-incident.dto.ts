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

export class CreateDispatchIncidentDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  runId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(40)
  incidentCode!: string;

  @IsEnum(DispatchIncidentType)
  incidentType!: DispatchIncidentType;

  @IsEnum(DispatchIncidentSeverity)
  severity!: DispatchIncidentSeverity;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(DispatchIncidentStatus)
  status?: DispatchIncidentStatus;

  @IsOptional()
  @IsUUID()
  reportedByUserId?: string;

  @IsOptional()
  @IsDateString()
  reportedAt?: string;
}
