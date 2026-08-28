import { Injectable } from '@nestjs/common';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { AuditService } from '../audit/audit.service';
import { GraphQueryService } from './graph-query.service';
import { GraphUpdateEvent } from './knowledge-graph.types';

@Injectable()
export class GraphUpdaterService {
  constructor(
    private readonly graphQueryService: GraphQueryService,
    private readonly auditService: AuditService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async handleDomainEvent(event: GraphUpdateEvent) {
    this.logger.debug({
      event: 'knowledge_graph.update.requested',
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId ?? null,
      eventType: event.eventType,
      organizationId: event.organizationId,
    });

    if (!event.aggregateId) {
      return {
        refreshed: false,
        reason: 'aggregate_id_missing',
      };
    }

    const mappedEntityType = this.toEntityType(event.aggregateType);
    if (!mappedEntityType) {
      return {
        refreshed: false,
        reason: 'unsupported_aggregate_type',
      };
    }

    const graph = await this.graphQueryService.query({
      organizationId: event.organizationId,
      targetEntityType: mappedEntityType,
      targetEntityId: event.aggregateId,
      includeInsights: true,
      maxDepth: 2,
      maxNodes: 80,
    });

    await this.auditService.record({
      action: 'knowledge_graph.update',
      entityType: mappedEntityType,
      entityId: event.aggregateId,
      organizationId: event.organizationId,
      summary: `Refreshed knowledge graph projection for ${mappedEntityType}.`,
      metadata: {
        eventType: event.eventType,
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
      },
    });

    return {
      refreshed: true,
      entityType: mappedEntityType,
      entityId: event.aggregateId,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      insightCount: graph.insights.length,
    };
  }

  async rebuildEntityGraph(params: {
    organizationId: string;
    targetEntityType: string;
    targetEntityId: string;
  }) {
    return this.graphQueryService.query({
      organizationId: params.organizationId,
      targetEntityType: params.targetEntityType,
      targetEntityId: params.targetEntityId,
      includeInsights: true,
      maxDepth: 2,
      maxNodes: 120,
    });
  }

  private toEntityType(aggregateType: string) {
    const map: Record<string, string> = {
      organization: 'organization',
      'workforce-member': 'workforce-member',
      asset: 'asset',
      'work-order': 'work-order',
      'schedule-shift': 'schedule-shift',
      'operational-zone': 'operational-zone',
      'operational-incident': 'operational-incident',
      'resource-assignment': 'resource-assignment',
    };

    return map[aggregateType] ?? null;
  }
}
