import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { GraphAnalyticsService } from './graph-analytics.service';
import { GraphBuilderService } from './graph-builder.service';
import { GraphRepository } from './graph.repository';
import { GraphQueryRequest, GraphQueryResult } from './knowledge-graph.types';

@Injectable()
export class GraphQueryService {
  constructor(
    private readonly graphRepository: GraphRepository,
    private readonly graphBuilderService: GraphBuilderService,
    private readonly graphAnalyticsService: GraphAnalyticsService,
    private readonly auditService: AuditService,
  ) {}

  async query(request: GraphQueryRequest): Promise<GraphQueryResult> {
    const normalized = this.normalizeRequest(request);
    if (normalized.targetEntityType !== 'organization' && !normalized.targetEntityId) {
      throw new BadRequestException(
        `targetEntityId is required for knowledge graph target ${normalized.targetEntityType}.`,
      );
    }
    const result = this.createEmptyResult(normalized);

    switch (normalized.targetEntityType) {
      case 'organization':
        await this.buildOrganizationGraph(result, normalized.organizationId);
        break;
      case 'workforce-member':
        await this.buildWorkforceGraph(result, normalized.organizationId, normalized.targetEntityId!);
        break;
      case 'asset':
        await this.buildAssetGraph(result, normalized.organizationId, normalized.targetEntityId!);
        break;
      case 'work-order':
        await this.buildWorkOrderGraph(result, normalized.organizationId, normalized.targetEntityId!);
        break;
      case 'schedule-shift':
        await this.buildShiftGraph(result, normalized.organizationId, normalized.targetEntityId!);
        break;
      case 'operational-incident':
        await this.buildIncidentGraph(result, normalized.organizationId, normalized.targetEntityId!);
        break;
      case 'resource-assignment':
        await this.buildAssignmentGraph(result, normalized.organizationId, normalized.targetEntityId!);
        break;
      case 'operational-zone':
        await this.buildZoneGraph(result, normalized.organizationId, normalized.targetEntityId!);
        break;
      default:
        throw new NotFoundException(`Knowledge graph target ${normalized.targetEntityType} is not supported.`);
    }

    if (normalized.includeInsights !== false) {
      result.insights = this.graphAnalyticsService.generateInsights(result, normalized);
    }

    const finalized = this.graphBuilderService.finalize(result);

    await this.auditService.record({
      action: 'knowledge_graph.query',
      entityType: normalized.targetEntityType,
      entityId: normalized.targetEntityId ?? null,
      organizationId: normalized.organizationId,
      summary: `Generated knowledge graph for ${normalized.targetEntityType}.`,
      metadata: {
        maxDepth: normalized.maxDepth,
        maxNodes: normalized.maxNodes,
        nodeCount: finalized.nodes.length,
        edgeCount: finalized.edges.length,
      },
    });

    return finalized;
  }

  private normalizeRequest(request: GraphQueryRequest): Required<GraphQueryRequest> {
    return {
      organizationId: request.organizationId,
      targetEntityType: request.targetEntityType,
      targetEntityId: request.targetEntityId ?? null,
      maxDepth: request.maxDepth ?? 2,
      maxNodes: request.maxNodes ?? 80,
      includeInsights: request.includeInsights ?? true,
    };
  }

  private createEmptyResult(request: Required<GraphQueryRequest>): GraphQueryResult {
    return {
      rootNodeId: null,
      nodes: [],
      edges: [],
      insights: [],
      metadata: {
        organizationId: request.organizationId,
        targetEntityType: request.targetEntityType,
        targetEntityId: request.targetEntityId ?? null,
        maxDepth: request.maxDepth,
        maxNodes: request.maxNodes,
        generatedAt: new Date(),
        source: 'relational-projection',
      },
    };
  }

