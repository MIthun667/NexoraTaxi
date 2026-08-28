import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DispatchIncidentStatus,
  DispatchIncidentSeverity,
  IncidentSeverity,
  NotificationCategory,
  NotificationSeverity,
  OperationalIncidentStatus,
  ResourceAssignmentStatus,
  DispatchRunStatus,
  DispatchShiftStatus,
  DriverAssignmentStatus,
  DriverComplianceStatus,
  DriverOnboardingStatus,
  DriverOperationalStatus,
  DriverVehicleAssignmentStatus,
  FleetAssignmentStatus,
  FleetComplianceStatus,
  FleetOnboardingStatus,
  FleetOperationalStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';

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
import {
  OPERATIONAL_INCIDENT_SELECT,
  OperationalIncidentResponse,
} from '../incidents/mappers/incident.mapper';
import { DomainEventsService } from '../notifications/domain-events.service';
import {
  OPERATIONAL_ZONE_SELECT,
  OperationalZoneResponse,
} from '../operations/mappers/operations.mapper';
import {
  RESOURCE_ASSIGNMENT_SELECT,
  ResourceAssignmentResponse,
} from '../assignments/mappers/assignment.mapper';
import { CreateDispatchIncidentDto } from './dto/create-dispatch-incident.dto';
import { CreateDispatchRunDto } from './dto/create-dispatch-run.dto';
import { CreateDispatchShiftDto } from './dto/create-dispatch-shift.dto';
import { CreateDispatchZoneDto } from './dto/create-dispatch-zone.dto';
import { CreateDriverVehicleAssignmentDto } from './dto/create-driver-vehicle-assignment.dto';
import { QueryDispatchIncidentsDto } from './dto/query-dispatch-incidents.dto';
import { QueryDispatchRunsDto } from './dto/query-dispatch-runs.dto';
import { QueryDispatchShiftsDto } from './dto/query-dispatch-shifts.dto';
import { QueryDispatchZonesDto } from './dto/query-dispatch-zones.dto';
import { QueryDriverVehicleAssignmentsDto } from './dto/query-driver-vehicle-assignments.dto';
import { UpdateDispatchIncidentDto } from './dto/update-dispatch-incident.dto';
import { UpdateDispatchRunDto } from './dto/update-dispatch-run.dto';
import { UpdateDispatchShiftDto } from './dto/update-dispatch-shift.dto';
import { UpdateDispatchZoneDto } from './dto/update-dispatch-zone.dto';
import { UpdateDriverVehicleAssignmentDto } from './dto/update-driver-vehicle-assignment.dto';
import {
  DISPATCH_INCIDENT_SELECT,
  DISPATCH_RUN_SELECT,
  DISPATCH_SHIFT_SELECT,
  DISPATCH_ZONE_SELECT,
  DRIVER_VEHICLE_ASSIGNMENT_SELECT,
  toDispatchIncidentResponse,
  toDispatchRunResponse,
  toDispatchShiftResponse,
  toDispatchZoneResponse,
  toDriverVehicleAssignmentResponse,
} from './mappers/dispatch.mapper';

const CONFLICTING_ASSIGNMENT_STATUSES: DriverVehicleAssignmentStatus[] = [
  DriverVehicleAssignmentStatus.ASSIGNED,
  DriverVehicleAssignmentStatus.ACTIVE,
];

const RELEASED_ASSIGNMENT_STATUSES: DriverVehicleAssignmentStatus[] = [
  DriverVehicleAssignmentStatus.RELEASED,
  DriverVehicleAssignmentStatus.CANCELLED,
];

