import {
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
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @Permissions(PlatformPermissions.notificationRead)
  getMyNotifications(@Req() request: Request, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.listMy(request.principal as CurrentPrincipal, query);
  }

  @Get('unread-count')
  @Permissions(PlatformPermissions.notificationRead)
  getUnreadCount(@Req() request: Request) {
    return this.notificationsService.getUnreadCount(request.principal as CurrentPrincipal);
  }

  @Get(':id')
  @Permissions(PlatformPermissions.notificationRead)
  getNotification(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    return this.notificationsService.getById(id, request.principal as CurrentPrincipal);
  }

  @Post(':id/read')
  @Permissions(PlatformPermissions.notificationManage)
  markAsRead(@Param('id', new ParseUUIDPipe()) id: string, @Req() request: Request) {
    return this.notificationsService.markAsRead(id, request.principal as CurrentPrincipal);
  }

  @Post('read-all')
  @Permissions(PlatformPermissions.notificationManage)
  markAllAsRead(@Req() request: Request) {
    return this.notificationsService.markAllAsRead(request.principal as CurrentPrincipal);
  }
}