  private async buildOrganizationGraph(result: GraphQueryResult, organizationId: string) {
    const organization = await this.graphRepository.findOrganization(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization was not found for graph query.');
    }

    const orgNode = this.graphBuilderService.createNode('organization', organization.id, organization.name, {
      slug: organization.slug,
      status: organization.status,
    });
    result.rootNodeId = orgNode?.id ?? null;
    this.graphBuilderService.merge(result, { nodes: [orgNode] });

    for (const department of organization.departments) {
      const departmentNode = this.graphBuilderService.createNode('department', department.id, department.name, {
        code: department.code,
        status: department.status,
      });
      this.graphBuilderService.merge(result, {
        nodes: [departmentNode],
        edges: [this.graphBuilderService.createEdge('has_department', orgNode, departmentNode)],
      });
    }
  }

  private async buildWorkforceGraph(result: GraphQueryResult, organizationId: string, entityId: string) {
    const member = await this.graphRepository.findWorkforceMember(organizationId, entityId, result.metadata.maxNodes);
    if (!member) {
      throw new NotFoundException('Workforce member was not found for graph query.');
    }

    const orgNode = this.graphBuilderService.createNode('organization', member.organization.id, member.organization.name);
    const memberNode = this.graphBuilderService.createNode('workforce-member', member.id, member.displayName ?? `${member.firstName} ${member.lastName}`, {
      workerCode: member.workerCode,
      operationalStatus: member.operationalStatus,
      availabilityStatus: member.availabilityStatus,
      complianceStatus: member.complianceStatus,
    });
    const departmentNode = this.graphBuilderService.createNode(
      'department',
      member.primaryDepartment?.id,
      member.primaryDepartment?.name ?? 'Department',
      { code: member.primaryDepartment?.code ?? null },
    );
    const zoneNode = this.graphBuilderService.createNode('operational-zone', member.homeZone?.id, member.homeZone?.name ?? 'Zone', {
      zoneCode: member.homeZone?.zoneCode ?? null,
    });

    result.rootNodeId = memberNode?.id ?? null;
    this.graphBuilderService.merge(result, {
      nodes: [orgNode, memberNode, departmentNode, zoneNode],
      edges: [
        this.graphBuilderService.createEdge('employs', orgNode, memberNode),
        this.graphBuilderService.createEdge('belongs_to_department', memberNode, departmentNode),
        this.graphBuilderService.createEdge('located_in', memberNode, zoneNode),
      ],
    });

    for (const credential of member.credentialDocuments) {
      const credentialNode = this.graphBuilderService.createNode('credential-document', credential.id, credential.title, {
        documentType: credential.documentType,
        verificationStatus: credential.verificationStatus,
        expiresAt: credential.expiresAt,
      });
      this.graphBuilderService.merge(result, {
        nodes: [credentialNode],
        edges: [this.graphBuilderService.createEdge('has_credential', memberNode, credentialNode)],
      });
    }

    for (const assignment of member.assignments) {
      const assignmentNode = this.graphBuilderService.createNode('resource-assignment', assignment.id, `Assignment ${assignment.id.slice(0, 8)}`, {
        assignmentType: assignment.assignmentType,
        status: assignment.status,
      });
      const workOrderNode = this.graphBuilderService.createNode('work-order', assignment.workOrder?.id, assignment.workOrder?.title ?? 'Work order', {
        status: assignment.workOrder?.status ?? null,
        priority: assignment.workOrder?.priority ?? null,
      });
      const shiftNode = this.graphBuilderService.createNode('schedule-shift', assignment.shift?.id, assignment.shift?.title ?? 'Shift', {
        status: assignment.shift?.status ?? null,
        capacityRequired: assignment.shift?.capacityRequired ?? null,
        capacityAllocated: assignment.shift?.capacityAllocated ?? null,
      });
      const assetNode = this.graphBuilderService.createNode('asset', assignment.asset?.id, assignment.asset?.name ?? 'Asset', {
        operationalStatus: assignment.asset?.operationalStatus ?? null,
      });
      this.graphBuilderService.merge(result, {
        nodes: [assignmentNode, workOrderNode, shiftNode, assetNode],
        edges: [
          this.graphBuilderService.createEdge('has_assignment', memberNode, assignmentNode),
          this.graphBuilderService.createEdge('assigned_to_work_order', assignmentNode, workOrderNode),
          this.graphBuilderService.createEdge('assigned_to_shift', assignmentNode, shiftNode),
          this.graphBuilderService.createEdge('paired_with_asset', assignmentNode, assetNode),
        ],
      });
    }

    for (const incident of member.incidents) {
      const incidentNode = this.graphBuilderService.createNode('operational-incident', incident.id, incident.title, {
        severity: incident.severity,
        status: incident.status,
      });
      this.graphBuilderService.merge(result, {
        nodes: [incidentNode],
        edges: [this.graphBuilderService.createEdge('involved_in', memberNode, incidentNode)],
      });
    }

    await this.attachAgentRuns(result, organizationId, 'workforce-member', member.id, memberNode);
  }

