import { type GraphQueryResponse, parseTypeId } from "../api";
import type { SeedEntity } from "../config/explorer-config";
import type { EdgeType } from "../types/edge";
import type { EntityType } from "../types/entity";
import { makeEdgeKey, makeNodeKey } from "../types/keys";
import type { ExplorerEdge, ExplorerNode } from "../types/node";
import type { InitialSubgraphData } from "../types/props";
import { createEdgeId } from "./keys";

/**
 * Hydrate from InitialSubgraphData (server-side serialized format)
 */
export function hydrateSubgraphData(
  data: InitialSubgraphData,
  seed: SeedEntity,
  seeds: Set<string>,
): { nodes: Map<string, ExplorerNode>; edges: Map<string, ExplorerEdge> } {
  const nodes = new Map<string, ExplorerNode>();
  const edges = new Map<string, ExplorerEdge>();

  // Build BFS depth map from edges
  const depths = new Map<string, number>();
  seeds.forEach((id) => depths.set(id, 0));

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of data.edges) {
      const fromDepth = depths.get(edge.fromId);
      const toDepth = depths.get(edge.toId);
      if (fromDepth !== undefined && toDepth === undefined) {
        depths.set(edge.toId, fromDepth + 1);
        changed = true;
      } else if (toDepth !== undefined && fromDepth === undefined) {
        depths.set(edge.fromId, toDepth + 1);
        changed = true;
      }
    }
  }

  // Add nodes
  for (const apiNode of data.nodes) {
    const isSeed = seeds.has(apiNode.id);
    const depth = depths.get(apiNode.id) ?? 1;
    const nodeType = apiNode.type as EntityType;
    const nodeKey = makeNodeKey(nodeType, apiNode.id);

    nodes.set(apiNode.id, {
      id: apiNode.id,
      key: nodeKey,
      type: nodeType,
      label: apiNode.id === seed.id ? seed.label : apiNode.label,
      subtitle: apiNode.subtitle,
      entity: {
        type: apiNode.type,
        id: apiNode.id,
        label: apiNode.label,
      } as ExplorerNode["entity"],
      isSeed,
      depth: isSeed ? 0 : depth,
    });
  }

  // Ensure seed node exists
  if (!nodes.has(seed.id)) {
    const seedKey = makeNodeKey(seed.type, seed.id);
    nodes.set(seed.id, {
      id: seed.id,
      key: seedKey,
      type: seed.type,
      label: seed.label,
      entity: {
        type: seed.type,
        id: seed.id,
        label: seed.label,
      } as ExplorerNode["entity"],
      isSeed: true,
      depth: 0,
    });
  }

  // Add edges
  for (const apiEdge of data.edges) {
    const edgeType = apiEdge.type as EdgeType;
    const edgeId = createEdgeId(edgeType, apiEdge.fromId, apiEdge.toId);
    const fromNode = nodes.get(apiEdge.fromId);
    const toNode = nodes.get(apiEdge.toId);
    const sourceKey =
      fromNode?.key ??
      makeNodeKey((fromNode?.type ?? seed.type) as EntityType, apiEdge.fromId);
    const targetKey =
      toNode?.key ??
      makeNodeKey((toNode?.type ?? seed.type) as EntityType, apiEdge.toId);
    const edgeKey = makeEdgeKey(edgeType, sourceKey, targetKey);

    edges.set(edgeId, {
      id: edgeId,
      key: edgeKey,
      type: edgeType,
      sourceId: apiEdge.fromId,
      targetId: apiEdge.toId,
      sourceKey,
      targetKey,
      numSources: apiEdge.numSources,
      numExperiments: apiEdge.numExperiments,
      fields: apiEdge.fields,
    });
  }

  return { nodes, edges };
}

/**
 * Hydrate from GraphQueryResponse (client-side /graph/query response)
 */
