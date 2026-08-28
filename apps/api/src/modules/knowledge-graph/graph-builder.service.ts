import { Injectable } from '@nestjs/common';

import { GraphEdge, GraphNode, GraphNodeType, GraphQueryResult } from './knowledge-graph.types';

@Injectable()
export class GraphBuilderService {
  private addNode(nodes: Map<string, GraphNode>, node: GraphNode | null | undefined) {
    if (!node) {
      return;
    }
    nodes.set(node.id, node);
  }

  private addEdge(edges: Map<string, GraphEdge>, edge: GraphEdge | null | undefined) {
    if (!edge) {
      return;
    }
    edges.set(edge.id, edge);
  }

  createNode(
    type: GraphNodeType,
    id: string | null | undefined,
    label: string,
    attributes: Record<string, unknown> = {},
  ): GraphNode | null {
    if (!id) {
      return null;
    }

    return {
      id: `${type}:${id}`,
      type,
      label,
      attributes,
    };
  }

  createEdge(
    type: string,
    from: GraphNode | null,
    to: GraphNode | null,
    attributes?: Record<string, unknown>,
  ): GraphEdge | null {
    if (!from || !to) {
      return null;
    }

    return {
      id: `${from.id}:${type}:${to.id}`,
      type,
      from: from.id,
      to: to.id,
      attributes,
    };
  }

  merge(result: GraphQueryResult, payload: { nodes?: Array<GraphNode | null>; edges?: Array<GraphEdge | null> }) {
    const nodeMap = new Map(result.nodes.map((node) => [node.id, node]));
    const edgeMap = new Map(result.edges.map((edge) => [edge.id, edge]));

    for (const node of payload.nodes ?? []) {
      this.addNode(nodeMap, node);
    }

    for (const edge of payload.edges ?? []) {
      this.addEdge(edgeMap, edge);
    }

    result.nodes = Array.from(nodeMap.values());
    result.edges = Array.from(edgeMap.values());
  }

  finalize(result: GraphQueryResult): GraphQueryResult {
    const cappedNodes = result.nodes.slice(0, result.metadata.maxNodes);
    const allowedNodeIds = new Set(cappedNodes.map((node) => node.id));

    return {
      ...result,
      nodes: cappedNodes,
      edges: result.edges.filter(
        (edge) => allowedNodeIds.has(edge.from) && allowedNodeIds.has(edge.to),
      ),
    };
  }
}