  private async buildAssetGraph(result: GraphQueryResult, organizationId: string, entityId: string) {
    const asset = await this.graphRepository.findAsset(organizationId, entityId, result.metadata.maxNodes);
    if (!asset) {
      throw new NotFoundException('Asset was not found for graph query.');
    }

    const orgNode = this.graphBuilderService.createNode('organization', asset.organization.id, asset.organization.name);
    const assetNode = this.graphBuilderService.createNode('asset', asset.id, asset.name, {
      assetCode: asset.assetCode,
      assetType: asset.assetType,
      operationalStatus: asset.operationalStatus,
      complianceStatus: asset.complianceStatus,
      availabilityStatus: asset.availabilityStatus,
    });
    const zoneNode = this.graphBuilderService.createNode('operational-zone', asset.zone?.id, asset.zone?.name ?? 'Zone', {
      zoneCode: asset.zone?.zoneCode ?? null,
    });

    result.rootNodeId = assetNode?.id ?? null;
    this.graphBuilderService.merge(result, {
      nodes: [orgNode, assetNode, zoneNode],
      edges: [
        this.graphBuilderService.createEdge('owns', orgNode, assetNode),
        this.graphBuilderService.createEdge('located_in', assetNode, zoneNode),
      ],
    });

    for (const maintenance of asset.maintenanceRecords) {
      const maintenanceNode = this.graphBuilderService.createNode('maintenance-record', maintenance.id, maintenance.title, {
        status: maintenance.status,
        maintenanceType: maintenance.maintenanceType,
        priority: maintenance.priority,
        scheduledAt: maintenance.scheduledAt,
      });
      const performerNode = this.graphBuilderService.createNode(
        'workforce-member',
        maintenance.performedByWorkforceMember?.id,
        maintenance.performedByWorkforceMember?.displayName ?? 'Technician',
      );
      this.graphBuilderService.merge(result, {
        nodes: [maintenanceNode, performerNode],
        edges: [
          this.graphBuilderService.createEdge('has_maintenance', assetNode, maintenanceNode),
          this.graphBuilderService.createEdge('performed_by', maintenanceNode, performerNode),
        ],
      });
    }

    for (const assignment of asset.assignments) {
      const assignmentNode = this.graphBuilderService.createNode('resource-assignment', assignment.id, `Assignment ${assignment.id.slice(0, 8)}`, {
        assignmentType: assignment.assignmentType,
        status: assignment.status,
      });
      const workOrderNode = this.graphBuilderService.createNode('work-order', assignment.workOrder?.id, assignment.workOrder?.title ?? 'Work order', {
        status: assignment.workOrder?.status ?? null,
      });
      const shiftNode = this.graphBuilderService.createNode('schedule-shift', assignment.shift?.id, assignment.shift?.title ?? 'Shift', {
        status: assignment.shift?.status ?? null,
      });
      const workforceNode = this.graphBuilderService.createNode('workforce-member', assignment.workforceMember?.id, assignment.workforceMember?.displayName ?? 'Worker');
      this.graphBuilderService.merge(result, {
        nodes: [assignmentNode, workOrderNode, shiftNode, workforceNode],
        edges: [
          this.graphBuilderService.createEdge('has_assignment', assetNode, assignmentNode),
          this.graphBuilderService.createEdge('used_in', assetNode, workOrderNode),
          this.graphBuilderService.createEdge('assigned_to_shift', assignmentNode, shiftNode),
          this.graphBuilderService.createEdge('paired_with_workforce', assignmentNode, workforceNode),
        ],
      });
    }

    for (const incident of asset.incidents) {
      const incidentNode = this.graphBuilderService.createNode('operational-incident', incident.id, incident.title, {
        severity: incident.severity,
        status: incident.status,
      });
      this.graphBuilderService.merge(result, {
        nodes: [incidentNode],
        edges: [this.graphBuilderService.createEdge('linked_to_incident', assetNode, incidentNode)],
      });
    }

    await this.attachAgentRuns(result, organizationId, 'asset', asset.id, assetNode);
  }

