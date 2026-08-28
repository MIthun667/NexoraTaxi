import {
  NotificationCategory,
  NotificationSeverity,
  NotificationStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../shared/pagination/pagination.util';
import {
  buildPaginatedResponse,
  buildSuccessResponse,
} from '../../shared/responses/response.util';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

const notificationSelect = {
  id: true,
  organizationId: true,
  recipientUserId: true,
  category: true,
  title: true,
  message: true,
  severity: true,
  status: true,
  actionUrl: true,
  entityType: true,
  entityId: true,
  metadata: true,
  readAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.NotificationSelect;

export interface NotificationRecipientSpec {
  organizationId?: string | null;
  userIds?: string[];
  roleCodes?: string[];
  permissionCodes?: string[];
}

export interface CreateNotificationInput extends NotificationRecipientSpec {
  category: NotificationCategory;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  actionUrl?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prismaService: PrismaService) {}

  async listMy(principal: CurrentPrincipal, query: QueryNotificationsDto) {
    const { page, limit, skip } = resolvePagination(query);

    const where: Prisma.NotificationWhereInput = {
      recipientUserId: principal.userId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.status
        ? { status: query.status }
        : { status: { not: NotificationStatus.ARCHIVED } }),
      ...(query.severity ? { severity: query.severity } : {}),
    };

    const [notifications, total] = await this.prismaService.$transaction([
      this.prismaService.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.notification.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Notifications retrieved successfully.',
      notifications,
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getById(id: string, principal: CurrentPrincipal) {
    const notification = await this.prismaService.notification.findFirst({
      where: {
        id,
        recipientUserId: principal.userId,
      },
      select: notificationSelect,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    return buildSuccessResponse('Notification retrieved successfully.', notification);
  }

  async markAsRead(id: string, principal: CurrentPrincipal) {
    await this.ensureRecipientNotification(id, principal.userId);

    const notification = await this.prismaService.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
      select: notificationSelect,
    });

    return buildSuccessResponse('Notification marked as read successfully.', notification);
  }

  async markAllAsRead(principal: CurrentPrincipal) {
    const result = await this.prismaService.notification.updateMany({
      where: {
        recipientUserId: principal.userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return buildSuccessResponse('Notifications marked as read successfully.', {
      updatedCount: result.count,
    });
  }

  async getUnreadCount(principal: CurrentPrincipal) {
    const unreadCount = await this.prismaService.notification.count({
      where: {
        recipientUserId: principal.userId,
        status: NotificationStatus.UNREAD,
      },
    });

    return buildSuccessResponse('Unread notification count retrieved successfully.', {
      unreadCount,
    });
  }

  async createForRecipients(input: CreateNotificationInput) {
    const recipientUserIds = await this.resolveRecipientUserIds({
      organizationId: input.organizationId,
      userIds: input.userIds,
      roleCodes: input.roleCodes,
      permissionCodes: input.permissionCodes,
    });

    if (recipientUserIds.length === 0) {
      return { createdCount: 0 };
    }

    await this.prismaService.notification.createMany({
      data: recipientUserIds.map((recipientUserId) => ({
        organizationId: input.organizationId ?? null,
        recipientUserId,
        category: input.category,
        title: input.title,
        message: input.message,
        severity: input.severity ?? NotificationSeverity.INFO,
        status: NotificationStatus.UNREAD,
        actionUrl: input.actionUrl ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? Prisma.JsonNull,
        readAt: null,
      })),
    });

    return { createdCount: recipientUserIds.length };
  }

  async resolveRecipientUserIds(spec: NotificationRecipientSpec) {
    const directUserIds = spec.userIds ?? [];
    const roleCodes = spec.roleCodes ?? [];
    const permissionCodes = spec.permissionCodes ?? [];

    if (
      directUserIds.length === 0 &&
      roleCodes.length === 0 &&
      permissionCodes.length === 0
    ) {
      return [];
    }

    const users = await this.prismaService.user.findMany({
      where: {
        deletedAt: null,
        status: { in: [UserStatus.ACTIVE, UserStatus.INVITED] },
        ...(spec.organizationId ? { organizationId: spec.organizationId } : {}),
        OR: [
          ...(directUserIds.length > 0 ? [{ id: { in: directUserIds } }] : []),
          ...(roleCodes.length > 0
            ? [
                {
                  userRoles: {
                    some: {
                      role: {
                        code: { in: roleCodes },
                      },
                    },
                  },
                },
              ]
            : []),
          ...(permissionCodes.length > 0
            ? [
                {
                  userRoles: {
                    some: {
                      role: {
                        rolePermissions: {
                          some: {
                            permission: {
                              code: { in: permissionCodes },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    });

    return [...new Set(users.map((user) => user.id))];
  }

  private async ensureRecipientNotification(id: string, recipientUserId: string) {
    const notification = await this.prismaService.notification.findFirst({
      where: {
        id,
        recipientUserId,
      },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }
  }
}
