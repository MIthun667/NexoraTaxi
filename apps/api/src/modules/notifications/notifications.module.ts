import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { SharedModule } from '../../shared/shared.module';
import { EventHandlersService } from './event-handlers.service';
import { DomainEventsService } from './domain-events.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [PrismaModule, SharedModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, DomainEventsService, EventHandlersService],
  exports: [NotificationsService, DomainEventsService],
})
export class NotificationsModule {}
