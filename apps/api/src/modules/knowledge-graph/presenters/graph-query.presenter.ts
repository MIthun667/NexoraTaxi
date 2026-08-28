import { GraphEdge, GraphInsight, GraphNode } from '../knowledge-graph.types';

export interface GraphQueryPresenter {
  rootNodeId?: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  insights: GraphInsight[];
  metadata: {
    organizationId: string;
    targetEntityType: string;
    targetEntityId?: string | null;
    maxDepth: number;
    maxNodes: number;
    generatedAt: Date;
    source: 'relational-projection';
  };
}