  private async buildWorkOrderGraph(result: GraphQueryResult, organizationId: string, entityId: string) {
    const workOrder = await this.graphRepository.findWorkOrder(organizationId, entityId, result.metadata.maxNodes);
    if (!workOrder) {
      throw new NotFoundException('Work order was not found for graph query.');
    }

    const orgNode = this.graphBuilderService.createNode('organization', workOrder.organization.id, workOrder.organization.name);
    const workOrderNode = this.graphBuilderService.createNode('work-order', workOrder.id, workOrder.title, {
      workOrderCode: workOrder.workOrderCode,
      workType: workOrder.workType,
      status: workOrder.status,
      priority: workOrder.priority,
    });
    const zoneNode = this.graphBuilderService.createNode('operational-zone', workOrder.zone?.id, workOrder.zone?.name ?? 'Zone', {
      zoneCode: workOrder.zone?.zoneCode ?? null,
    });

    result.rootNodeId = workOrderNode?.id ?? null;
    this.graphBuilderService.merge(result, {
      nodes: [orgNode, workOrderNode, zoneNode],
      edges: [
        this.graphBuilderService.createEdge('owns_work_order', orgNode, workOrderNode),
        this.graphBuilderService.createEdge('occurs_in', workOrderNode, zoneNode),
      ],
    });

    for (const assignment of workOrder.assignments) {
      const assignmentNode = this.graphBuilderService.createNode('resource-assignment', assignment.id, `Assignment ${assignment.id.slice(0, 8)}`, {
        assignmentType: assignment.assignmentType,
        status: assignment.status,
      });
      const workforceNode = this.graphBuilderService.createNode('workforce-member', assignment.workforceMember?.id, assignment.workforceMember?.displayName ?? 'Worker');
      const assetNode = this.graphBuilderService.createNode('asset', assignment.asset?.id, assignment.asset?.name ?? 'Asset');
      const shiftNode = this.graphBuilderService.createNode('schedule-shift', assignment.shift?.id, assignment.shift?.title ?? 'Shift', {
        status: assignment.shift?.status ?? null,
      });
      this.graphBuilderService.merge(result, {
        nodes: [assignmentNode, workforceNode, assetNode, shiftNode],
        edges: [
          this.graphBuilderService.createEdge('has_assignment', workOrderNode, assignmentNode),
          this.graphBuilderService.createEdge('staffed_by', workOrderNode, workforceNode),
          this.graphBuilderService.createEdge('uses_asset', workOrderNode, assetNode),
          this.graphBuilderService.createEdge('covered_by_shift', assignmentNode, shiftNode),
        ],
      });
    }

    for (const incident of workOrder.incidents) {
      const incidentNode = this.graphBuilderService.createNode('operational-incident', incident.id, incident.title, {
        severity: incident.severity,
        status: incident.status,
      });
      const assetNode = this.graphBuilderService.createNode('asset', incident.asset?.id, incident.asset?.name ?? 'Asset');
      const workforceNode = this.graphBuilderService.createNode('workforce-member', incident.workforceMember?.id, incident.workforceMember?.displayName ?? 'Worker');
      this.graphBuilderService.merge(result, {
        nodes: [incidentNode, assetNode, workforceNode],
        edges: [
          this.graphBuilderService.createEdge('triggers_incident', workOrderNode, incidentNode),
          this.graphBuilderService.createEdge('incident_impacts_asset', incidentNode, assetNode),
          this.graphBuilderService.createEdge('incident_impacts_workforce', incidentNode, workforceNode),
        ],
      });
    }

    await this.attachAgentRuns(result, organizationId, 'work-order', workOrder.id, workOrderNode);
  }

