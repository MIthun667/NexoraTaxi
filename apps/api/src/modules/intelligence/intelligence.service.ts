import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApprovalRequestStatus,
  ApprovalStepStatus,
  DispatchIncidentSeverity,
  DriverAssignmentStatus,
  DriverComplianceStatus,
  DriverOperationalStatus,
  FleetAssignmentStatus,
  FleetComplianceStatus,
  FleetMaintenanceStatus,
  FleetOperationalStatus,
  Prisma,
  WorkflowInstanceStatus,
  WorkflowTaskStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { GenerateApprovalExplanationDto } from './dto/generate-approval-explanation.dto';
import { GenerateDispatchIncidentSummaryDto } from './dto/generate-dispatch-incident-summary.dto';
import { GenerateDriverComplianceExplanationDto } from './dto/generate-driver-compliance-explanation.dto';
import { GenerateFleetReadinessExplanationDto } from './dto/generate-fleet-readiness-explanation.dto';
import { GenerateOperationalSummaryDto } from './dto/generate-operational-summary.dto';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';
import { OllamaClientService } from './ollama-client.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { CrmCustomerIntelligenceService } from '../crm/crm-customer-intelligence.service';
import { ExecutiveSummaryService } from './executive-summary.service';
import { InsightEngine } from './insight-engine';
import { RecommendationEngine } from './recommendation-engine';
import { SignalRegistryService } from './signal-registry.service';
import { SignalEngine } from './signal-engine';
import { IntelligenceContext } from './intelligence.types';
import { approvalExplanationSchema } from './schemas/approval-explanation.schema';
import { dispatchIncidentSummarySchema } from './schemas/dispatch-incident-summary.schema';
import { driverComplianceExplanationSchema } from './schemas/driver-compliance-explanation.schema';
import { fleetReadinessExplanationSchema } from './schemas/fleet-readiness-explanation.schema';
import { operationalSummarySchema } from './schemas/operational-summary.schema';
import { agentOperationalInsightSchema } from './schemas/agent-operational-insight.schema';
import { StructuredInferenceService } from './structured-inference.service';

