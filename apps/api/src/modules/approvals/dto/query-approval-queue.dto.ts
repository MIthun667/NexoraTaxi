import { ApprovalStepStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryApprovalQueueDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ApprovalStepStatus)
  status?: ApprovalStepStatus;

  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
