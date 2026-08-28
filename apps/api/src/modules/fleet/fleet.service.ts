import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FleetAssignmentStatus,
  FleetComplianceStatus,
  FleetMaintenanceStatus,
  NotificationCategory,
  NotificationSeverity,
  FleetOnboardingStatus,
  FleetOperationalStatus,
  FleetStatusCategory,
  Prisma,
} from '@prisma/client';

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
import { AuditService } from '../audit/audit.service';
import { DomainEventsService } from '../notifications/domain-events.service';
import { CreateFleetVehicleDto } from './dto/create-fleet-vehicle.dto';
import { CreateMaintenanceRecordDto } from './dto/create-maintenance-record.dto';
import { QueryFleetVehiclesDto } from './dto/query-fleet-vehicles.dto';
import { UpdateFleetStatusDto } from './dto/update-fleet-status.dto';
import { UpdateFleetVehicleDto } from './dto/update-fleet-vehicle.dto';
import { UpdateMaintenanceRecordDto } from './dto/update-maintenance-record.dto';
import {
  FLEET_MAINTENANCE_SELECT,
  FLEET_STATUS_HISTORY_SELECT,
  FLEET_VEHICLE_SELECT,
  FleetVehicleResponse,
  toFleetMaintenanceRecordResponse,
  toFleetStatusHistoryResponse,
  toFleetVehicleResponse,
} from './mappers/fleet.mapper';

@Injectable()
export class FleetService {
  // Legacy compatibility service. Keep fleet-era contracts functional for
  // rollback and migration safety, but prefer AssetsService and related
  // canonical asset surfaces for all new development.
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createVehicle(dto: CreateFleetVehicleDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureVehicleCodeIsAvailable(dto.organizationId, dto.vehicleCode);
    await this.ensurePlateNumberIsAvailable(dto.organizationId, dto.plateNumber);
    await this.ensureVinIsAvailable(dto.organizationId, dto.vin);

    const vehicle = await this.prismaService.fleetVehicle.create({
      data: {
        organizationId: dto.organizationId,
        vehicleCode: dto.vehicleCode,
        plateNumber: dto.plateNumber,
        vin: dto.vin,
        make: dto.make,
        model: dto.model,
        modelYear: dto.modelYear,
        color: dto.color,
        vehicleClass: dto.vehicleClass,
        registrationNumber: dto.registrationNumber,
        registrationIssuedAt: dto.registrationIssuedAt
          ? new Date(dto.registrationIssuedAt)
          : null,
        registrationExpiresAt: dto.registrationExpiresAt
          ? new Date(dto.registrationExpiresAt)
          : null,
        insurancePolicyNumber: dto.insurancePolicyNumber,
        insuranceExpiresAt: dto.insuranceExpiresAt
          ? new Date(dto.insuranceExpiresAt)
          : null,
        onboardingStatus: dto.onboardingStatus ?? FleetOnboardingStatus.PENDING,
        operationalStatus: dto.operationalStatus ?? FleetOperationalStatus.INACTIVE,
        complianceStatus: this.resolveInitialComplianceStatus(dto),
        assignmentStatus: dto.assignmentStatus ?? FleetAssignmentStatus.UNAVAILABLE,
        joinedAt: new Date(dto.joinedAt),
      },
      select: FLEET_VEHICLE_SELECT,
    });

    return buildSuccessResponse(
      'Asset profile created successfully.',
      this.toFleetVehicleResponseWithReadiness(vehicle),
    );
  }