@Injectable()
export class IntelligenceService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly ollamaClientService: OllamaClientService,
    private readonly structuredInferenceService: StructuredInferenceService,
    private readonly signalRegistryService: SignalRegistryService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    private readonly crmCustomerIntelligenceService: CrmCustomerIntelligenceService,
    private readonly signalEngine: SignalEngine,
    private readonly insightEngine: InsightEngine,
    private readonly recommendationEngine: RecommendationEngine,
    private readonly executiveSummaryService: ExecutiveSummaryService,
  ) {}

  listRegisteredSignalProducers() {
    return this.signalRegistryService.list();
  }

  async collectAttendanceAnomalySignals(organizationId: string) {
    const producer = this.signalRegistryService.get('people.attendance-anomaly');

    if (!producer?.collect) {
      return [];
    }

    // TODO(universal-anomalies): add a generic orchestrator that can evaluate multiple registered anomaly detectors with shared tenant-scoped context.
    // TODO(universal-anomalies): enrich attendance anomalies with richer baselines, team-level comparisons, and leave-aware filtering once those read models are standardized.
    const context = {
      organizationId,
      detectorKey: 'people.attendance-anomaly',
    };

    return producer.collect(context);
  }

  async collectBudgetVarianceAnomalySignals(organizationId: string) {
    const producer = this.signalRegistryService.get('assets.budget-variance-anomaly');

    if (!producer?.collect) {
      return [];
    }

    // TODO(universal-anomalies): add true budget targets, cost center segmentation, approval-aware spend analysis, and seasonal baselines when those read models are standardized.
    const context = {
      organizationId,
      detectorKey: 'assets.budget-variance-anomaly',
    };

    return producer.collect(context);
  }

  async collectStalledWorkflowAnomalySignals(organizationId: string) {
    const producer = this.signalRegistryService.get(
      'workflows.stalled-bottleneck-anomaly',
    );

    if (!producer?.collect) {
      return [];
    }

    // TODO(universal-anomalies): add workflow-type-specific SLA thresholds, approver-role-aware bottleneck analysis, escalation prediction, and cross-department workflow health summaries.
    const context = {
      organizationId,
      detectorKey: 'workflows.stalled-bottleneck-anomaly',
    };

    return producer.collect(context);
  }

  async checkHealth() {
    const healthcheckEnabled = this.configService.get<boolean>(
      'environment.ollamaHealthcheckEnabled',
      true,
    );

    if (!healthcheckEnabled) {
      return buildSuccessResponse('Intelligence runtime health retrieved successfully.', {
        configuredModel: this.configService.get<string>(
          'environment.ollamaModel',
          'qwen2.5:7b-instruct',
        ),
        healthcheckEnabled: false,
        status: 'disabled',
      });
    }

    const data = await this.ollamaClientService.checkHealth();

    return buildSuccessResponse('Intelligence runtime health retrieved successfully.', {
      ...data,
      healthcheckEnabled: true,
    });
  }

  async getOverview(principal: CurrentPrincipal, query?: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query?.organizationId,
    );
    const context = await this.buildCommerceIntelligenceContext(organizationId);
    const signals = this.signalEngine.buildSignals(context);
    const completeContext: IntelligenceContext = {
      ...context,
      signals,
    };
    const insights = this.insightEngine.buildInsights(completeContext, signals);
    const recommendations = this.recommendationEngine.buildRecommendations(
      completeContext,
      signals,
    );
    const summary = await this.executiveSummaryService.generateSummary(
      completeContext,
      insights,
      recommendations,
    );

    return buildSuccessResponse('Commerce intelligence overview retrieved successfully.', {
      summary: summary.summary,
      signals,
      insights,
      recommendations,
      context: {
        shopDomain: completeContext.shopDomain,
        productsCount: completeContext.productsCount,
        hasOrderAccess: completeContext.hasOrderAccess,
        hasCustomerAccess: completeContext.hasCustomerAccess,
        hasStripe: completeContext.hasStripe,
        shopifyCoverage: completeContext.shopifyCoverage,
      },
      sourceType: summary.sourceType,
      modelName: summary.modelName,
    });
  }

  async generateOperationalSummary(
    principal: CurrentPrincipal,
    dto: GenerateOperationalSummaryDto,
  ) {
    // TODO(universal-signals): normalize generated summaries, top risks, and recommendations into CanonicalSignal-compatible evidence bundles.
    // TODO(agent-insights): migrate generated intelligence summaries onto the shared AgentInsight structure once dashboards and reports are ready to consume insight bundles.
    // TODO(recommendations): migrate generated recommendedActions arrays onto the shared Recommendation structure once insight bundling is introduced.
    const organizationId = await this.resolveOrganizationScope(principal, dto.organizationId);
    const days = dto.days ?? 7;
    const recentHireWindow = this.daysAgo(days);

    const [
      totalEmployees,
      activeEmployees,
      totalDrivers,
      activeDrivers,
      availableDrivers,
      nonCompliantDrivers,
      totalVehicles,
      dispatchReadyVehicles,
      outOfServiceVehicles,
      activeAssignments,
      openIncidents,
      pendingApprovals,
      inProgressApprovals,
      activeWorkflowInstances,
      pendingWorkflowTasks,
      recentHires,
    ] = await Promise.all([
      this.prismaService.employee.count({ where: { organizationId, deletedAt: null } }),
      this.prismaService.employee.count({
        where: {
          organizationId,
          deletedAt: null,
          employmentStatus: 'ACTIVE',
        },
      }),
      this.prismaService.driver.count({ where: { organizationId, deletedAt: null } }),
      this.prismaService.driver.count({
        where: {
          organizationId,
          deletedAt: null,
          operationalStatus: DriverOperationalStatus.ACTIVE,
        },
      }),
      this.prismaService.driver.count({
        where: {
          organizationId,
          deletedAt: null,
          operationalStatus: DriverOperationalStatus.ACTIVE,
          complianceStatus: DriverComplianceStatus.COMPLIANT,
          assignmentStatus: DriverAssignmentStatus.AVAILABLE,
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
      this.prismaService.fleetVehicle.count({ where: { organizationId, deletedAt: null } }),
      this.prismaService.fleetVehicle.count({
        where: {
          organizationId,
          deletedAt: null,
          operationalStatus: FleetOperationalStatus.ACTIVE,
          complianceStatus: FleetComplianceStatus.COMPLIANT,
          assignmentStatus: FleetAssignmentStatus.AVAILABLE,
        },
      }),
      this.prismaService.fleetVehicle.count({
        where: {
          organizationId,
          deletedAt: null,
          operationalStatus: FleetOperationalStatus.OUT_OF_SERVICE,
        },
      }),
      this.prismaService.driverVehicleAssignment.count({
        where: {
          organizationId,
          assignmentStatus: {
            in: ['ASSIGNED', 'ACTIVE'],
          },
          releasedAt: null,
        },
      }),
      this.prismaService.dispatchIncident.count({
        where: {
          organizationId,
          status: {
            in: ['OPEN', 'IN_PROGRESS'],
          },
        },
      }),
      this.prismaService.approvalRequest.count({
        where: {
          organizationId,
          status: ApprovalRequestStatus.PENDING,
        },
      }),
      this.prismaService.approvalRequest.count({
        where: {
          organizationId,
          status: ApprovalRequestStatus.IN_PROGRESS,
        },
      }),
      this.prismaService.workflowInstance.count({
        where: {
          organizationId,
          status: WorkflowInstanceStatus.ACTIVE,
        },
      }),
      this.prismaService.workflowTask.count({
        where: {
          instance: { organizationId },
          status: {
            in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
          },
        },
      }),
      this.prismaService.employee.count({
        where: {
          organizationId,
          deletedAt: null,
          hireDate: {
            gte: recentHireWindow,
          },
        },
      }),
    ]);

    const context = {
      focus: dto.focus ?? null,
      organizationId,
      windowDays: days,
      workforce: {
        totalEmployees,
        activeEmployees,
        recentHires,
      },
      drivers: {
        totalDrivers,
        activeDrivers,
        availableDrivers,
        nonCompliantDrivers,
      },
      fleet: {
        totalVehicles,
        dispatchReadyVehicles,
        outOfServiceVehicles,
      },
      operations: {
        activeAssignments,
        openIncidents,
      },
      approvals: {
        pendingApprovals,
        inProgressApprovals,
      },
      workflows: {
        activeWorkflowInstances,
        pendingWorkflowTasks,
      },
    };

    const data = await this.structuredInferenceService.generate({
      actorUserId: principal.userId,
      context,
      organizationId,
      schema: operationalSummarySchema,
      templateKey: 'operational-summary.v1',
    });

    return buildSuccessResponse('Operational summary generated successfully.', data);
  }

  private async buildCommerceIntelligenceContext(organizationId: string) {
    const [metrics, customerMetrics, activeStore, productsCount] = await Promise.all([
      this.aiCommerceMetricsService.getCommerceOverviewMetrics(organizationId),
      this.crmCustomerIntelligenceService.getCustomerHealthMetrics(organizationId),
      this.prismaService.integrationShopifyStore.findFirst({
        where: {
          organizationId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        select: { shopDomain: true },
      }),
      this.prismaService.shopifyProduct.count({
        where: { organizationId },
      }),
    ]);

    const hasOrderAccess = metrics.shopifyDataCoverage === 'FULL';
    const hasCustomerAccess = metrics.shopifyDataCoverage === 'FULL';

    return {
      shopDomain: activeStore?.shopDomain ?? 'unknown-shop.myshopify.com',
      productsCount,
      ordersToday: hasOrderAccess ? metrics.totalOrdersToday : undefined,
      revenueToday: hasOrderAccess ? metrics.totalRevenueToday : undefined,
      newCustomers: hasCustomerAccess ? metrics.totalNewCustomersToday : undefined,
      hasOrderAccess,
      hasCustomerAccess,
      hasStripe: metrics.stripeConnected,
      signals: [],
      confirmedRevenueToday: metrics.stripeConnected ? metrics.stripeRevenueToday : undefined,
      topProductTitle: metrics.topProduct?.title ?? undefined,
      shopifyCoverage: metrics.shopifyDataCoverage,
      retentionPressure: hasCustomerAccess ? customerMetrics.retentionPressure : undefined,
    } satisfies IntelligenceContext;
  }

  async generateApprovalExplanation(
    principal: CurrentPrincipal,
    dto: GenerateApprovalExplanationDto,
  ) {
    // TODO(universal-signals): map approval explanations and similar intelligence outputs onto the shared signal contract when explanation consumers are standardized.
    if (!dto.approvalRequestId && !dto.approvalStepId) {
      throw new BadRequestException(
        'approvalRequestId or approvalStepId is required to generate an approval explanation.',
      );
    }

    const approval =
      dto.approvalStepId != null
        ? await this.prismaService.approvalStep.findUnique({
            where: { id: dto.approvalStepId },
            select: {
              id: true,
              stepKey: true,
              title: true,
              description: true,
              sequenceOrder: true,
              status: true,
              approverUserId: true,
              approverRoleCode: true,
              dueAt: true,
              resolvedAt: true,
              approvalRequest: {
                select: {
                  id: true,
                  organizationId: true,
                  workflowInstanceId: true,
                  entityType: true,
                  entityId: true,
                  title: true,
                  description: true,
                  status: true,
                  submittedAt: true,
                  resolvedAt: true,
                  steps: {
                    select: {
                      id: true,
                      stepKey: true,
                      title: true,
                      sequenceOrder: true,
                      status: true,
                      approverUserId: true,
                      approverRoleCode: true,
                      dueAt: true,
                    },
                    orderBy: { sequenceOrder: 'asc' },
                  },
                },
              },
              decisions: {
                select: {
                  decisionType: true,
                  comment: true,
                  createdAt: true,
                  actorUserId: true,
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          })
        : await this.prismaService.approvalRequest.findUnique({
            where: { id: dto.approvalRequestId },
            select: {
              id: true,
              organizationId: true,
              workflowInstanceId: true,
              entityType: true,
              entityId: true,
              title: true,
              description: true,
              status: true,
              submittedAt: true,
              resolvedAt: true,
              steps: {
                select: {
                  id: true,
                  stepKey: true,
                  title: true,
                  sequenceOrder: true,
                  status: true,
                  approverUserId: true,
                  approverRoleCode: true,
                  dueAt: true,
                  decisions: {
                    select: {
                      decisionType: true,
                      comment: true,
                      createdAt: true,
                      actorUserId: true,
                    },
                    orderBy: { createdAt: 'desc' },
                  },
                },
                orderBy: { sequenceOrder: 'asc' },
              },
            },
          });

    if (!approval) {
      throw new NotFoundException('Approval context was not found.');
    }

    const organizationId =
      'approvalRequest' in approval
        ? approval.approvalRequest.organizationId
        : approval.organizationId;

    this.ensurePrincipalOrganization(principal, organizationId);

    const data = await this.structuredInferenceService.generate({
      actorUserId: principal.userId,
      context: approval,
      organizationId,
      schema: approvalExplanationSchema,
      templateKey: 'approval-explanation.v1',
    });

    return buildSuccessResponse('Approval explanation generated successfully.', data);
  }

  async generateOperationalAgentInsight(input: {
    actorUserId?: string | null;
    organizationId: string;
    context: Record<string, unknown>;
    templateKey:
      | 'agent-workforce-readiness.v1'
      | 'agent-operations-control.v1'
      | 'agent-revenue-operations.v1';
  }) {
    return this.structuredInferenceService.generate({
      actorUserId: input.actorUserId ?? null,
      context: input.context,
      organizationId: input.organizationId,
      schema: agentOperationalInsightSchema,
      templateKey: input.templateKey,
    });
  }

  async generateDispatchIncidentSummary(
    principal: CurrentPrincipal,
    dto: GenerateDispatchIncidentSummaryDto,
  ) {
    const incident = await this.prismaService.dispatchIncident.findUnique({
      where: { id: dto.incidentId },
      select: {
        id: true,
        organizationId: true,
        incidentCode: true,
        incidentType: true,
        severity: true,
        title: true,
        description: true,
        status: true,
        reportedAt: true,
        resolvedAt: true,
        assignment: {
          select: {
            id: true,
            assignmentStatus: true,
            driverId: true,
            vehicleId: true,
            zoneId: true,
            shiftId: true,
          },
        },
        run: {
          select: {
            id: true,
            runCode: true,
            dispatchStatus: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Dispatch incident was not found.');
    }

    this.ensurePrincipalOrganization(principal, incident.organizationId);

    const data = await this.structuredInferenceService.generate({
      actorUserId: principal.userId,
      context: incident,
      organizationId: incident.organizationId,
      schema: dispatchIncidentSummarySchema,
      templateKey: 'dispatch-incident-summary.v1',
    });

    return buildSuccessResponse('Dispatch incident summary generated successfully.', data);
  }

  async generateDriverComplianceExplanation(
    principal: CurrentPrincipal,
    dto: GenerateDriverComplianceExplanationDto,
  ) {
    const driver = await this.prismaService.driver.findFirst({
      where: {
        id: dto.driverId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        driverCode: true,
        firstName: true,
        lastName: true,
        licenseNumber: true,
        licenseIssuedAt: true,
        licenseExpiresAt: true,
        onboardingStatus: true,
        operationalStatus: true,
        complianceStatus: true,
        assignmentStatus: true,
        joinedAt: true,
        documents: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            issuedAt: true,
            expiresAt: true,
            verificationStatus: true,
            notes: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          select: {
            statusCategory: true,
            previousValue: true,
            newValue: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile was not found.');
    }

    this.ensurePrincipalOrganization(principal, driver.organizationId);

    const data = await this.structuredInferenceService.generate({
      actorUserId: principal.userId,
      context: driver,
      organizationId: driver.organizationId,
      schema: driverComplianceExplanationSchema,
      templateKey: 'driver-compliance-explanation.v1',
    });

    return buildSuccessResponse('Driver compliance explanation generated successfully.', data);
  }

  async generateFleetReadinessExplanation(
    principal: CurrentPrincipal,
    dto: GenerateFleetReadinessExplanationDto,
  ) {
    const vehicle = await this.prismaService.fleetVehicle.findFirst({
      where: {
        id: dto.vehicleId,
        deletedAt: null,
      },
      select: {
        id: true,
        organizationId: true,
        vehicleCode: true,
        plateNumber: true,
        vin: true,
        make: true,
        model: true,
        modelYear: true,
        vehicleClass: true,
        registrationNumber: true,
        registrationIssuedAt: true,
        registrationExpiresAt: true,
        insurancePolicyNumber: true,
        insuranceExpiresAt: true,
        onboardingStatus: true,
        operationalStatus: true,
        complianceStatus: true,
        assignmentStatus: true,
        joinedAt: true,
        maintenanceRecords: {
          select: {
            id: true,
            maintenanceType: true,
            title: true,
            scheduledAt: true,
            completedAt: true,
            status: true,
            vendorName: true,
            costAmount: true,
            notes: true,
          },
          orderBy: [{ createdAt: 'desc' }],
          take: 10,
        },
        statusHistory: {
          select: {
            statusCategory: true,
            previousValue: true,
            newValue: true,
            reason: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Fleet vehicle was not found.');
    }

    this.ensurePrincipalOrganization(principal, vehicle.organizationId);

    const data = await this.structuredInferenceService.generate({
      actorUserId: principal.userId,
      context: vehicle,
      organizationId: vehicle.organizationId,
      schema: fleetReadinessExplanationSchema,
      templateKey: 'fleet-readiness-explanation.v1',
    });

    return buildSuccessResponse('Fleet readiness explanation generated successfully.', data);
  }

  private async resolveOrganizationScope(principal: CurrentPrincipal, organizationId?: string) {
    const scopedOrganizationId = organizationId ?? principal.organizationId;

    this.ensurePrincipalOrganization(principal, scopedOrganizationId);

    const organization = await this.prismaService.organization.findFirst({
      where: {
        id: scopedOrganizationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization context could not be resolved.');
    }

    return organization.id;
  }

  private ensurePrincipalOrganization(principal: CurrentPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) {
      throw new BadRequestException(
        'Cross-organization intelligence access is not permitted.',
      );
    }
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
