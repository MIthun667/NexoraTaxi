import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ListWorkforceMembersQueryDto } from './dto/list-workforce-members-query.dto';
import { CreateCredentialDocumentDto } from './dto/create-credential-document.dto';
import { CreateWorkforceMemberDto } from './dto/create-workforce-member.dto';
import { UpdateWorkforceMemberDto } from './dto/update-workforce-member.dto';
import { UpdateCredentialDocumentDto } from './dto/update-credential-document.dto';
import { UpdateWorkforceStatusDto } from './dto/update-workforce-status.dto';
import { VerifyCredentialDocumentDto } from './dto/verify-credential-document.dto';
import { WorkforceCredentialService } from './workforce-credential.service';
import { WorkforceQueryService } from './workforce-query.service';
import { WorkforceStatusService } from './workforce-status.service';
import { WorkforceService } from './workforce.service';

@Controller('workforce')
@Permissions(PlatformPermissions.operatorRead)
export class WorkforceController {
  constructor(
    private readonly workforceService: WorkforceService,
    private readonly workforceQueryService: WorkforceQueryService,
    private readonly workforceStatusService: WorkforceStatusService,
    private readonly workforceCredentialService: WorkforceCredentialService,
  ) {}

  @Post()
  @Permissions(PlatformPermissions.operatorManage)
  create(@Req() request: Request, @Body() dto: CreateWorkforceMemberDto) {
    return this.workforceService.create(dto, request.principal);
  }

  @Get()
  findAll(@Req() request: Request, @Query() query: ListWorkforceMembersQueryDto) {
    return this.workforceQueryService.listWorkforceMembers(query, request.principal);
  }

  @Get(':id')
  findOne(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.workforceQueryService.getWorkforceMemberDetail(id, request.principal);
  }

  @Patch(':id')
  @Permissions(PlatformPermissions.operatorManage)
  update(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateWorkforceMemberDto,
  ) {
    return this.workforceService.update(id, dto, request.principal);
  }

  @Delete(':id')
  @Permissions(PlatformPermissions.operatorManage)
  archive(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.workforceService.archive(id, request.principal);
  }

  @Post(':id/credentials')
  @Permissions(PlatformPermissions.operatorDocumentManage)
  addCredential(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: CreateCredentialDocumentDto,
  ) {
    return this.workforceCredentialService.createCredential(id, dto, request.principal);
  }

  @Get(':id/credentials')
  listCredentials(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.workforceCredentialService.listCredentials(id, request.principal);
  }

  @Patch('credentials/:credentialId/verify')
  @Permissions(PlatformPermissions.operatorDocumentManage)
  verifyCredential(
    @Req() request: Request,
    @Param('credentialId', new ParseUUIDPipe()) credentialId: string,
    @Body() dto: VerifyCredentialDocumentDto,
  ) {
    return this.workforceCredentialService.verifyCredential(
      credentialId,
      dto,
      request.principal,
    );
  }

  @Patch('credentials/:credentialId')
  @Permissions(PlatformPermissions.operatorDocumentManage)
  updateCredential(
    @Req() request: Request,
    @Param('credentialId', new ParseUUIDPipe()) credentialId: string,
    @Body() dto: UpdateCredentialDocumentDto,
  ) {
    return this.workforceCredentialService.updateCredential(
      credentialId,
      dto,
      request.principal,
    );
  }

  @Post(':id/status')
  @Permissions(PlatformPermissions.operatorStatusManage)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
    @Body() dto: UpdateWorkforceStatusDto,
  ) {
    return this.workforceStatusService.updateStatus(id, dto, request.principal);
  }

  @Get(':id/status-history')
  getStatusHistory(
    @Req() request: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.workforceQueryService.getWorkforceHistory(id, request.principal);
  }

  @Get(':id/history')
  getHistory(@Req() request: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.workforceQueryService.getWorkforceHistory(id, request.principal);
  }
}
