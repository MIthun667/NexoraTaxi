import {
  DispatchIncidentSeverity,
  DispatchIncidentStatus,
  DispatchIncidentType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDispatchIncidentsDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  runId?: string;

  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @IsOptional()
  @IsEnum(DispatchIncidentType)
  incidentType?: DispatchIncidentType;

  @IsOptional()
  @IsEnum(DispatchIncidentSeverity)
  severity?: DispatchIncidentSeverity;

  @IsOptional()
  @IsEnum(DispatchIncidentStatus)
  status?: DispatchIncidentStatus;
}
