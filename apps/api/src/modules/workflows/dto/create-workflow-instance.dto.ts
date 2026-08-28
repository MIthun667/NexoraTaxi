import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { CreateWorkflowTaskDto } from './create-workflow-task.dto';

export class CreateWorkflowInstanceDto {
  @IsUUID()
  definitionId!: string;

  @IsUUID()
  organizationId!: string;

  @IsString()
  @MaxLength(80)
  entityType!: string;

  @IsString()
  @MaxLength(100)
  entityId!: string;

  @IsUUID()
  createdByUserId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowTaskDto)
  initialTasks?: CreateWorkflowTaskDto[];
}