  private async buildShiftGraph(result: GraphQueryResult, organizationId: string, entityId: string) {
    const shift = await this.graphRepository.findScheduleShift(organizationId, entityId, result.metadata.maxNodes);
    if (!shift) {
      throw new NotFoundException('Schedule shift was not found for graph query.');
    }

    const shiftNode = this.graphBuilderService.createNode('schedule-shift', shift.id, shift.title, {
      shiftCode: shift.shiftCode,
      status: shift.status,
      shiftType: shift.shiftType,
      capacityRequired: shift.capacityRequired,
      capacityAllocated: shift.capacityAllocated,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
    });
    const planNode = this.graphBuilderService.createNode('schedule-plan', shift.schedulePlan?.id, shift.schedulePlan?.name ?? 'Plan', {
      status: shift.schedulePlan?.status ?? null,
    });
    const zoneNode = this.graphBuilderService.createNode('operational-zone', shift.zone?.id, shift.zone?.name ?? 'Zone');

    result.rootNodeId = shiftNode?.id ?? null;
    this.graphBuilderService.merge(result, {
      nodes: [shiftNode, planNode, zoneNode],
      edges: [
        this.graphBuilderService.createEdge('part_of_plan', shiftNode, planNode),
        this.graphBuilderService.createEdge('occurs_in', shiftNode, zoneNode),
      ],
    });

    for (const assignment of shift.assignments) {
      const assignmentNode = this.graphBuilderService.createNode('resource-assignment', assignment.id, `Assignment ${assignment.id.slice(0, 8)}`, {
        assignmentType: assignment.assignmentType,
        status: assignment.status,
      });
      const workforceNode = this.graphBuilderService.createNode('workforce-member', assignment.workforceMember?.id, assignment.workforceMember?.displayName ?? 'Worker');
      const assetNode = this.graphBuilderService.createNode('asset', assignment.asset?.id, assignment.asset?.name ?? 'Asset');
      const workOrderNode = this.graphBuilderService.createNode('work-order', assignment.workOrder?.id, assignment.workOrder?.title ?? 'Work order', {
        status: assignment.workOrder?.status ?? null,
      });
      this.graphBuilderService.merge(result, {
        nodes: [assignmentNode, workforceNode, assetNode, workOrderNode],
        edges: [
          this.graphBuilderService.createEdge('has_assignment', shiftNode, assignmentNode),
          this.graphBuilderService.createEdge('assigned_workforce', shiftNode, workforceNode),
          this.graphBuilderService.createEdge('assigned_asset', shiftNode, assetNode),
          this.graphBuilderService.createEdge('supports_work_order', shiftNode, workOrderNode),
        ],
      });
    }

    await this.attachAgentRuns(result, organizationId, 'schedule-shift', shift.id, shiftNode);
  }