  async findAllVehicles(query: QueryFleetVehiclesDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.FleetVehicleWhereInput = {
      deletedAt: null,
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.vehicleClass ? { vehicleClass: query.vehicleClass } : {}),
      ...(query.onboardingStatus ? { onboardingStatus: query.onboardingStatus } : {}),
      ...(query.operationalStatus ? { operationalStatus: query.operationalStatus } : {}),
      ...(query.complianceStatus ? { complianceStatus: query.complianceStatus } : {}),
      ...(query.assignmentStatus ? { assignmentStatus: query.assignmentStatus } : {}),
      ...(search
        ? {
            OR: [
              { vehicleCode: { contains: search, mode: 'insensitive' } },
              { plateNumber: { contains: search, mode: 'insensitive' } },
              { make: { contains: search, mode: 'insensitive' } },
              { model: { contains: search, mode: 'insensitive' } },
              { registrationNumber: { contains: search, mode: 'insensitive' } },
              { vin: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [vehicles, total] = await this.prismaService.$transaction([
      this.prismaService.fleetVehicle.findMany({
        where,
        select: FLEET_VEHICLE_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.fleetVehicle.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Assets retrieved successfully.',
      vehicles.map((vehicle) => this.toFleetVehicleResponseWithReadiness(vehicle)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async findVehicle(id: string) {
    const vehicle = await this.findActiveVehicleById(id);

    return buildSuccessResponse(
      'Asset profile retrieved successfully.',
      this.toFleetVehicleResponseWithReadiness(vehicle),
    );
  }

  async updateVehicle(id: string, dto: UpdateFleetVehicleDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one asset field must be provided for update.');
    }

    const existingVehicle = await this.findActiveVehicleById(id);
    const organizationId = dto.organizationId ?? existingVehicle.organizationId;
    const vehicleCode = dto.vehicleCode ?? existingVehicle.vehicleCode;
    const plateNumber = dto.plateNumber ?? existingVehicle.plateNumber;
    const vin = dto.vin !== undefined ? dto.vin : existingVehicle.vin;

    if (dto.organizationId) {
      await this.ensureOrganizationExists(dto.organizationId);
    }

    if (
      organizationId !== existingVehicle.organizationId ||
      vehicleCode !== existingVehicle.vehicleCode
    ) {
      await this.ensureVehicleCodeIsAvailable(organizationId, vehicleCode, id);
    }

    if (
      organizationId !== existingVehicle.organizationId ||
      plateNumber !== existingVehicle.plateNumber
    ) {
      await this.ensurePlateNumberIsAvailable(organizationId, plateNumber, id);
    }

    if (organizationId !== existingVehicle.organizationId || vin !== existingVehicle.vin) {
      await this.ensureVinIsAvailable(organizationId, vin ?? undefined, id);
    }

    const vehicle = await this.prismaService.fleetVehicle.update({
      where: { id },
      data: {
        ...(dto.organizationId !== undefined ? { organizationId: dto.organizationId } : {}),
        ...(dto.vehicleCode !== undefined ? { vehicleCode: dto.vehicleCode } : {}),
        ...(dto.plateNumber !== undefined ? { plateNumber: dto.plateNumber } : {}),
        ...(dto.vin !== undefined ? { vin: dto.vin } : {}),
        ...(dto.make !== undefined ? { make: dto.make } : {}),
        ...(dto.model !== undefined ? { model: dto.model } : {}),
        ...(dto.modelYear !== undefined ? { modelYear: dto.modelYear } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.vehicleClass !== undefined ? { vehicleClass: dto.vehicleClass } : {}),
        ...(dto.registrationNumber !== undefined
          ? { registrationNumber: dto.registrationNumber }
          : {}),
        ...(dto.registrationIssuedAt !== undefined
          ? {
              registrationIssuedAt: dto.registrationIssuedAt
                ? new Date(dto.registrationIssuedAt)
                : null,
            }
          : {}),
        ...(dto.registrationExpiresAt !== undefined
          ? {
              registrationExpiresAt: dto.registrationExpiresAt
                ? new Date(dto.registrationExpiresAt)
                : null,
            }
          : {}),
        ...(dto.insurancePolicyNumber !== undefined
          ? { insurancePolicyNumber: dto.insurancePolicyNumber }
          : {}),
        ...(dto.insuranceExpiresAt !== undefined
          ? {
              insuranceExpiresAt: dto.insuranceExpiresAt
                ? new Date(dto.insuranceExpiresAt)
                : null,
            }
          : {}),
        ...(dto.onboardingStatus !== undefined
          ? { onboardingStatus: dto.onboardingStatus }
          : {}),
        ...(dto.operationalStatus !== undefined
          ? {
              operationalStatus: dto.operationalStatus,
              ...(dto.operationalStatus === FleetOperationalStatus.INACTIVE ||
              dto.operationalStatus === FleetOperationalStatus.BLOCKED
                ? { decommissionedAt: new Date() }
                : {}),
            }
          : {}),
        ...(dto.complianceStatus !== undefined ? { complianceStatus: dto.complianceStatus } : {}),
        ...(dto.assignmentStatus !== undefined ? { assignmentStatus: dto.assignmentStatus } : {}),
        ...(dto.joinedAt !== undefined ? { joinedAt: new Date(dto.joinedAt) } : {}),
      },
      select: FLEET_VEHICLE_SELECT,
    });

    return buildSuccessResponse(
      'Asset profile updated successfully.',
      this.toFleetVehicleResponseWithReadiness(vehicle),
    );
  }

  async archiveVehicle(id: string) {
    await this.findActiveVehicleById(id);

    const vehicle = await this.prismaService.fleetVehicle.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        decommissionedAt: new Date(),
        operationalStatus: FleetOperationalStatus.INACTIVE,
        assignmentStatus: FleetAssignmentStatus.RESTRICTED,
      },
      select: FLEET_VEHICLE_SELECT,
    });

    return buildSuccessResponse(
      'Asset profile archived successfully.',
      this.toFleetVehicleResponseWithReadiness(vehicle),
    );
  }

  async addMaintenanceRecord(vehicleId: string, dto: CreateMaintenanceRecordDto) {
    const vehicle = await this.findActiveVehicleById(vehicleId);

    const record = await this.prismaService.fleetMaintenanceRecord.create({
      data: {
        vehicleId: vehicle.id,
        maintenanceType: dto.maintenanceType,
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        status: this.resolveMaintenanceStatus(dto.status, dto.scheduledAt, dto.completedAt),
        vendorName: dto.vendorName,
        costAmount: dto.costAmount,
        notes: dto.notes,
      },
      select: FLEET_MAINTENANCE_SELECT,
    });

    return buildSuccessResponse(
      'Asset maintenance record created successfully.',
      toFleetMaintenanceRecordResponse(record),
    );
  }

  async listMaintenanceRecords(vehicleId: string) {
    await this.findActiveVehicleById(vehicleId);

    const records = await this.prismaService.fleetMaintenanceRecord.findMany({
      where: { vehicleId },
      select: FLEET_MAINTENANCE_SELECT,
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    });

    return buildSuccessResponse(
      'Asset maintenance records retrieved successfully.',
      records.map((record) => toFleetMaintenanceRecordResponse(record)),
    );
  }

  async updateMaintenanceRecord(
    vehicleId: string,
    recordId: string,
    dto: UpdateMaintenanceRecordDto,
  ) {
    await this.findActiveVehicleById(vehicleId);
    await this.findMaintenanceRecord(vehicleId, recordId);

    const existingRecord = await this.prismaService.fleetMaintenanceRecord.findUnique({
      where: { id: recordId },
      select: {
        scheduledAt: true,
        completedAt: true,
        status: true,
      },
    });

    const scheduledAt =
      dto.scheduledAt !== undefined
        ? dto.scheduledAt
          ? new Date(dto.scheduledAt)
          : null
        : existingRecord?.scheduledAt ?? null;
    const completedAt =
      dto.completedAt !== undefined
        ? dto.completedAt
          ? new Date(dto.completedAt)
          : null
        : existingRecord?.completedAt ?? null;

    const record = await this.prismaService.fleetMaintenanceRecord.update({
      where: { id: recordId },
      data: {
        ...(dto.maintenanceType !== undefined ? { maintenanceType: dto.maintenanceType } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.scheduledAt !== undefined ? { scheduledAt } : {}),
        ...(dto.completedAt !== undefined ? { completedAt } : {}),
        ...((dto.status !== undefined || dto.scheduledAt !== undefined || dto.completedAt !== undefined)
          ? {
              status: this.resolveMaintenanceStatus(
                dto.status ?? existingRecord?.status,
                scheduledAt,
                completedAt,
              ),
            }
          : {}),
        ...(dto.vendorName !== undefined ? { vendorName: dto.vendorName } : {}),
        ...(dto.costAmount !== undefined ? { costAmount: dto.costAmount } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      select: FLEET_MAINTENANCE_SELECT,
    });

    return buildSuccessResponse(
      'Asset maintenance record updated successfully.',
      toFleetMaintenanceRecordResponse(record),
    );
  }

  async updateVehicleStatus(
    id: string,
    principal: CurrentPrincipal,
    dto: UpdateFleetStatusDto,
  ) {
    const vehicle = await this.findActiveVehicleById(id);
    this.ensureValidStatusTransition(dto.statusCategory, dto.newValue);

    const previousValue = this.getVehicleStatusValue(vehicle, dto.statusCategory);

    if (previousValue === dto.newValue) {
      throw new BadRequestException('Asset status is already set to the requested value.');
    }

    const data = this.buildVehicleStatusUpdate(dto.statusCategory, dto.newValue);

    const updatedVehicle = await this.prismaService.$transaction(async (transaction) => {
      const updated = await transaction.fleetVehicle.update({
        where: { id },
        data,
        select: FLEET_VEHICLE_SELECT,
      });

      await transaction.fleetStatusHistory.create({
        data: {
          vehicleId: id,
          statusCategory: dto.statusCategory,
          previousValue,
          newValue: dto.newValue,
          changedByUserId: principal.userId,
          reason: dto.reason,
        },
      });

      return updated;
    });

    await this.auditService.record({
      action: 'asset.status.update',
      entityType: 'asset',
      entityId: updatedVehicle.id,
      organizationId: updatedVehicle.organizationId,
      actorUserId: principal.userId,
      summary: `Asset ${updatedVehicle.vehicleCode} ${dto.statusCategory.toLowerCase()} changed from ${previousValue} to ${dto.newValue}.`,
      metadata: {
        statusCategory: dto.statusCategory,
        previousValue,
        newValue: dto.newValue,
        reason: dto.reason ?? null,
      },
    });

    // TODO(universal-events): keep asset.* as the canonical namespace and remove remaining fleet-specific notification semantics over time.
    await this.domainEventsService.publish({
      organizationId: updatedVehicle.organizationId,
      eventType: 'asset.status.changed',
      aggregateType: 'asset',
      aggregateId: updatedVehicle.id,
      triggeredByUserId: principal.userId,
      payload: {
        notification: {
          category: NotificationCategory.FLEET,
          severity:
            dto.newValue === FleetOperationalStatus.BLOCKED ||
            dto.newValue === FleetOperationalStatus.OUT_OF_SERVICE
              ? NotificationSeverity.CRITICAL
              : NotificationSeverity.INFO,
          title: 'Asset status changed',
          message: `Asset ${updatedVehicle.vehicleCode} status changed to ${dto.newValue.toLowerCase().replaceAll('_', ' ')}.`,
          actionUrl: `/assets/vehicles/${updatedVehicle.id}`,
          entityType: 'asset',
          entityId: updatedVehicle.id,
          metadata: {
            statusCategory: dto.statusCategory,
            previousValue,
            newValue: dto.newValue,
            reason: dto.reason ?? null,
          },
        },
        recipients: {
          permissionCodes: ['fleet.manage'],
        },
      },
    });

    if (
      dto.statusCategory === FleetStatusCategory.COMPLIANCE_STATUS &&
      (dto.newValue === FleetComplianceStatus.NON_COMPLIANT ||
        dto.newValue === FleetComplianceStatus.EXPIRED ||
        dto.newValue === FleetComplianceStatus.UNDER_REVIEW)
    ) {
      // TODO(universal-events): align this compliance alert payload to fully universal asset language once legacy fleet consumers are retired.
      await this.domainEventsService.publish({
        organizationId: updatedVehicle.organizationId,
        eventType: 'asset.compliance.alert',
        aggregateType: 'asset',
        aggregateId: updatedVehicle.id,
        triggeredByUserId: principal.userId,
        payload: {
          notification: {
            category: NotificationCategory.COMPLIANCE,
            severity: NotificationSeverity.WARNING,
            title: 'Asset compliance alert',
            message: `Asset ${updatedVehicle.vehicleCode} requires compliance attention.`,
            actionUrl: `/assets/vehicles/${updatedVehicle.id}`,
            entityType: 'asset',
            entityId: updatedVehicle.id,
            metadata: {
              newValue: dto.newValue,
            },
          },
          recipients: {
            permissionCodes: ['fleet.manage'],
          },
        },
      });
    }

    return buildSuccessResponse(
      'Asset status updated successfully.',
      this.toFleetVehicleResponseWithReadiness(updatedVehicle),
    );
  }

  async getVehicleStatusHistory(vehicleId: string) {
    await this.findActiveVehicleById(vehicleId);

    const history = await this.prismaService.fleetStatusHistory.findMany({
      where: { vehicleId },
      select: FLEET_STATUS_HISTORY_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });

    return buildSuccessResponse(
      'Asset status history retrieved successfully.',
      history.map((entry) => toFleetStatusHistoryResponse(entry)),
    );
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prismaService.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
  }

  private async ensureVehicleCodeIsAvailable(
    organizationId: string,
    vehicleCode: string,
    vehicleIdToExclude?: string,
  ) {
    const existingVehicle = await this.prismaService.fleetVehicle.findFirst({
      where: {
        organizationId,
        vehicleCode,
        ...(vehicleIdToExclude ? { id: { not: vehicleIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existingVehicle) {
      throw new ConflictException('An asset with the provided code already exists.');
    }
  }

  private async ensurePlateNumberIsAvailable(
    organizationId: string,
    plateNumber: string,
    vehicleIdToExclude?: string,
  ) {
    const existingVehicle = await this.prismaService.fleetVehicle.findFirst({
      where: {
        organizationId,
        plateNumber,
        ...(vehicleIdToExclude ? { id: { not: vehicleIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existingVehicle) {
      throw new ConflictException('An asset with the provided plateNumber already exists.');
    }
  }

  private async ensureVinIsAvailable(
    organizationId: string,
    vin?: string,
    vehicleIdToExclude?: string,
  ) {
    if (!vin) {
      return;
    }

    const existingVehicle = await this.prismaService.fleetVehicle.findFirst({
      where: {
        organizationId,
        vin,
        ...(vehicleIdToExclude ? { id: { not: vehicleIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existingVehicle) {
      throw new ConflictException('An asset with the provided vin already exists.');
    }
  }

  private async findActiveVehicleById(id: string) {
    const vehicle = await this.prismaService.fleetVehicle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: FLEET_VEHICLE_SELECT,
    });

    if (!vehicle) {
      throw new NotFoundException('Asset not found.');
    }

    return vehicle;
  }

  private async findMaintenanceRecord(vehicleId: string, recordId: string) {
    const record = await this.prismaService.fleetMaintenanceRecord.findFirst({
      where: {
        id: recordId,
        vehicleId,
      },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException('Asset maintenance record not found.');
    }
  }

  private resolveInitialComplianceStatus(dto: CreateFleetVehicleDto) {
    if (dto.complianceStatus) {
      return dto.complianceStatus;
    }

    const now = new Date();
    if (
      (dto.registrationExpiresAt && new Date(dto.registrationExpiresAt) < now) ||
      (dto.insuranceExpiresAt && new Date(dto.insuranceExpiresAt) < now)
    ) {
      return FleetComplianceStatus.EXPIRED;
    }

    if (dto.registrationNumber || dto.insurancePolicyNumber) {
      return FleetComplianceStatus.UNDER_REVIEW;
    }

    return FleetComplianceStatus.PENDING;
  }

  private toFleetVehicleResponseWithReadiness(
    vehicle: Omit<FleetVehicleResponse, 'isDispatchReady'>,
  ) {
    return toFleetVehicleResponse(vehicle, this.evaluateVehicleReadiness(vehicle));
  }

  private evaluateVehicleReadiness(
    vehicle: Omit<FleetVehicleResponse, 'isDispatchReady'>,
  ) {
    const onboardingReady =
      vehicle.onboardingStatus === FleetOnboardingStatus.APPROVED ||
      vehicle.onboardingStatus === FleetOnboardingStatus.COMPLETED;

    const operationalReady =
      vehicle.operationalStatus === FleetOperationalStatus.ACTIVE ||
      vehicle.operationalStatus === FleetOperationalStatus.IN_SERVICE;

    return (
      onboardingReady &&
      operationalReady &&
      vehicle.complianceStatus === FleetComplianceStatus.COMPLIANT &&
      vehicle.assignmentStatus === FleetAssignmentStatus.AVAILABLE
    );
  }

  private resolveMaintenanceStatus(
    requestedStatus: FleetMaintenanceStatus | undefined,
    scheduledAt: string | Date | null | undefined,
    completedAt: string | Date | null | undefined,
  ) {
    if (requestedStatus) {
      return requestedStatus;
    }

    if (completedAt) {
      return FleetMaintenanceStatus.COMPLETED;
    }

    if (scheduledAt && new Date(scheduledAt) < new Date()) {
      return FleetMaintenanceStatus.OVERDUE;
    }

    return FleetMaintenanceStatus.SCHEDULED;
  }

  private ensureValidStatusTransition(category: FleetStatusCategory, newValue: string) {
    const allowedValues: Record<FleetStatusCategory, string[]> = {
      [FleetStatusCategory.ONBOARDING_STATUS]: Object.values(FleetOnboardingStatus),
      [FleetStatusCategory.OPERATIONAL_STATUS]: Object.values(FleetOperationalStatus),
      [FleetStatusCategory.COMPLIANCE_STATUS]: Object.values(FleetComplianceStatus),
      [FleetStatusCategory.ASSIGNMENT_STATUS]: Object.values(FleetAssignmentStatus),
    };

    if (!allowedValues[category].includes(newValue)) {
      throw new BadRequestException('Invalid asset status value for the provided category.');
    }
  }

  private getVehicleStatusValue(
    vehicle: Omit<FleetVehicleResponse, 'isDispatchReady'>,
    category: FleetStatusCategory,
  ) {
    switch (category) {
      case FleetStatusCategory.ONBOARDING_STATUS:
        return vehicle.onboardingStatus;
      case FleetStatusCategory.OPERATIONAL_STATUS:
        return vehicle.operationalStatus;
      case FleetStatusCategory.COMPLIANCE_STATUS:
        return vehicle.complianceStatus;
      case FleetStatusCategory.ASSIGNMENT_STATUS:
        return vehicle.assignmentStatus;
    }
  }

  private buildVehicleStatusUpdate(category: FleetStatusCategory, newValue: string) {
    switch (category) {
      case FleetStatusCategory.ONBOARDING_STATUS:
        return {
          onboardingStatus: newValue as FleetOnboardingStatus,
        } satisfies Prisma.FleetVehicleUpdateInput;
      case FleetStatusCategory.OPERATIONAL_STATUS:
        return {
          operationalStatus: newValue as FleetOperationalStatus,
          ...((newValue === FleetOperationalStatus.INACTIVE ||
            newValue === FleetOperationalStatus.BLOCKED) && {
            decommissionedAt: new Date(),
          }),
        } satisfies Prisma.FleetVehicleUpdateInput;
      case FleetStatusCategory.COMPLIANCE_STATUS:
        return {
          complianceStatus: newValue as FleetComplianceStatus,
        } satisfies Prisma.FleetVehicleUpdateInput;
      case FleetStatusCategory.ASSIGNMENT_STATUS:
        return {
          assignmentStatus: newValue as FleetAssignmentStatus,
        } satisfies Prisma.FleetVehicleUpdateInput;
    }
  }
}
