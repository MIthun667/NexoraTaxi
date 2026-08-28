import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { ActOnApprovalStepDto } from './dto/act-on-approval-step.dto';
import { CreateApprovalRequestDto } from './dto/create-approval-request.dto';
import { QueryApprovalQueueDto } from './dto/query-approval-queue.dto';
import { ApprovalsService } from './approvals.service';

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('requests')
  @Permissions(PlatformPermissions.approvalRequestCreate)
  createRequest(@Body() dto: CreateApprovalRequestDto) {
    return this.approvalsService.createRequest(dto);
  }

  @Get('requests/:id')
  @Permissions(PlatformPermissions.approvalRead)
  getRequest(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.approvalsService.getRequest(id);
  }

  @Get('queue/my')
  @Permissions(PlatformPermissions.approvalRead)
  getMyQueue(@Req() request: Request, @Query() query: QueryApprovalQueueDto) {
    return this.approvalsService.getMyQueue(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('steps/:id')
  @Permissions(PlatformPermissions.approvalRead)
  getStep(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.approvalsService.getStep(id);
  }

  @Post('steps/:id/actions')
  @Permissions(PlatformPermissions.approvalAct)
  actOnStep(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: ActOnApprovalStepDto,
  ) {
    return this.approvalsService.actOnStep(
      id,
      request.principal as CurrentPrincipal,
      dto,
    );
  }
}
