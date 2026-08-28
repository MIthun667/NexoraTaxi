import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalRequestStatus,
  ApprovalStepStatus,
  DispatchIncidentSeverity,
  DriverComplianceStatus,
  DriverOperationalStatus,
  FleetComplianceStatus,
  FleetMaintenanceStatus,
  FleetOperationalStatus,
  WorkflowTaskStatus,
} from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AiCommerceMetricsService } from '../intelligence/ai-commerce-metrics.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { UNIVERSAL_RETRIEVAL_ENTITY_TYPES } from '../retrieval/retrieval.constants';
import { CommerceAgentContextService } from './commerce-agent-context.service';

export interface BuiltAgentContext {
  organizationId: string;
  entityId?: string;
  entityType?: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class AgentContextService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly retrievalService: RetrievalService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly commerceAgentContextService: CommerceAgentContextService,
  ) {}

  async ensureOrganizationScope(organizationId: string) {
    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization context could not be resolved.');
    }

    return organization.id;
  }

  async buildContext(input: {
    principal: CurrentPrincipal;
    agentCode: string;
    entityId?: string;
    entityType?: string;
    inputContext?: Record<string, unknown>;
    organizationId: string;
  }): Promise<BuiltAgentContext> {
    switch (input.agentCode) {
      case 'commerce_health_agent':
      case 'revenue_monitor_agent':
      case 'customer_momentum_agent':
      case 'integration_guard_agent':
        return {
          organizationId: input.organizationId,
          payload: await this.commerceAgentContextService.buildContext(
            input.principal,
            input.agentCode,
            input.organizationId,
            input.inputContext,
          ) as unknown as Record<string, unknown>,
        };
      case 'commerce-monitor-agent':
        return this.buildCommerceMonitorContext(input.organizationId, input.inputContext);
      case 'revenue-risk-agent':
        return this.buildRevenueRiskContext(input.organizationId, input.inputContext);
      case 'customer-health-agent':
        return this.buildCustomerHealthContext(input.organizationId, input.inputContext);
      case 'workforce-readiness-agent':
        return this.buildWorkforceReadinessContext(input.organizationId, input.inputContext);
      case 'operations-control-agent':
        return this.buildOperationsControlContext(input.organizationId, input.inputContext);
      case 'revenue-operations-agent':
        return this.buildRevenueOperationsContext(input.organizationId, input.inputContext);
      case 'operations-summary-agent':
        return this.buildOperationsSummaryContext(input.organizationId, input.inputContext);
      case 'approval-assistant-agent':
        return this.buildApprovalAssistantContext(
          input.organizationId,
          input.entityType,
          input.entityId,
        );
      case 'dispatch-risk-agent':
        return this.buildDispatchRiskContext(
          input.organizationId,
          input.entityType,
          input.entityId,
        );
      case 'driver-oversight-agent':
        return this.buildDriverOversightContext(input.organizationId, input.entityId);
      case 'fleet-compliance-agent':
        return this.buildFleetComplianceContext(input.organizationId, input.entityId);
      default:
        if (
          input.entityType &&
          UNIVERSAL_RETRIEVAL_ENTITY_TYPES.includes(
            input.entityType as (typeof UNIVERSAL_RETRIEVAL_ENTITY_TYPES)[number],
          )
        ) {
          return this.buildUniversalRetrievalContext(
            input.organizationId,
            input.entityType,
            input.entityId,
            input.inputContext,
          );
        }
        throw new BadRequestException('Unsupported agent context request.');
    }
  }

  private async buildCommerceMonitorContext(
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const [organization, metrics, store, productsCount, activeSignals] = await Promise.all([
      this.getOrganizationArchetype(organizationId),
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
      this.prismaService.integrationShopifyStore.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { installedAt: 'desc' },
        select: { shopDomain: true },
      }),
      this.prismaService.shopifyProduct.count({ where: { organizationId } }),
      this.prismaService.aiSignal.findMany({
        where: { organizationId, isActive: true },
        orderBy: [{ createdAt: 'desc' }],
        take: 5,
        select: { type: true, severity: true, title: true },
      }),
    ]);

    return {
      organizationId,
      payload: {
        archetype: organization.archetype,
        organizationName: organization.name,
        shopDomain: store?.shopDomain ?? null,
        productsCount,
        shopifyCoverage: metrics.shopifyDataCoverage,
        shopifyLimitedAccess: metrics.shopifyLimitedAccess,
        protectedCustomerDataRequired: metrics.protectedCustomerDataRequired,
        stripeConnected: metrics.stripeConnected,
        refundTelemetryAvailable: metrics.refundTelemetryAvailable,
        activeSignals,
        triggerSource:
          typeof inputContext?.triggerSource === 'string' ? inputContext.triggerSource : null,
      },
    };
  }

  private async buildRevenueRiskContext(
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const [organization, metrics, store] = await Promise.all([
      this.getOrganizationArchetype(organizationId),
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
      this.prismaService.integrationShopifyStore.findFirst({
        where: { organizationId, isActive: true },
        orderBy: { installedAt: 'desc' },
        select: { shopDomain: true },
      }),
    ]);

    return {
      organizationId,
      payload: {
        archetype: organization.archetype,
        organizationName: organization.name,
        shopDomain: store?.shopDomain ?? null,
        shopifyCoverage: metrics.shopifyDataCoverage,
        shopifyLimitedAccess: metrics.shopifyLimitedAccess,
        stripeConnected: metrics.stripeConnected,
        refundTelemetryAvailable: metrics.refundTelemetryAvailable,
        totalRevenueToday: metrics.shopifyLimitedAccess ? null : metrics.totalRevenueToday,
        totalOrdersToday: metrics.shopifyLimitedAccess ? null : metrics.totalOrdersToday,
        totalNewCustomersToday: metrics.shopifyLimitedAccess ? null : metrics.totalNewCustomersToday,
        stripeRevenueToday: metrics.stripeConnected ? metrics.stripeRevenueToday : null,
        stripeFailedPaymentsCurrent24h: metrics.stripeFailedPaymentsCurrent24h,
        stripeRefundsCurrent24h: metrics.stripeRefundsCurrent24h,
        triggerSource:
          typeof inputContext?.triggerSource === 'string' ? inputContext.triggerSource : null,
      },
    };
  }

  private async buildCustomerHealthContext(
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const [organization, metrics, totalProfiles, highValueCustomers, atRiskCustomers, dormantCustomers] =
      await Promise.all([
        this.getOrganizationArchetype(organizationId),
        this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
        this.prismaService.crmCustomerProfile.count({ where: { organizationId } }),
        this.prismaService.crmCustomerProfile.count({
          where: { organizationId, isHighValue: true },
        }),
        this.prismaService.crmCustomerProfile.count({
          where: { organizationId, isAtRisk: true },
        }),
        this.prismaService.crmCustomerProfile.count({
          where: { organizationId, lifecycleStage: 'DORMANT' },
        }),
      ]);

    return {
      organizationId,
      payload: {
        archetype: organization.archetype,
        organizationName: organization.name,
        customerCoverageAvailable: !metrics.shopifyLimitedAccess,
        protectedCustomerDataRequired: metrics.protectedCustomerDataRequired,
        totalProfiles,
        highValueCustomers,
        atRiskCustomers,
        dormantCustomers,
        triggerSource:
          typeof inputContext?.triggerSource === 'string' ? inputContext.triggerSource : null,
      },
    };
  }

  private async buildWorkforceReadinessContext(
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const [organization, activeEmployees, onboardingEmployees, leaveOfAbsenceEmployees, availableDrivers, nonCompliantDrivers, activeAssignments, activeShiftsToday, pendingApprovalRequests, overdueApprovalSteps, pendingWorkflowTasks, recentlyHiredCount] =
      await Promise.all([
        this.getOrganizationArchetype(organizationId),
        this.prismaService.employee.count({
          where: { organizationId, deletedAt: null, employmentStatus: 'ACTIVE' },
        }),
        this.prismaService.employee.count({
          where: { organizationId, deletedAt: null, employmentStatus: 'ONBOARDING' },
        }),
        this.prismaService.employee.count({
          where: { organizationId, deletedAt: null, employmentStatus: 'LEAVE_OF_ABSENCE' },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: DriverOperationalStatus.ACTIVE,
            complianceStatus: DriverComplianceStatus.COMPLIANT,
            assignmentStatus: 'AVAILABLE',
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            complianceStatus: {
              in: [
                DriverComplianceStatus.EXPIRED,
                DriverComplianceStatus.NON_COMPLIANT,
                DriverComplianceStatus.UNDER_REVIEW,
              ],
            },
          },
        }),
        this.prismaService.driverVehicleAssignment.count({
          where: {
            organizationId,
            assignmentStatus: { in: ['ASSIGNED', 'ACTIVE'] },
            releasedAt: null,
          },
        }),
        this.prismaService.dispatchShift.count({
          where: {
            organizationId,
            status: { in: ['SCHEDULED', 'ACTIVE'] },
            deletedAt: null,
          },
        }),
        this.prismaService.approvalRequest.count({
          where: {
            organizationId,
            status: { in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] },
          },
        }),
        this.prismaService.approvalStep.count({
          where: {
            approvalRequest: { organizationId },
            status: ApprovalStepStatus.PENDING,
            dueAt: { lt: new Date() },
          },
        }),
        this.prismaService.workflowTask.count({
          where: {
            instance: { organizationId },
            status: { in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS] },
          },
        }),
        this.prismaService.employee.count({
          where: {
            organizationId,
            deletedAt: null,
            hireDate: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
          },
        }),
      ]);

    return {
      organizationId,
      payload: {
        archetype: organization.archetype,
        organizationName: organization.name,
        activeEmployees,
        onboardingEmployees,
        leaveOfAbsenceEmployees,
        availableOperators: availableDrivers,
        nonCompliantOperators: nonCompliantDrivers,
        activeAssignments,
        activeShiftsToday,
        pendingApprovalRequests,
        overdueApprovalSteps,
        pendingWorkflowTasks,
        recentlyHiredCount,
        inputContext: inputContext ?? null,
      },
    };
  }

  private async buildOperationsControlContext(
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const [organization, openIncidents, criticalIncidents, activeAssignments, activeRuns, readyAssets, overdueMaintenanceCount, expiringComplianceArtifacts, availableOperators, nonCompliantOperators, activeAlerts] =
      await Promise.all([
        this.getOrganizationArchetype(organizationId),
        this.prismaService.dispatchIncident.count({
          where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        }),
        this.prismaService.dispatchIncident.count({
          where: {
            organizationId,
            status: { in: ['OPEN', 'IN_PROGRESS'] },
            severity: { in: [DispatchIncidentSeverity.HIGH, DispatchIncidentSeverity.CRITICAL] },
          },
        }),
        this.prismaService.driverVehicleAssignment.count({
          where: {
            organizationId,
            assignmentStatus: { in: ['ASSIGNED', 'ACTIVE'] },
            releasedAt: null,
          },
        }),
        this.prismaService.dispatchRun.count({
          where: {
            organizationId,
            dispatchStatus: { in: ['CREATED', 'ACTIVE'] },
          },
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: 'ACTIVE',
            complianceStatus: FleetComplianceStatus.COMPLIANT,
            assignmentStatus: 'AVAILABLE',
          },
        }),
        this.prismaService.fleetMaintenanceRecord.count({
          where: {
            vehicle: { organizationId },
            OR: [
              { status: FleetMaintenanceStatus.OVERDUE },
              {
                status: FleetMaintenanceStatus.SCHEDULED,
                scheduledAt: { lt: new Date() },
              },
            ],
          },
        }),
        this.prismaService.fleetVehicle.count({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { insuranceExpiresAt: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) } },
              { registrationExpiresAt: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) } },
            ],
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            operationalStatus: DriverOperationalStatus.ACTIVE,
            complianceStatus: DriverComplianceStatus.COMPLIANT,
            assignmentStatus: 'AVAILABLE',
          },
        }),
        this.prismaService.driver.count({
          where: {
            organizationId,
            deletedAt: null,
            complianceStatus: {
              in: [
                DriverComplianceStatus.EXPIRED,
                DriverComplianceStatus.NON_COMPLIANT,
                DriverComplianceStatus.UNDER_REVIEW,
              ],
            },
          },
        }),
        this.prismaService.systemAlert.count({
          where: {
            organizationId,
            resolvedAt: null,
          },
        }),
      ]);

    return {
      organizationId,
      payload: {
        archetype: organization.archetype,
        organizationName: organization.name,
        openIncidents,
        criticalIncidents,
        activeAssignments,
        activeRuns,
        readyAssets,
        overdueMaintenanceCount,
        expiringComplianceArtifacts,
        availableOperators,
        nonCompliantOperators,
        activeAlerts,
        inputContext: inputContext ?? null,
      },
    };
  }

  private async buildRevenueOperationsContext(
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const [organization, pendingApprovalRequests, inProgressApprovalRequests, overdueApprovalSteps, activeWorkflowInstances, pendingWorkflowTasks, escalatedTasks, connectorInstances, connectorSyncFailures24h, connectorSyncBacklog, billingEvents7d] =
      await Promise.all([
        this.getOrganizationArchetype(organizationId),
        this.prismaService.approvalRequest.count({
          where: { organizationId, status: ApprovalRequestStatus.PENDING },
        }),
        this.prismaService.approvalRequest.count({
          where: { organizationId, status: ApprovalRequestStatus.IN_PROGRESS },
        }),
        this.prismaService.approvalStep.count({
          where: {
            approvalRequest: { organizationId },
            status: ApprovalStepStatus.PENDING,
            dueAt: { lt: new Date() },
          },
        }),
        this.prismaService.workflowInstance.count({
          where: { organizationId, status: 'ACTIVE' },
        }),
        this.prismaService.workflowTask.count({
          where: {
            instance: { organizationId },
            status: WorkflowTaskStatus.PENDING,
          },
        }),
        this.prismaService.workflowTask.count({
          where: {
            instance: { organizationId },
            status: WorkflowTaskStatus.ESCALATED,
          },
        }),
        this.prismaService.connectorInstance.count({
          where: { organizationId },
        }),
        this.prismaService.connectorSyncJob.count({
          where: {
            connectorInstance: { organizationId },
            status: 'FAILED',
            startedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) },
          },
        }),
        this.prismaService.connectorSyncJob.count({
          where: {
            connectorInstance: { organizationId },
            status: { in: ['PENDING', 'RUNNING'] },
          },
        }),
        this.prismaService.organizationBillingEvent.count({
          where: {
            organizationId,
            occurredAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) },
          },
        }),
      ]);

    return {
      organizationId,
      payload: {
        archetype: organization.archetype,
        organizationName: organization.name,
        pendingApprovalRequests,
        inProgressApprovalRequests,
        overdueApprovalSteps,
        activeWorkflowInstances,
        pendingWorkflowTasks,
        escalatedTasks,
        connectorInstances,
        connectorSyncFailures24h,
        connectorSyncBacklog,
        billingEvents7d,
        inputContext: inputContext ?? null,
      },
    };
  }

  private async buildUniversalRetrievalContext(
    organizationId: string,
    entityType: string,
    entityId?: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const retrievalBundle = await this.retrievalService.retrieveForAgentRun({
      organizationId,
      targetEntityType: entityType,
      targetEntityId: entityId,
      retrievalTypes: ['STATE', 'HISTORY', 'ANALYTICS', 'RISK', 'TIMELINE'],
      metadata: {
        source: 'agent-context',
        inputContext: inputContext ?? null,
      },
    });

    return {
      organizationId,
      entityId,
      entityType,
      payload: {
        retrievalBundle,
        inputContext: inputContext ?? null,
      },
    };
  }

  private async buildOperationsSummaryContext(
    organizationId: string,
    inputContext?: Record<string, unknown>,
  ): Promise<BuiltAgentContext> {
    const [
      pendingApprovals,
      openIncidents,
      criticalIncidents,
      pendingWorkflowTasks,
      activeAssignments,
      unavailableDrivers,
      unavailableVehicles,
    ] = await Promise.all([
      this.prismaService.approvalRequest.count({
        where: {
          organizationId,
          status: { in: [ApprovalRequestStatus.PENDING, ApprovalRequestStatus.IN_PROGRESS] },
        },
      }),
      this.prismaService.dispatchIncident.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.prismaService.dispatchIncident.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          severity: { in: [DispatchIncidentSeverity.HIGH, DispatchIncidentSeverity.CRITICAL] },
        },
      }),
      this.prismaService.workflowTask.count({
        where: {
          instance: { organizationId },
          status: { in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS] },
        },
      }),
      this.prismaService.driverVehicleAssignment.count({
        where: {
          organizationId,
          assignmentStatus: { in: ['ASSIGNED', 'ACTIVE'] },
          releasedAt: null,
        },
      }),
      this.prismaService.driver.count({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { complianceStatus: { not: DriverComplianceStatus.COMPLIANT } },
            { operationalStatus: { not: DriverOperationalStatus.ACTIVE } },
          ],
        },
      }),
      this.prismaService.fleetVehicle.count({
        where: {
          organizationId,
          deletedAt: null,
          OR: [
            { complianceStatus: { not: FleetComplianceStatus.COMPLIANT } },
            { operationalStatus: { not: FleetOperationalStatus.ACTIVE } },
          ],
        },
      }),
    ]);

    return {
      organizationId,
      payload: {
        activeAssignments,
        criticalIncidents,
        inputContext: inputContext ?? null,
        openIncidents,
        pendingApprovals,
        pendingWorkflowTasks,
        unavailableDrivers,
        unavailableVehicles,
      },
    };
  }

  private async buildApprovalAssistantContext(
    organizationId: string,
    entityType?: string,
    entityId?: string,
  ): Promise<BuiltAgentContext> {
    if (!entityId) {
      throw new BadRequestException('approval-assistant-agent requires an entityId.');
    }

    if (entityType && !['approval-request', 'approval-step'].includes(entityType)) {
      throw new BadRequestException(
        'approval-assistant-agent only supports approval-request or approval-step entities.',
      );
    }

    const isApprovalStep = entityType === 'approval-step';

    const payload = isApprovalStep
      ? await this.prismaService.approvalStep.findFirst({
          where: {
            id: entityId,
            approvalRequest: { organizationId },
          },
          select: {
            id: true,
            stepKey: true,
            title: true,
            status: true,
            dueAt: true,
            approverUserId: true,
            approverRoleCode: true,
            approvalRequest: {
              select: {
                id: true,
                title: true,
                status: true,
                entityType: true,
                entityId: true,
                workflowInstanceId: true,
              },
            },
            decisions: {
              select: {
                decisionType: true,
                createdAt: true,
                comment: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        })
      : await this.prismaService.approvalRequest.findFirst({
          where: {
            id: entityId,
            organizationId,
          },
          select: {
            id: true,
            title: true,
            status: true,
            entityType: true,
            entityId: true,
            workflowInstanceId: true,
            submittedAt: true,
            steps: {
              select: {
                id: true,
                stepKey: true,
                title: true,
                status: true,
                dueAt: true,
                approverUserId: true,
                approverRoleCode: true,
              },
              orderBy: { sequenceOrder: 'asc' },
            },
          },
        });

    if (!payload) {
      throw new NotFoundException('Approval context could not be resolved.');
    }

    return {
      organizationId,
      entityId,
      entityType: isApprovalStep ? 'approval-step' : 'approval-request',
      payload,
    };
  }

  private async buildDispatchRiskContext(
    organizationId: string,
    entityType?: string,
    entityId?: string,
  ): Promise<BuiltAgentContext> {
    if (entityId) {
      if (entityType && entityType !== 'dispatch-incident') {
        throw new BadRequestException(
          'The operations risk agent supports legacy dispatch-incident scope or no entity scope.',
        );
      }

      const incident = await this.prismaService.dispatchIncident.findFirst({
        where: {
          id: entityId,
          organizationId,
        },
        select: {
          id: true,
          incidentCode: true,
          incidentType: true,
          severity: true,
          title: true,
          status: true,
          reportedAt: true,
          resolvedAt: true,
          assignment: {
            select: {
              id: true,
              assignmentStatus: true,
              driverId: true,
              vehicleId: true,
            },
          },
          run: {
            select: {
              id: true,
              runCode: true,
              dispatchStatus: true,
            },
          },
        },
      });

      if (!incident) {
        throw new NotFoundException('Operational incident context could not be resolved.');
      }

      return {
        organizationId,
        entityId,
        entityType: 'dispatch-incident',
        payload: incident,
      };
    }

    const [openIncidents, criticalIncidents, activeAssignments, activeRuns] = await Promise.all([
      this.prismaService.dispatchIncident.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      this.prismaService.dispatchIncident.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          severity: DispatchIncidentSeverity.CRITICAL,
        },
      }),
      this.prismaService.driverVehicleAssignment.count({
        where: {
          organizationId,
          assignmentStatus: { in: ['ASSIGNED', 'ACTIVE'] },
          releasedAt: null,
        },
      }),
      this.prismaService.dispatchRun.count({
        where: {
          organizationId,
          dispatchStatus: { in: ['CREATED', 'ACTIVE'] },
        },
      }),
    ]);

    return {
      organizationId,
      payload: {
        activeAssignments,
        activeRuns,
        criticalIncidents,
        openIncidents,
      },
    };
  }

  private async buildDriverOversightContext(
    organizationId: string,
    entityId?: string,
  ): Promise<BuiltAgentContext> {
    if (!entityId) {
      throw new BadRequestException('The operator oversight agent requires a linked operator entityId.');
    }

    const driver = await this.prismaService.driver.findFirst({
      where: {
        id: entityId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        driverCode: true,
        firstName: true,
        lastName: true,
        onboardingStatus: true,
        operationalStatus: true,
        complianceStatus: true,
        assignmentStatus: true,
        licenseExpiresAt: true,
        documents: {
          select: {
            documentType: true,
            verificationStatus: true,
            expiresAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          select: {
            statusCategory: true,
            previousValue: true,
            newValue: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Operator context could not be resolved.');
    }

    return {
      organizationId,
      entityId,
      entityType: 'driver',
      payload: driver,
    };
  }

  private async buildFleetComplianceContext(
    organizationId: string,
    entityId?: string,
  ): Promise<BuiltAgentContext> {
    if (!entityId) {
      throw new BadRequestException('The asset compliance agent requires a linked asset entityId.');
    }

    const vehicle = await this.prismaService.fleetVehicle.findFirst({
      where: {
        id: entityId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        vehicleCode: true,
        plateNumber: true,
        vehicleClass: true,
        onboardingStatus: true,
        operationalStatus: true,
        complianceStatus: true,
        assignmentStatus: true,
        registrationExpiresAt: true,
        insuranceExpiresAt: true,
        maintenanceRecords: {
          select: {
            maintenanceType: true,
            title: true,
            status: true,
            scheduledAt: true,
            completedAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        statusHistory: {
          select: {
            statusCategory: true,
            previousValue: true,
            newValue: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Fleet context could not be resolved.');
    }

    const overdueMaintenanceCount = vehicle.maintenanceRecords.filter(
      (record) =>
        record.status === FleetMaintenanceStatus.OVERDUE ||
        (record.status === FleetMaintenanceStatus.SCHEDULED &&
          record.scheduledAt != null &&
          record.scheduledAt < new Date()),
    ).length;

    return {
      organizationId,
      entityId,
      entityType: 'fleet-vehicle',
      payload: {
        ...vehicle,
        overdueMaintenanceCount,
      },
    };
  }

  private async getOrganizationArchetype(organizationId: string) {
    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization context could not be resolved.');
    }

    const slug = organization.slug.toLowerCase();
    const name = organization.name.toLowerCase();
    const archetype = slug.includes('saas') || name.includes('saas')
      ? 'SAAS'
      : slug.includes('logistics') || name.includes('logistics')
        ? 'LOGISTICS'
        : slug.includes('revops') || name.includes('revenue operations')
          ? 'REVOPS'
          : slug.includes('northstar-universal') || name.includes('universal')
            ? 'CORE'
            : 'UNIVERSAL';

    return {
      ...organization,
      archetype,
    };
  }
}
