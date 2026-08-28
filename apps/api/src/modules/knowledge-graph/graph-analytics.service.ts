import { Injectable } from '@nestjs/common';

import { GraphInsight, GraphNode, GraphQueryRequest, GraphQueryResult } from './knowledge-graph.types';

@Injectable()
export class GraphAnalyticsService {
  generateInsights(result: GraphQueryResult, request: GraphQueryRequest): GraphInsight[] {
    const insights: GraphInsight[] = [];
    const nodesByType = this.groupByType(result.nodes);

    const incidentNodes = nodesByType.get('operational-incident') ?? [];
    const openCriticalIncidents = incidentNodes.filter(
      (node) =>
        node.attributes.status !== 'RESOLVED' &&
        node.attributes.status !== 'CANCELLED' &&
        node.attributes.severity === 'CRITICAL',
    );
    if (openCriticalIncidents.length > 0) {
      insights.push({
        code: 'CRITICAL_INCIDENT_LINKED',
        severity: 'CRITICAL',
        message: `${openCriticalIncidents.length} critical incident link${openCriticalIncidents.length > 1 ? 's are' : ' is'} attached to this context.`,
        relatedNodeIds: openCriticalIncidents.map((node) => node.id),
      });
    }

    const shiftNodes = nodesByType.get('schedule-shift') ?? [];
    for (const shiftNode of shiftNodes) {
      const required = Number(shiftNode.attributes.capacityRequired ?? 0);
      const allocated = Number(shiftNode.attributes.capacityAllocated ?? 0);
      if (required > allocated) {
        insights.push({
          code: 'SHIFT_UNDERSTAFFED',
          severity: required - allocated > 1 ? 'HIGH' : 'MEDIUM',
          message: `${shiftNode.label} is understaffed by ${required - allocated}.`,
          relatedNodeIds: [shiftNode.id],
          metadata: { required, allocated },
        });
      }
    }

    const workOrderNodes = nodesByType.get('work-order') ?? [];
    const blockedWorkOrders = workOrderNodes.filter((node) => node.attributes.status === 'BLOCKED');
    if (blockedWorkOrders.length > 0) {
      insights.push({
        code: 'BLOCKED_WORK_ORDER',
        severity: 'HIGH',
        message: `${blockedWorkOrders.length} blocked work order link${blockedWorkOrders.length > 1 ? 's are' : ' is'} affecting execution.`,
        relatedNodeIds: blockedWorkOrders.map((node) => node.id),
      });
    }

    const maintenanceNodes = nodesByType.get('maintenance-record') ?? [];
    const overdueMaintenance = maintenanceNodes.filter((node) => node.attributes.status === 'OVERDUE');
    if (overdueMaintenance.length > 0) {
      insights.push({
        code: 'OVERDUE_MAINTENANCE',
        severity: 'HIGH',
        message: `${overdueMaintenance.length} overdue maintenance record link${overdueMaintenance.length > 1 ? 's are' : ' is'} present in the graph context.`,
        relatedNodeIds: overdueMaintenance.map((node) => node.id),
      });
    }

    const assignmentNodes = nodesByType.get('resource-assignment') ?? [];
    const activeAssignments = assignmentNodes.filter((node) => node.attributes.status === 'ACTIVE');
    const workforceNodes = nodesByType.get('workforce-member') ?? [];
    if (request.targetEntityType === 'workforce-member' && activeAssignments.length > 2) {
      insights.push({
        code: 'WORKFORCE_OVERLOAD_RISK',
        severity: 'MEDIUM',
        message: `This workforce member is linked to ${activeAssignments.length} active assignments.`,
        relatedNodeIds: [result.rootNodeId ?? workforceNodes[0]?.id].filter(Boolean) as string[],
      });
    }

    const assetNodes = nodesByType.get('asset') ?? [];
    if (request.targetEntityType === 'asset' && incidentNodes.length >= 2) {
      insights.push({
        code: 'ASSET_REPEAT_INCIDENT_PATTERN',
        severity: 'MEDIUM',
        message: `This asset is connected to ${incidentNodes.length} incidents in the retrieved graph neighborhood.`,
        relatedNodeIds: assetNodes.slice(0, 1).map((node) => node.id),
      });
    }

    const zoneNodes = nodesByType.get('operational-zone') ?? [];
    if (request.targetEntityType === 'operational-zone' && shiftNodes.length > 0 && workforceNodes.length === 0) {
      insights.push({
        code: 'ZONE_COVERAGE_GAP',
        severity: 'HIGH',
        message: 'This zone has active scheduling context without linked workforce coverage in the retrieved graph.',
        relatedNodeIds: zoneNodes.slice(0, 1).map((node) => node.id),
      });
    }

    return insights;
  }

  private groupByType(nodes: GraphNode[]) {
    return nodes.reduce<Map<GraphNode['type'], GraphNode[]>>((map, node) => {
      const current = map.get(node.type) ?? [];
      current.push(node);
      map.set(node.type, current);
      return map;
    }, new Map());
  }
}