@Injectable()
export class DispatchService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditService: AuditService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async createZone(dto: CreateDispatchZoneDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureZoneCodeAvailable(dto.organizationId, dto.code);

    const zone = await this.prismaService.dispatchZone.create({
      data: {
        organizationId: dto.organizationId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
      select: DISPATCH_ZONE_SELECT,
    });

    return buildSuccessResponse(
      'Operational zone created successfully.',
      toDispatchZoneResponse(zone),
    );
  }

  async listZones(query: QueryDispatchZonesDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.DispatchZoneWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [zones, total] = await this.prismaService.$transaction([
      this.prismaService.dispatchZone.findMany({
        where,
        select: DISPATCH_ZONE_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.dispatchZone.count({ where }),
    ]);

    const canonicalZones = await this.listCanonicalZonesByIds(zones.map((zone) => zone.id));
    const canonicalById = new Map(canonicalZones.map((zone) => [zone.id, zone]));

    return buildPaginatedResponse(
      'Operational zones retrieved successfully.',
      zones.map((zone) =>
        toDispatchZoneResponse(
          this.mapCanonicalZoneToDispatchZone(zone, canonicalById.get(zone.id) ?? null),
        ),
      ),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getZone(id: string) {
    const zone = await this.findZoneById(id);
    const canonicalZone = await this.findCanonicalZoneById(id);
    return buildSuccessResponse(
      'Operational zone retrieved successfully.',
      toDispatchZoneResponse(this.mapCanonicalZoneToDispatchZone(zone, canonicalZone)),
    );
  }

  async updateZone(id: string, dto: UpdateDispatchZoneDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one operational zone field must be provided for update.');
    }

    const existingZone = await this.findZoneById(id);
    const organizationId = dto.organizationId ?? existingZone.organizationId;
    const code = dto.code ?? existingZone.code;

    if (dto.organizationId) {
      await this.ensureOrganizationExists(dto.organizationId);
    }

    if (organizationId !== existingZone.organizationId || code !== existingZone.code) {
      await this.ensureZoneCodeAvailable(organizationId, code, id);
    }

    const zone = await this.prismaService.dispatchZone.update({
      where: { id },
      data: {
        ...(dto.organizationId !== undefined ? { organizationId: dto.organizationId } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: DISPATCH_ZONE_SELECT,
    });

    return buildSuccessResponse('Operational zone updated successfully.', toDispatchZoneResponse(zone));
  }

  async createShift(dto: CreateDispatchShiftDto) {
    this.ensureShiftWindowIsValid(dto.startsAt, dto.endsAt);
    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureShiftCodeAvailable(dto.organizationId, dto.code);
    await this.ensureZoneBelongsToOrganization(dto.zoneId, dto.organizationId);
    await this.ensureUserBelongsToOrganization(dto.supervisorUserId, dto.organizationId);

    const shift = await this.prismaService.dispatchShift.create({
      data: {
        organizationId: dto.organizationId,
        code: dto.code,
        title: dto.title,
        description: dto.description,
        zoneId: dto.zoneId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: dto.status ?? DispatchShiftStatus.SCHEDULED,
        supervisorUserId: dto.supervisorUserId,
      },
      select: DISPATCH_SHIFT_SELECT,
    });

    return buildSuccessResponse('Operational shift created successfully.', toDispatchShiftResponse(shift));
  }

  async listShifts(query: QueryDispatchShiftsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.DispatchShiftWhereInput = {
      deletedAt: null,
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [shifts, total] = await this.prismaService.$transaction([
      this.prismaService.dispatchShift.findMany({
        where,
        select: DISPATCH_SHIFT_SELECT,
        orderBy: [{ startsAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.dispatchShift.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Operational shifts retrieved successfully.',
      shifts.map((shift) => toDispatchShiftResponse(shift)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getShift(id: string) {
    const shift = await this.findActiveShiftById(id);
    return buildSuccessResponse('Operational shift retrieved successfully.', toDispatchShiftResponse(shift));
  }

  async updateShift(id: string, dto: UpdateDispatchShiftDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one operational shift field must be provided for update.');
    }

    const existingShift = await this.findActiveShiftById(id);
    const organizationId = dto.organizationId ?? existingShift.organizationId;
    const code = dto.code ?? existingShift.code;
    const startsAt = dto.startsAt ?? existingShift.startsAt.toISOString();
    const endsAt = dto.endsAt ?? existingShift.endsAt.toISOString();

    this.ensureShiftWindowIsValid(startsAt, endsAt);

    if (dto.organizationId) {
      await this.ensureOrganizationExists(dto.organizationId);
    }

    await this.ensureZoneBelongsToOrganization(
      dto.zoneId !== undefined ? dto.zoneId ?? undefined : existingShift.zoneId ?? undefined,
      organizationId,
    );
    await this.ensureUserBelongsToOrganization(
      dto.supervisorUserId !== undefined
        ? dto.supervisorUserId ?? undefined
        : existingShift.supervisorUserId ?? undefined,
      organizationId,
    );

    if (organizationId !== existingShift.organizationId || code !== existingShift.code) {
      await this.ensureShiftCodeAvailable(organizationId, code, id);
    }

    const shift = await this.prismaService.dispatchShift.update({
      where: { id },
      data: {
        ...(dto.organizationId !== undefined ? { organizationId: dto.organizationId } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.supervisorUserId !== undefined ? { supervisorUserId: dto.supervisorUserId } : {}),
      },
      select: DISPATCH_SHIFT_SELECT,
    });

    return buildSuccessResponse('Operational shift updated successfully.', toDispatchShiftResponse(shift));
  }

  async archiveShift(id: string) {
    await this.findActiveShiftById(id);

    const shift = await this.prismaService.dispatchShift.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: DispatchShiftStatus.CANCELLED,
      },
      select: DISPATCH_SHIFT_SELECT,
    });

    return buildSuccessResponse('Operational shift archived successfully.', toDispatchShiftResponse(shift));
  }

  async createAssignment(dto: CreateDriverVehicleAssignmentDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    const driver = await this.findAssignableDriver(dto.driverId, dto.organizationId);
    const vehicle = await this.findAssignableVehicle(dto.vehicleId, dto.organizationId);
    await this.ensureZoneBelongsToOrganization(dto.zoneId, dto.organizationId);
    await this.ensureActiveShiftBelongsToOrganization(dto.shiftId, dto.organizationId);
    await this.ensureUserBelongsToOrganization(dto.assignedByUserId, dto.organizationId);
    await this.ensureNoConflictingAssignments(dto.organizationId, driver.id, vehicle.id);

    const assignment = await this.prismaService.driverVehicleAssignment.create({
      data: {
        organizationId: dto.organizationId,
        driverId: driver.id,
        vehicleId: vehicle.id,
        zoneId: dto.zoneId,
        shiftId: dto.shiftId,
        assignmentStatus: dto.assignmentStatus ?? DriverVehicleAssignmentStatus.ASSIGNED,
        assignedAt: dto.assignedAt ? new Date(dto.assignedAt) : new Date(),
        assignedByUserId: dto.assignedByUserId,
        notes: dto.notes,
      },
      select: DRIVER_VEHICLE_ASSIGNMENT_SELECT,
    });

    // TODO(universal-events): replace dispatch-era payload terms like driverId/vehicleId with people/assets metadata once universal consumers are the default.
    await this.domainEventsService.publish({
      organizationId: dto.organizationId,
      eventType: 'operations.assignment.created',
      aggregateType: 'resource-assignment',
      aggregateId: assignment.id,
      triggeredByUserId: dto.assignedByUserId ?? null,
      payload: {
        notification: {
          category: NotificationCategory.DISPATCH,
          severity: NotificationSeverity.INFO,
          title: 'Resource assignment created',
          message: 'A new resource assignment has been created.',
          actionUrl: `/operations/assignments/${assignment.id}`,
          entityType: 'resource-assignment',
          entityId: assignment.id,
          metadata: {
            driverId: assignment.driverId,
            vehicleId: assignment.vehicleId,
            shiftId: assignment.shiftId ?? null,
            zoneId: assignment.zoneId ?? null,
          },
        },
        recipients: {
          userIds: assignment.assignedByUserId ? [assignment.assignedByUserId] : [],
          permissionCodes: ['dispatch.intervene'],
        },
      },
    });

    return buildSuccessResponse(
      'Resource assignment created successfully.',
      toDriverVehicleAssignmentResponse(assignment),
    );
  }

  async listAssignments(query: QueryDriverVehicleAssignmentsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.DriverVehicleAssignmentWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.driverId ? { driverId: query.driverId } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.shiftId ? { shiftId: query.shiftId } : {}),
      ...(query.assignmentStatus ? { assignmentStatus: query.assignmentStatus } : {}),
      ...(search
        ? {
            OR: [
              { notes: { contains: search, mode: 'insensitive' } },
              { driver: { driverCode: { contains: search, mode: 'insensitive' } } },
              { vehicle: { vehicleCode: { contains: search, mode: 'insensitive' } } },
              { vehicle: { plateNumber: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [assignments, total] = await this.prismaService.$transaction([
      this.prismaService.driverVehicleAssignment.findMany({
        where,
        select: DRIVER_VEHICLE_ASSIGNMENT_SELECT,
        orderBy: [{ assignedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.driverVehicleAssignment.count({ where }),
    ]);

    const canonicalAssignments = await this.listCanonicalAssignmentsByIds(
      assignments.map((assignment) => assignment.id),
    );
    const canonicalById = new Map(
      canonicalAssignments.map((assignment) => [assignment.id, assignment]),
    );

    return buildPaginatedResponse(
      'Resource assignments retrieved successfully.',
      assignments.map((assignment) =>
        toDriverVehicleAssignmentResponse(
          this.mapCanonicalAssignmentToDispatchAssignment(
            assignment,
            canonicalById.get(assignment.id) ?? null,
          ),
        ),
      ),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getAssignment(id: string) {
    const assignment = await this.findAssignmentById(id);
    const canonicalAssignment = await this.findCanonicalAssignmentById(id);
    return buildSuccessResponse(
      'Resource assignment retrieved successfully.',
      toDriverVehicleAssignmentResponse(
        this.mapCanonicalAssignmentToDispatchAssignment(assignment, canonicalAssignment),
      ),
    );
  }

  async updateAssignment(id: string, dto: UpdateDriverVehicleAssignmentDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(
        'At least one resource assignment field must be provided for update.',
      );
    }

    const existing = await this.findAssignmentById(id);
    await this.ensureZoneBelongsToOrganization(
      dto.zoneId !== undefined ? dto.zoneId ?? undefined : existing.zoneId ?? undefined,
      existing.organizationId,
    );
    await this.ensureActiveShiftBelongsToOrganization(
      dto.shiftId !== undefined ? dto.shiftId ?? undefined : existing.shiftId ?? undefined,
      existing.organizationId,
    );
    await this.ensureUserBelongsToOrganization(
      dto.assignedByUserId !== undefined
        ? dto.assignedByUserId ?? undefined
        : existing.assignedByUserId ?? undefined,
      existing.organizationId,
    );

    const nextStatus = dto.assignmentStatus ?? existing.assignmentStatus;
    if (CONFLICTING_ASSIGNMENT_STATUSES.includes(nextStatus)) {
      await this.ensureNoConflictingAssignments(
        existing.organizationId,
        existing.driverId,
        existing.vehicleId,
        id,
      );
    }

    const assignment = await this.prismaService.driverVehicleAssignment.update({
      where: { id },
      data: {
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
        ...(dto.shiftId !== undefined ? { shiftId: dto.shiftId } : {}),
        ...(dto.assignmentStatus !== undefined
          ? {
              assignmentStatus: dto.assignmentStatus,
              ...(RELEASED_ASSIGNMENT_STATUSES.includes(dto.assignmentStatus)
                ? { releasedAt: new Date() }
                : {}),
            }
          : {}),
        ...(dto.assignedAt !== undefined ? { assignedAt: new Date(dto.assignedAt) } : {}),
        ...(dto.assignedByUserId !== undefined ? { assignedByUserId: dto.assignedByUserId } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      select: DRIVER_VEHICLE_ASSIGNMENT_SELECT,
    });

    return buildSuccessResponse(
      'Resource assignment updated successfully.',
      toDriverVehicleAssignmentResponse(assignment),
    );
  }

  async releaseAssignment(id: string) {
    await this.findAssignmentById(id);

    const assignment = await this.prismaService.driverVehicleAssignment.update({
      where: { id },
      data: {
        assignmentStatus: DriverVehicleAssignmentStatus.RELEASED,
        releasedAt: new Date(),
      },
      select: DRIVER_VEHICLE_ASSIGNMENT_SELECT,
    });

    await this.auditService.record({
      action: 'operations.assignment.release',
      entityType: 'resource-assignment',
      entityId: assignment.id,
      organizationId: assignment.organizationId,
      summary: `Resource assignment ${assignment.id} was released.`,
      metadata: {
        driverId: assignment.driverId,
        vehicleId: assignment.vehicleId,
      },
    });

    await this.domainEventsService.publish({
      organizationId: assignment.organizationId,
      eventType: 'operations.assignment.released',
      aggregateType: 'resource-assignment',
      aggregateId: assignment.id,
      payload: {
        notification: {
          category: NotificationCategory.DISPATCH,
          severity: NotificationSeverity.WARNING,
          title: 'Resource assignment released',
          message: 'A resource assignment has been released from active duty.',
          actionUrl: `/operations/assignments/${assignment.id}`,
          entityType: 'resource-assignment',
          entityId: assignment.id,
          metadata: {
            driverId: assignment.driverId,
            vehicleId: assignment.vehicleId,
          },
        },
        recipients: {
          userIds: assignment.assignedByUserId ? [assignment.assignedByUserId] : [],
          permissionCodes: ['dispatch.intervene'],
        },
      },
    });

    return buildSuccessResponse(
      'Resource assignment released successfully.',
      toDriverVehicleAssignmentResponse(assignment),
    );
  }

  async createRun(dto: CreateDispatchRunDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    const assignment = await this.ensureAssignmentBelongsToOrganization(
      dto.assignmentId,
      dto.organizationId,
    );
    if (!assignment) {
      throw new NotFoundException('Resource assignment not found.');
    }
    await this.ensureZoneBelongsToOrganization(
      dto.zoneId ?? assignment.zoneId ?? undefined,
      dto.organizationId,
    );
    await this.ensureRunCodeAvailable(dto.organizationId, dto.runCode);

    const status = dto.dispatchStatus ?? DispatchRunStatus.CREATED;
    const now = new Date();

    const run = await this.prismaService.dispatchRun.create({
      data: {
        organizationId: dto.organizationId,
        assignmentId: dto.assignmentId,
        zoneId: dto.zoneId ?? assignment.zoneId,
        runCode: dto.runCode,
        dispatchStatus: status,
        ...(status === DispatchRunStatus.ACTIVE ? { startedAt: now } : {}),
        ...(status === DispatchRunStatus.COMPLETED ? { completedAt: now } : {}),
        ...(status === DispatchRunStatus.CANCELLED ? { cancelledAt: now } : {}),
      },
      select: DISPATCH_RUN_SELECT,
    });

    return buildSuccessResponse('Operational run created successfully.', toDispatchRunResponse(run));
  }

  async listRuns(query: QueryDispatchRunsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.DispatchRunWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.assignmentId ? { assignmentId: query.assignmentId } : {}),
      ...(query.dispatchStatus ? { dispatchStatus: query.dispatchStatus } : {}),
      ...(search ? { runCode: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [runs, total] = await this.prismaService.$transaction([
      this.prismaService.dispatchRun.findMany({
        where,
        select: DISPATCH_RUN_SELECT,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.dispatchRun.count({ where }),
    ]);

    return buildPaginatedResponse(
      'Operational runs retrieved successfully.',
      runs.map((run) => toDispatchRunResponse(run)),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getRun(id: string) {
    const run = await this.findRunById(id);
    return buildSuccessResponse('Operational run retrieved successfully.', toDispatchRunResponse(run));
  }

  async updateRun(id: string, dto: UpdateDispatchRunDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one operational run field must be provided for update.');
    }

    const existing = await this.findRunById(id);
    await this.ensureZoneBelongsToOrganization(
      dto.zoneId !== undefined ? dto.zoneId ?? undefined : existing.zoneId ?? undefined,
      existing.organizationId,
    );

    const run = await this.prismaService.dispatchRun.update({
      where: { id },
      data: {
        ...(dto.zoneId !== undefined ? { zoneId: dto.zoneId } : {}),
        ...(dto.dispatchStatus !== undefined ? { dispatchStatus: dto.dispatchStatus } : {}),
        ...this.buildRunTimestampUpdate(dto.dispatchStatus),
      },
      select: DISPATCH_RUN_SELECT,
    });

    return buildSuccessResponse('Operational run updated successfully.', toDispatchRunResponse(run));
  }

  async createIncident(dto: CreateDispatchIncidentDto) {
    await this.ensureOrganizationExists(dto.organizationId);
    await this.ensureRunBelongsToOrganization(dto.runId, dto.organizationId);
    await this.ensureAssignmentBelongsToOrganization(dto.assignmentId, dto.organizationId);
    await this.ensureUserBelongsToOrganization(dto.reportedByUserId, dto.organizationId);
    await this.ensureIncidentCodeAvailable(dto.organizationId, dto.incidentCode);

    const incident = await this.prismaService.dispatchIncident.create({
      data: {
        organizationId: dto.organizationId,
        runId: dto.runId,
        assignmentId: dto.assignmentId,
        incidentCode: dto.incidentCode,
        incidentType: dto.incidentType,
        severity: dto.severity,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? DispatchIncidentStatus.OPEN,
        reportedByUserId: dto.reportedByUserId,
        reportedAt: dto.reportedAt ? new Date(dto.reportedAt) : new Date(),
        ...(dto.status === DispatchIncidentStatus.RESOLVED ? { resolvedAt: new Date() } : {}),
      },
      select: DISPATCH_INCIDENT_SELECT,
    });

    await this.domainEventsService.publish({
      organizationId: incident.organizationId,
      eventType: 'operations.issue.opened',
      aggregateType: 'operational-issue',
      aggregateId: incident.id,
      triggeredByUserId: incident.reportedByUserId ?? null,
      payload: {
        notification: {
          category: NotificationCategory.INCIDENT,
          severity: this.mapIncidentSeverityToNotificationSeverity(incident.severity),
          title: `Operational issue opened: ${incident.incidentCode}`,
          message: incident.title,
          actionUrl: `/operations/incidents/${incident.id}`,
          entityType: 'operational-issue',
          entityId: incident.id,
          metadata: {
            incidentType: incident.incidentType,
            severity: incident.severity,
            assignmentId: incident.assignmentId ?? null,
            runId: incident.runId ?? null,
          },
        },
        recipients: {
          userIds: incident.reportedByUserId ? [incident.reportedByUserId] : [],
          permissionCodes: ['dispatch.intervene'],
        },
      },
    });

    return buildSuccessResponse(
      'Operational issue created successfully.',
      toDispatchIncidentResponse(incident),
    );
  }

  async listIncidents(query: QueryDispatchIncidentsDto) {
    const { page, limit, skip } = resolvePagination(query);
    const search = query.search?.trim();

    const where: Prisma.DispatchIncidentWhereInput = {
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.runId ? { runId: query.runId } : {}),
      ...(query.assignmentId ? { assignmentId: query.assignmentId } : {}),
      ...(query.incidentType ? { incidentType: query.incidentType } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { incidentCode: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [incidents, total] = await this.prismaService.$transaction([
      this.prismaService.dispatchIncident.findMany({
        where,
        select: DISPATCH_INCIDENT_SELECT,
        orderBy: [{ reportedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prismaService.dispatchIncident.count({ where }),
    ]);

    const canonicalIncidents = await this.listCanonicalIncidentsByIds(
      incidents.map((incident) => incident.id),
    );
    const canonicalById = new Map(canonicalIncidents.map((incident) => [incident.id, incident]));

    return buildPaginatedResponse(
      'Operational issues retrieved successfully.',
      incidents.map((incident) =>
        toDispatchIncidentResponse(
          this.mapCanonicalIncidentToDispatchIncident(
            incident,
            canonicalById.get(incident.id) ?? null,
          ),
        ),
      ),
      buildPaginationMeta({ page, limit, total }),
    );
  }

  async getIncident(id: string) {
    const incident = await this.findIncidentById(id);
    const canonicalIncident = await this.findCanonicalIncidentById(id);
    return buildSuccessResponse(
      'Operational issue retrieved successfully.',
      toDispatchIncidentResponse(
        this.mapCanonicalIncidentToDispatchIncident(incident, canonicalIncident),
      ),
    );
  }

  async getParitySummary(organizationId?: string) {
    const [zones, operationalZones, assignments, resourceAssignments, incidents, operationalIncidents] =
      await Promise.all([
        this.prismaService.dispatchZone.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
        this.prismaService.operationalZone.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
        this.prismaService.driverVehicleAssignment.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
        this.prismaService.resourceAssignment.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
        this.prismaService.dispatchIncident.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
        this.prismaService.operationalIncident.findMany({
          where: organizationId ? { organizationId } : undefined,
          select: { id: true },
        }),
      ]);

    return buildSuccessResponse('Operations compatibility parity retrieved successfully.', {
      organizationId: organizationId ?? null,
      generatedAt: new Date().toISOString(),
      scopes: [
        this.buildParityScope(
          'dispatch-zones->operational-zones',
          zones.map((item) => item.id),
          operationalZones.map((item) => item.id),
          ['Legacy zone compatibility reads canonical operational zones first when shared-key parity exists.'],
        ),
        this.buildParityScope(
          'driver-vehicle-assignments->resource-assignments',
          assignments.map((item) => item.id),
          resourceAssignments.map((item) => item.id),
          ['Assignment compatibility remains shared-key and rollback-safe while write ownership is still legacy.'],
        ),
        this.buildParityScope(
          'dispatch-incidents->operational-incidents',
          incidents.map((item) => item.id),
          operationalIncidents.map((item) => item.id),
          ['DispatchRun-linked incidents remain transitional until operational-run semantics are explicitly decided.'],
        ),
      ],
    });
  }

  async updateIncident(id: string, dto: UpdateDispatchIncidentDto) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('At least one operational issue field must be provided for update.');
    }

    const existing = await this.findIncidentById(id);
    await this.ensureRunBelongsToOrganization(
      dto.runId !== undefined ? dto.runId ?? undefined : existing.runId ?? undefined,
      existing.organizationId,
    );
    await this.ensureAssignmentBelongsToOrganization(
      dto.assignmentId !== undefined ? dto.assignmentId ?? undefined : existing.assignmentId ?? undefined,
      existing.organizationId,
    );
    await this.ensureUserBelongsToOrganization(
      dto.reportedByUserId !== undefined
        ? dto.reportedByUserId ?? undefined
        : existing.reportedByUserId ?? undefined,
      existing.organizationId,
    );

    if (dto.incidentCode && dto.incidentCode !== existing.incidentCode) {
      await this.ensureIncidentCodeAvailable(existing.organizationId, dto.incidentCode, id);
    }

    const incident = await this.prismaService.dispatchIncident.update({
      where: { id },
      data: {
        ...(dto.runId !== undefined ? { runId: dto.runId } : {}),
        ...(dto.assignmentId !== undefined ? { assignmentId: dto.assignmentId } : {}),
        ...(dto.incidentCode !== undefined ? { incidentCode: dto.incidentCode } : {}),
        ...(dto.incidentType !== undefined ? { incidentType: dto.incidentType } : {}),
        ...(dto.severity !== undefined ? { severity: dto.severity } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined
          ? {
              status: dto.status,
              ...(dto.status === DispatchIncidentStatus.RESOLVED
                ? { resolvedAt: new Date() }
                : dto.status === DispatchIncidentStatus.OPEN ||
                    dto.status === DispatchIncidentStatus.IN_PROGRESS ||
                    dto.status === DispatchIncidentStatus.CANCELLED
                  ? { resolvedAt: null }
                  : {}),
            }
          : {}),
        ...(dto.reportedByUserId !== undefined ? { reportedByUserId: dto.reportedByUserId } : {}),
        ...(dto.reportedAt !== undefined ? { reportedAt: new Date(dto.reportedAt) } : {}),
      },
      select: DISPATCH_INCIDENT_SELECT,
    });

    if (dto.status === DispatchIncidentStatus.RESOLVED) {
      await this.domainEventsService.publish({
        organizationId: incident.organizationId,
        eventType: 'operations.issue.resolved',
        aggregateType: 'operational-issue',
        aggregateId: incident.id,
        triggeredByUserId: incident.reportedByUserId ?? null,
        payload: {
          notification: {
            category: NotificationCategory.INCIDENT,
            severity: NotificationSeverity.INFO,
            title: `Operational issue resolved: ${incident.incidentCode}`,
            message: incident.title,
            actionUrl: `/operations/incidents/${incident.id}`,
            entityType: 'operational-issue',
            entityId: incident.id,
            metadata: {
              incidentType: incident.incidentType,
              severity: incident.severity,
            },
          },
          recipients: {
            userIds: incident.reportedByUserId ? [incident.reportedByUserId] : [],
            permissionCodes: ['dispatch.intervene'],
          },
        },
      });
    }

    return buildSuccessResponse(
      'Operational issue updated successfully.',
      toDispatchIncidentResponse(incident),
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

  private async ensureZoneCodeAvailable(
    organizationId: string,
    code: string,
    zoneIdToExclude?: string,
  ) {
    const existing = await this.prismaService.dispatchZone.findFirst({
      where: {
        organizationId,
        code,
        ...(zoneIdToExclude ? { id: { not: zoneIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An operational zone with the provided code already exists.');
    }
  }

  private async ensureShiftCodeAvailable(
    organizationId: string,
    code: string,
    shiftIdToExclude?: string,
  ) {
    const existing = await this.prismaService.dispatchShift.findFirst({
      where: {
        organizationId,
        code,
        ...(shiftIdToExclude ? { id: { not: shiftIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An operational shift with the provided code already exists.');
    }
  }

  private async ensureRunCodeAvailable(
    organizationId: string,
    runCode: string,
    runIdToExclude?: string,
  ) {
    const existing = await this.prismaService.dispatchRun.findFirst({
      where: {
        organizationId,
        runCode,
        ...(runIdToExclude ? { id: { not: runIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An operational run with the provided runCode already exists.');
    }
  }

  private async ensureIncidentCodeAvailable(
    organizationId: string,
    incidentCode: string,
    incidentIdToExclude?: string,
  ) {
    const existing = await this.prismaService.dispatchIncident.findFirst({
      where: {
        organizationId,
        incidentCode,
        ...(incidentIdToExclude ? { id: { not: incidentIdToExclude } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An operational issue with the provided issueCode already exists.');
    }
  }

  private async ensureZoneBelongsToOrganization(zoneId: string | undefined, organizationId: string) {
    if (!zoneId) {
      return;
    }

    const zone = await this.prismaService.dispatchZone.findFirst({
      where: { id: zoneId, organizationId },
      select: { id: true },
    });

    if (!zone) {
      throw new NotFoundException('Operational zone not found.');
    }
  }

  private async ensureActiveShiftBelongsToOrganization(
    shiftId: string | undefined,
    organizationId: string,
  ) {
    if (!shiftId) {
      return;
    }

    const shift = await this.prismaService.dispatchShift.findFirst({
      where: { id: shiftId, organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!shift) {
      throw new NotFoundException('Operational shift not found.');
    }
  }

  private async ensureUserBelongsToOrganization(
    userId: string | undefined,
    organizationId: string,
  ) {
    if (!userId) {
      return;
    }

    const user = await this.prismaService.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
        status: { in: [UserStatus.ACTIVE, UserStatus.INVITED] },
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private async findAssignableDriver(driverId: string, organizationId: string) {
    const driver = await this.prismaService.driver.findFirst({
      where: { id: driverId, organizationId, deletedAt: null },
      select: {
        id: true,
        onboardingStatus: true,
        operationalStatus: true,
        complianceStatus: true,
        assignmentStatus: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Operator not found.');
    }

    const onboardingReady =
      driver.onboardingStatus === DriverOnboardingStatus.APPROVED ||
      driver.onboardingStatus === DriverOnboardingStatus.COMPLETED;
    const operationalReady = driver.operationalStatus === DriverOperationalStatus.ACTIVE;
    const complianceReady = driver.complianceStatus === DriverComplianceStatus.COMPLIANT;
    const assignmentReady = driver.assignmentStatus === DriverAssignmentStatus.AVAILABLE;

    if (!(onboardingReady && operationalReady && complianceReady && assignmentReady)) {
      throw new BadRequestException('Operator is not operationally eligible for resource assignment.');
    }

    return driver;
  }

  private async findAssignableVehicle(vehicleId: string, organizationId: string) {
    const vehicle = await this.prismaService.fleetVehicle.findFirst({
      where: { id: vehicleId, organizationId, deletedAt: null },
      select: {
        id: true,
        onboardingStatus: true,
        operationalStatus: true,
        complianceStatus: true,
        assignmentStatus: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Asset not found.');
    }

    const onboardingReady =
      vehicle.onboardingStatus === FleetOnboardingStatus.APPROVED ||
      vehicle.onboardingStatus === FleetOnboardingStatus.COMPLETED;
    const operationalReady =
      vehicle.operationalStatus === FleetOperationalStatus.ACTIVE ||
      vehicle.operationalStatus === FleetOperationalStatus.IN_SERVICE;
    const complianceReady = vehicle.complianceStatus === FleetComplianceStatus.COMPLIANT;
    const assignmentReady = vehicle.assignmentStatus === FleetAssignmentStatus.AVAILABLE;

    if (!(onboardingReady && operationalReady && complianceReady && assignmentReady)) {
      throw new BadRequestException('Asset is not operationally ready for resource assignment.');
    }

    return vehicle;
  }

  private async listCanonicalZonesByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return this.prismaService.operationalZone.findMany({
      where: { id: { in: ids } },
      select: OPERATIONAL_ZONE_SELECT,
    });
  }

  private async findCanonicalZoneById(id: string) {
    return this.prismaService.operationalZone.findUnique({
      where: { id },
      select: OPERATIONAL_ZONE_SELECT,
    });
  }

  private async listCanonicalAssignmentsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return this.prismaService.resourceAssignment.findMany({
      where: { id: { in: ids } },
      select: RESOURCE_ASSIGNMENT_SELECT,
    });
  }

  private async findCanonicalAssignmentById(id: string) {
    return this.prismaService.resourceAssignment.findUnique({
      where: { id },
      select: RESOURCE_ASSIGNMENT_SELECT,
    });
  }

  private async listCanonicalIncidentsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    return this.prismaService.operationalIncident.findMany({
      where: { id: { in: ids } },
      select: OPERATIONAL_INCIDENT_SELECT,
    });
  }

  private async findCanonicalIncidentById(id: string) {
    return this.prismaService.operationalIncident.findUnique({
      where: { id },
      select: OPERATIONAL_INCIDENT_SELECT,
    });
  }

  private mapCanonicalZoneToDispatchZone(
    legacyZone: Awaited<ReturnType<DispatchService['findZoneById']>>,
    canonicalZone: OperationalZoneResponse | null,
  ) {
    if (!canonicalZone) {
      return legacyZone;
    }

    const metadata = this.readCompatibilityMetadata(canonicalZone.metadata);

    return {
      ...legacyZone,
      organizationId: canonicalZone.organizationId,
      code: canonicalZone.zoneCode,
      name: canonicalZone.name,
      description:
        canonicalZone.description ?? this.readNullableString(metadata, 'description'),
      isActive: canonicalZone.isActive,
      createdAt: canonicalZone.createdAt,
      updatedAt: canonicalZone.updatedAt,
    };
  }

  private mapCanonicalAssignmentToDispatchAssignment(
    legacyAssignment: Awaited<ReturnType<DispatchService['findAssignmentById']>>,
    canonicalAssignment: ResourceAssignmentResponse | null,
  ) {
    if (!canonicalAssignment) {
      return legacyAssignment;
    }

    const metadata = this.readCompatibilityMetadata(canonicalAssignment.metadata);

    return {
      ...legacyAssignment,
      organizationId: canonicalAssignment.organizationId,
      driverId: canonicalAssignment.workforceMemberId ?? legacyAssignment.driverId,
      vehicleId: canonicalAssignment.assetId ?? legacyAssignment.vehicleId,
      zoneId: canonicalAssignment.zoneId ?? legacyAssignment.zoneId,
      shiftId: canonicalAssignment.shiftId ?? legacyAssignment.shiftId,
      assignmentStatus: this.mapResourceAssignmentStatusToLegacy(canonicalAssignment.status),
      assignedAt: canonicalAssignment.assignedAt,
      releasedAt: canonicalAssignment.releasedAt,
      assignedByUserId: canonicalAssignment.assignedByUserId ?? legacyAssignment.assignedByUserId,
      notes:
        this.readNullableString(metadata, 'notes') ??
        legacyAssignment.notes,
      createdAt: canonicalAssignment.createdAt,
      updatedAt: canonicalAssignment.updatedAt,
    };
  }

  private mapCanonicalIncidentToDispatchIncident(
    legacyIncident: Awaited<ReturnType<DispatchService['findIncidentById']>>,
    canonicalIncident: OperationalIncidentResponse | null,
  ) {
    if (!canonicalIncident) {
      return legacyIncident;
    }

    const metadata = this.readCompatibilityMetadata(canonicalIncident.metadata);

    return {
      ...legacyIncident,
      organizationId: canonicalIncident.organizationId,
      runId: this.readNullableString(metadata, 'runId') ?? legacyIncident.runId,
      assignmentId: this.readNullableString(metadata, 'assignmentId') ?? legacyIncident.assignmentId,
      incidentCode: canonicalIncident.incidentCode,
      incidentType: canonicalIncident.incidentType as typeof legacyIncident.incidentType,
      severity: this.mapOperationalIncidentSeverityToLegacy(canonicalIncident.severity),
      title: canonicalIncident.title,
      description: canonicalIncident.description,
      status: this.mapOperationalIncidentStatusToLegacy(canonicalIncident.status),
      reportedByUserId: canonicalIncident.reportedByUserId,
      reportedAt: canonicalIncident.reportedAt,
      resolvedAt: canonicalIncident.resolvedAt,
      createdAt: canonicalIncident.createdAt,
      updatedAt: canonicalIncident.updatedAt,
    };
  }

  private buildParityScope(
    scope: string,
    legacyIds: string[],
    canonicalIds: string[],
    notes: string[],
  ) {
    const canonicalIdSet = new Set(canonicalIds);
    return {
      scope,
      legacyCount: legacyIds.length,
      canonicalCount: canonicalIds.length,
      missingCanonicalIds: legacyIds.filter((id) => !canonicalIdSet.has(id)).slice(0, 25),
      notes,
    };
  }

  private readCompatibilityMetadata(metadata: unknown) {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : null;
  }

  private readNullableString(
    metadata: Record<string, unknown> | null,
    key: string,
  ): string | null {
    if (!metadata) {
      return null;
    }

    const value = metadata[key];
    return typeof value === 'string' ? value : null;
  }

  private mapResourceAssignmentStatusToLegacy(
    status: ResourceAssignmentStatus,
  ): DriverVehicleAssignmentStatus {
    if (status === ResourceAssignmentStatus.ACTIVE) return DriverVehicleAssignmentStatus.ACTIVE;
    if (status === ResourceAssignmentStatus.RELEASED) return DriverVehicleAssignmentStatus.RELEASED;
    if (status === ResourceAssignmentStatus.CANCELLED) return DriverVehicleAssignmentStatus.CANCELLED;
    if (status === ResourceAssignmentStatus.SUSPENDED) return DriverVehicleAssignmentStatus.CANCELLED;
    return DriverVehicleAssignmentStatus.ASSIGNED;
  }

  private mapOperationalIncidentSeverityToLegacy(
    severity: IncidentSeverity,
  ): DispatchIncidentSeverity {
    if (severity === IncidentSeverity.CRITICAL) return DispatchIncidentSeverity.CRITICAL;
    if (severity === IncidentSeverity.HIGH) return DispatchIncidentSeverity.HIGH;
    if (severity === IncidentSeverity.MEDIUM) return DispatchIncidentSeverity.MEDIUM;
    return DispatchIncidentSeverity.LOW;
  }

  private mapOperationalIncidentStatusToLegacy(
    status: OperationalIncidentStatus,
  ): DispatchIncidentStatus {
    if (status === OperationalIncidentStatus.IN_PROGRESS) return DispatchIncidentStatus.IN_PROGRESS;
    if (status === OperationalIncidentStatus.RESOLVED) return DispatchIncidentStatus.RESOLVED;
    if (status === OperationalIncidentStatus.CANCELLED) return DispatchIncidentStatus.CANCELLED;
    return DispatchIncidentStatus.OPEN;
  }

  private async ensureNoConflictingAssignments(
    organizationId: string,
    driverId: string,
    vehicleId: string,
    assignmentIdToExclude?: string,
  ) {
    const conflict = await this.prismaService.driverVehicleAssignment.findFirst({
      where: {
        organizationId,
        assignmentStatus: { in: [...CONFLICTING_ASSIGNMENT_STATUSES] },
        ...(assignmentIdToExclude ? { id: { not: assignmentIdToExclude } } : {}),
        OR: [{ driverId }, { vehicleId }],
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ConflictException('A conflicting active operator or asset assignment already exists.');
    }
  }

  private async ensureAssignmentBelongsToOrganization(
    assignmentId: string | undefined,
    organizationId: string,
  ) {
    if (!assignmentId) {
      return null;
    }

    const assignment = await this.prismaService.driverVehicleAssignment.findFirst({
      where: { id: assignmentId, organizationId },
      select: { id: true, zoneId: true },
    });

    if (!assignment) {
      throw new NotFoundException('Resource assignment not found.');
    }

    return assignment;
  }

  private async ensureRunBelongsToOrganization(runId: string | undefined, organizationId: string) {
    if (!runId) {
      return;
    }

    const run = await this.prismaService.dispatchRun.findFirst({
      where: { id: runId, organizationId },
      select: { id: true },
    });

    if (!run) {
      throw new NotFoundException('Operational run not found.');
    }
  }

  private async findZoneById(id: string) {
    const zone = await this.prismaService.dispatchZone.findUnique({
      where: { id },
      select: DISPATCH_ZONE_SELECT,
    });

    if (!zone) {
      throw new NotFoundException('Operational zone not found.');
    }

    return zone;
  }

  private async findActiveShiftById(id: string) {
    const shift = await this.prismaService.dispatchShift.findFirst({
      where: { id, deletedAt: null },
      select: DISPATCH_SHIFT_SELECT,
    });

    if (!shift) {
      throw new NotFoundException('Operational shift not found.');
    }

    return shift;
  }

  private async findAssignmentById(id: string) {
    const assignment = await this.prismaService.driverVehicleAssignment.findUnique({
      where: { id },
      select: DRIVER_VEHICLE_ASSIGNMENT_SELECT,
    });

    if (!assignment) {
      throw new NotFoundException('Resource assignment not found.');
    }

    return assignment;
  }

  private async findRunById(id: string) {
    const run = await this.prismaService.dispatchRun.findUnique({
      where: { id },
      select: DISPATCH_RUN_SELECT,
    });

    if (!run) {
      throw new NotFoundException('Operational run not found.');
    }

    return run;
  }

  private async findIncidentById(id: string) {
    const incident = await this.prismaService.dispatchIncident.findUnique({
      where: { id },
      select: DISPATCH_INCIDENT_SELECT,
    });

    if (!incident) {
      throw new NotFoundException('Operational issue not found.');
    }

    return incident;
  }

  private ensureShiftWindowIsValid(startsAt: string, endsAt: string) {
    if (new Date(startsAt) >= new Date(endsAt)) {
      throw new BadRequestException('Operational shift endsAt must be later than startsAt.');
    }
  }

  private buildRunTimestampUpdate(status: DispatchRunStatus | undefined) {
    if (!status) {
      return {};
    }

    if (status === DispatchRunStatus.ACTIVE) {
      return {
        startedAt: new Date(),
        completedAt: null,
        cancelledAt: null,
      };
    }

    if (status === DispatchRunStatus.COMPLETED) {
      return {
        completedAt: new Date(),
        cancelledAt: null,
      };
    }

    if (status === DispatchRunStatus.CANCELLED) {
      return {
        cancelledAt: new Date(),
      };
    }

    return {};
  }

  private mapIncidentSeverityToNotificationSeverity(
    severity: DispatchIncidentSeverity,
  ): NotificationSeverity {
    if (
      severity === DispatchIncidentSeverity.CRITICAL ||
      severity === DispatchIncidentSeverity.HIGH
    ) {
      return NotificationSeverity.CRITICAL;
    }

    if (severity === DispatchIncidentSeverity.MEDIUM) {
      return NotificationSeverity.WARNING;
    }

    return NotificationSeverity.INFO;
  }
}