  private async buildIncidentGraph(result: GraphQueryResult, organizationId: string, entityId: string) {
    const incident = await this.graphRepository.findOperationalIncident(organizationId, entityId, result.metadata.maxNodes);
    if (!incident) {
      throw new NotFoundException('Operational incident was not found for graph query.');
    }

    const incidentNode = this.graphBuilderService.createNode('operational-incident', incident.id, incident.title, {
      incidentCode: incident.incidentCode,
      incidentType: incident.incidentType,
      severity: incident.severity,
      status: incident.status,
    });
    const workOrderNode = this.graphBuilderService.createNode('work-order', incident.workOrder?.id, incident.workOrder?.title ?? 'Work order', {
      status: incident.workOrder?.status ?? null,
    });
    const assetNode = this.graphBuilderService.createNode('asset', incident.asset?.id, incident.asset?.name ?? 'Asset');
    const workforceNode = this.graphBuilderService.createNode('workforce-member', incident.workforceMember?.id, incident.workforceMember?.displayName ?? 'Worker');
    const zoneNode = this.graphBuilderService.createNode('operational-zone', incident.zone?.id, incident.zone?.name ?? 'Zone');

    result.rootNodeId = incidentNode?.id ?? null;
    this.graphBuilderService.merge(result, {
      nodes: [incidentNode, workOrderNode, assetNode, workforceNode, zoneNode],
      edges: [
        this.graphBuilderService.createEdge('affects_work_order', incidentNode, workOrderNode),
        this.graphBuilderService.createEdge('affects_asset', incidentNode, assetNode),
        this.graphBuilderService.createEdge('affects_workforce', incidentNode, workforceNode),
        this.graphBuilderService.createEdge('occurs_in', incidentNode, zoneNode),
      ],
    });

    await this.attachAgentRuns(result, organizationId, 'operational-incident', incident.id, incidentNode);
  }

  private async buildAssignmentGraph(result: GraphQueryResult, organizationId: string, entityId: string) {
    const assignment = await this.graphRepository.findAssignment(organizationId, entityId);
    if (!assignment) {
      throw new NotFoundException('Resource assignment was not found for graph query.');
    }

    const assignmentNode = this.graphBuilderService.createNode('resource-assignment', assignment.id, `Assignment ${assignment.id.slice(0, 8)}`, {
      assignmentType: assignment.assignmentType,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      releasedAt: assignment.releasedAt,
    });
    const workforceNode = this.graphBuilderService.createNode('workforce-member', assignment.workforceMember?.id, assignment.workforceMember?.displayName ?? 'Worker');
    const assetNode = this.graphBuilderService.createNode('asset', assignment.asset?.id, assignment.asset?.name ?? 'Asset');
    const shiftNode = this.graphBuilderService.createNode('schedule-shift', assignment.shift?.id, assignment.shift?.title ?? 'Shift', {
      status: assignment.shift?.status ?? null,
    });
    const workOrderNode = this.graphBuilderService.createNode('work-order', assignment.workOrder?.id, assignment.workOrder?.title ?? 'Work order', {
      status: assignment.workOrder?.status ?? null,
    });
    const zoneNode = this.graphBuilderService.createNode('operational-zone', assignment.zone?.id, assignment.zone?.name ?? 'Zone');

    result.rootNodeId = assignmentNode?.id ?? null;
    this.graphBuilderService.merge(result, {
      nodes: [assignmentNode, workforceNode, assetNode, shiftNode, workOrderNode, zoneNode],
      edges: [
        this.graphBuilderService.createEdge('links_workforce', assignmentNode, workforceNode),
        this.graphBuilderService.createEdge('links_asset', assignmentNode, assetNode),
        this.graphBuilderService.createEdge('links_shift', assignmentNode, shiftNode),
        this.graphBuilderService.createEdge('links_work_order', assignmentNode, workOrderNode),
        this.graphBuilderService.createEdge('occurs_in', assignmentNode, zoneNode),
      ],
    });

    await this.attachAgentRuns(result, organizationId, 'resource-assignment', assignment.id, assignmentNode);
  }