export function hydrateQueryResponse(
  response: GraphQueryResponse,
  seed: SeedEntity,
  seeds: Set<string>,
): { nodes: Map<string, ExplorerNode>; edges: Map<string, ExplorerEdge> } {
  const nodes = new Map<string, ExplorerNode>();
  const edges = new Map<string, ExplorerEdge>();

  // Build depth map from step info and edges
  const depths = new Map<string, number>();
  seeds.forEach((id) => depths.set(id, 0));

  const edgeStepMap = new Map<string, number>();
  for (const step of response.data.steps) {
    for (const et of step.edgeTypes) {
      edgeStepMap.set(et, step.stepIndex);
    }
  }

  const parsedEdges = response.data.edges.map((e) => ({
    ...e,
    fromParsed: parseTypeId(e.from),
    toParsed: parseTypeId(e.to),
  }));

  // First pass: assign depths from edges
  for (const edge of parsedEdges) {
    const stepIdx = edgeStepMap.get(edge.type) ?? 0;
    const fromId = edge.fromParsed.id;
    const toId = edge.toParsed.id;

    if (seeds.has(fromId)) {
      depths.set(fromId, 0);
      if (!depths.has(toId)) depths.set(toId, stepIdx + 1);
    } else if (seeds.has(toId)) {
      depths.set(toId, 0);
      if (!depths.has(fromId)) depths.set(fromId, stepIdx + 1);
    } else {
      const fromD = depths.get(fromId);
      const toD = depths.get(toId);
      if (fromD !== undefined && toD === undefined) depths.set(toId, fromD + 1);
      else if (toD !== undefined && fromD === undefined)
        depths.set(fromId, toD + 1);
    }
  }

  // Second pass to propagate remaining
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of parsedEdges) {
      const fromId = edge.fromParsed.id;
      const toId = edge.toParsed.id;
      const fromD = depths.get(fromId);
      const toD = depths.get(toId);
      if (fromD !== undefined && toD === undefined) {
        depths.set(toId, fromD + 1);
        changed = true;
      } else if (toD !== undefined && fromD === undefined) {
        depths.set(fromId, toD + 1);
        changed = true;
      }
    }
  }

  // Add nodes
  for (const [, nodeData] of Object.entries(response.data.nodes)) {
    const entity = nodeData.entity;
    const isSeed = seeds.has(entity.id);
    const depth = depths.get(entity.id) ?? 1;
    const nodeType = entity.type as EntityType;
    const nodeKey = makeNodeKey(nodeType, entity.id);

    nodes.set(entity.id, {
      id: entity.id,
      key: nodeKey,
      type: nodeType,
      label: entity.id === seed.id ? seed.label : entity.label,
      subtitle: entity.subtitle,
      entity: {
        type: entity.type,
        id: entity.id,
        label: entity.label,
      } as ExplorerNode["entity"],
      isSeed,
      depth: isSeed ? 0 : depth,
    });
  }

  // Ensure seed node exists
  if (!nodes.has(seed.id)) {
    const seedKey = makeNodeKey(seed.type, seed.id);
    nodes.set(seed.id, {
      id: seed.id,
      key: seedKey,
      type: seed.type,
      label: seed.label,
      entity: {
        type: seed.type,
        id: seed.id,
        label: seed.label,
      } as ExplorerNode["entity"],
      isSeed: true,
      depth: 0,
    });
  }

  // Add edges
  for (const edge of parsedEdges) {
    const edgeType = edge.type as EdgeType;
    const fromId = edge.fromParsed.id;
    const toId = edge.toParsed.id;
    const edgeId = createEdgeId(edgeType, fromId, toId);
    const fromNode = nodes.get(fromId);
    const toNode = nodes.get(toId);
    const sourceKey =
      fromNode?.key ?? makeNodeKey(edge.fromParsed.type as EntityType, fromId);
    const targetKey =
      toNode?.key ?? makeNodeKey(edge.toParsed.type as EntityType, toId);
    const edgeKey = makeEdgeKey(edgeType, sourceKey, targetKey);

    edges.set(edgeId, {
      id: edgeId,
      key: edgeKey,
      type: edgeType,
      sourceId: fromId,
      targetId: toId,
      sourceKey,
      targetKey,
      numSources: edge.fields?.num_sources as number | undefined,
      numExperiments: edge.fields?.num_experiments as number | undefined,
      fields: edge.fields,
    });
  }

  return { nodes, edges };
}
