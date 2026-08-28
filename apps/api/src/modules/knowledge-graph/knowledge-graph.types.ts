export type GraphNodeType =
  | 'organization'
  | 'department'
  | 'workforce-member'
  | 'asset'
  | 'operational-zone'
  | 'work-order'
  | 'schedule-plan'
  | 'schedule-shift'
  | 'operational-incident'
  | 'resource-assignment'
  | 'agent-run'
  | 'agent-decision'
  | 'credential-document'
  | 'maintenance-record';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  attributes: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type: string;
  from: string;
  to: string;
  attributes?: Record<string, unknown>;
}

export interface GraphInsight {
  code: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  relatedNodeIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface GraphUpdateEvent {
  organizationId: string;
  aggregateType: string;
  aggregateId?: string | null;
  eventType: string;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface GraphQueryRequest {
  organizationId: string;
  targetEntityType: string;
  targetEntityId?: string | null;
  maxDepth?: number;
  maxNodes?: number;
  includeInsights?: boolean;
}

export interface GraphQueryResult {
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