  private async buildZoneGraph(result: GraphQueryResult, organizationId: string, entityId: string) {
    const zone = await this.graphRepository.findOperationalZone(organizationId, entityId, result.metadata.maxNodes);
    if (!zone) {
      throw new NotFoundException('Operational zone was not found for graph query.');
    }

    const zoneNode = this.graphBuilderService.createNode('operational-zone', zone.id, zone.name, {
      zoneCode: zone.zoneCode,
      zoneType: zone.zoneType,
      isActive: zone.isActive,
    });
    const parentNode = this.graphBuilderService.createNode('operational-zone', zone.parentZone?.id, zone.parentZone?.name ?? 'Parent zone');

    result.rootNodeId = zoneNode?.id ?? null;
    this.graphBuilderService.merge(result, {
      nodes: [zoneNode, parentNode],
      edges: [this.graphBuilderService.createEdge('child_of', zoneNode, parentNode)],
    });

    for (const child of zone.childZones) {
      const childNode = this.graphBuilderService.createNode('operational-zone', child.id, child.name, {
        zoneCode: child.zoneCode,
        zoneType: child.zoneType,
      });
      this.graphBuilderService.merge(result, {
        nodes: [childNode],
        edges: [this.graphBuilderService.createEdge('has_child_zone', zoneNode, childNode)],
      });
    }

    for (const member of zone.workforceMembers) {
      const workforceNode = this.graphBuilderService.createNode('workforce-member', member.id, member.displayName ?? `${member.firstName} ${member.lastName}`, {
        availabilityStatus: member.availabilityStatus,
      });
      this.graphBuilderService.merge(result, {
        nodes: [workforceNode],
        edges: [this.graphBuilderService.createEdge('covers_zone', workforceNode, zoneNode)],
      });
    }

    for (const asset of zone.assets) {
      const assetNode = this.graphBuilderService.createNode('asset', asset.id, asset.name, {
        operationalStatus: asset.operationalStatus,
      });
      this.graphBuilderService.merge(result, {
        nodes: [assetNode],
        edges: [this.graphBuilderService.createEdge('located_in', assetNode, zoneNode)],
      });
    }

    for (const workOrder of zone.workOrders) {
      const workOrderNode = this.graphBuilderService.createNode('work-order', workOrder.id, workOrder.title, {
        status: workOrder.status,
        priority: workOrder.priority,
      });
      this.graphBuilderService.merge(result, {
        nodes: [workOrderNode],
        edges: [this.graphBuilderService.createEdge('occurs_in', workOrderNode, zoneNode)],
      });
    }

    for (const shift of zone.scheduleShifts) {
      const shiftNode = this.graphBuilderService.createNode('schedule-shift', shift.id, shift.title, {
        status: shift.status,
        capacityRequired: shift.capacityRequired,
        capacityAllocated: shift.capacityAllocated,
      });
      this.graphBuilderService.merge(result, {
        nodes: [shiftNode],
        edges: [this.graphBuilderService.createEdge('scheduled_in', shiftNode, zoneNode)],
      });
    }

    for (const incident of zone.incidents) {
      const incidentNode = this.graphBuilderService.createNode('operational-incident', incident.id, incident.title, {
        severity: incident.severity,
        status: incident.status,
      });
      this.graphBuilderService.merge(result, {
        nodes: [incidentNode],
        edges: [this.graphBuilderService.createEdge('incident_in_zone', incidentNode, zoneNode)],
      });
    }

    await this.attachAgentRuns(result, organizationId, 'operational-zone', zone.id, zoneNode);
  }

  private async attachAgentRuns(
    result: GraphQueryResult,
    organizationId: string,
    entityType: string,
    entityId: string,
    targetNode: ReturnType<GraphBuilderService['createNode']>,
  ) {
    const agentRuns = await this.graphRepository.findAgentRunsForEntity(
      organizationId,
      entityType,
      entityId,
      result.metadata.maxNodes,
    );

    for (const run of agentRuns) {
      const runNode = this.graphBuilderService.createNode('agent-run', run.id, run.agentDefinition.name, {
        status: run.status,
        triggerType: run.triggerType,
        createdAt: run.createdAt,
      });
      this.graphBuilderService.merge(result, {
        nodes: [runNode],
        edges: [this.graphBuilderService.createEdge('analyzed_by', targetNode, runNode)],
      });

      for (const decision of run.decisions) {
        const decisionNode = this.graphBuilderService.createNode('agent-decision', decision.id, decision.summary, {
          decisionType: decision.decisionType,
          confidence: decision.confidence,
          createdAt: decision.createdAt,
        });
        this.graphBuilderService.merge(result, {
          nodes: [decisionNode],
          edges: [this.graphBuilderService.createEdge('produced_decision', runNode, decisionNode)],
        });
      }
    }
  }
}
