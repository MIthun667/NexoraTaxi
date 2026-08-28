import { Injectable } from '@nestjs/common';

import { GraphQueryService } from '../../knowledge-graph/graph-query.service';
import { RetrievalContext, RetrievalProvider, RetrievalProviderResult } from '../retrieval.types';

@Injectable()
export class KnowledgeGraphRetrievalProvider implements RetrievalProvider {
  readonly name = 'knowledge-graph';

  constructor(private readonly graphQueryService: GraphQueryService) {}

  supports(request: RetrievalContext['request']): boolean {
    return Boolean(request.targetEntityId) && [
      'organization',
      'workforce-member',
      'asset',
      'work-order',
      'schedule-shift',
      'operational-zone',
      'operational-incident',
      'resource-assignment',
    ].includes(request.targetEntityType);
  }

  async retrieve(context: RetrievalContext): Promise<RetrievalProviderResult> {
    const { organizationId, targetEntityId, targetEntityType, maxRecords } = context.request;
    if (!targetEntityId) {
      return { contextNotes: ['Knowledge graph retrieval skipped because targetEntityId was not provided.'] };
    }

    const graph = await this.graphQueryService.query({
      organizationId,
      targetEntityType,
      targetEntityId,
      includeInsights: true,
      maxDepth: 2,
      maxNodes: Math.min((maxRecords ?? 25) * 4, 80),
    });

    return {
      relatedEntities: graph.nodes
        .filter((node) => node.id !== graph.rootNodeId)
        .slice(0, maxRecords ?? 25)
        .map((node) => ({
          entityType: node.type,
          nodeId: node.id,
          label: node.label,
          attributes: node.attributes,
        })),
      operationalMetrics: [
        { key: 'graph_node_count', label: 'Graph nodes', value: graph.nodes.length },
        { key: 'graph_edge_count', label: 'Graph edges', value: graph.edges.length },
        { key: 'graph_insight_count', label: 'Graph insights', value: graph.insights.length },
      ],
      riskSignals: graph.insights.map((insight) => ({
        code: insight.code,
        severity: insight.severity,
        message: insight.message,
      })),
      contextNotes: [
        `Knowledge graph projection generated ${graph.nodes.length} nodes and ${graph.edges.length} edges.`,
      ],
    };
  }
}
