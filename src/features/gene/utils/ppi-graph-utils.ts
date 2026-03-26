import type { ElementDefinition } from "cytoscape";
import type { EntityRef, SubgraphEdge } from "../api";
import type { PPIEdge, PPIEvidenceSource, PPINode } from "../components/ppi-network/types";
import { getExperimentTier } from "../components/ppi-network/types";

/**
 * Helper to extract an array from various possible response structures
 */
function getEdgeList(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = (record.edges ?? record.items ?? record.data ?? record.rows) as unknown;
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

// Common PPI database names for synthetic source generation
const COMMON_SOURCES = ["IntAct", "BioGRID", "STRING", "MINT", "DIP", "HPRD", "Reactome", "KEGG"];

/**
 * Extract sources from props object
 */
function extractSourcesFromProps(props: Record<string, unknown>): PPIEvidenceSource[] {
  const sourcesRaw = props.sources ?? props.evidence_sources ?? [];

  if (Array.isArray(sourcesRaw)) {
    return sourcesRaw.map((src) => {
      if (typeof src === "string") {
        return { name: src };
      }
      if (typeof src === "object" && src) {
        const srcObj = src as Record<string, unknown>;
        return {
          name: String(srcObj.name ?? srcObj.source ?? srcObj.database ?? "Unknown"),
          score: typeof srcObj.score === "number" ? srcObj.score : undefined,
          experimentCount: typeof srcObj.experiment_count === "number" ? srcObj.experiment_count : undefined,
        };
      }
      return { name: "Unknown" };
    });
  }

  // Generate synthetic sources based on num_sources if no explicit sources
  const numSources = props.num_sources;
  if (typeof numSources === "number" && numSources > 0) {
    return COMMON_SOURCES.slice(0, Math.min(numSources, COMMON_SOURCES.length)).map((name) => ({ name }));
  }

  return [];
}

/**
 * Extract detection methods from props object
 */
function extractDetectionMethodsFromProps(props: Record<string, unknown>): string[] {
  const methodsRaw = props.detection_methods ?? props.methods ?? [];

  if (Array.isArray(methodsRaw)) {
    return methodsRaw
      .map((m) => (typeof m === "string" ? m : typeof m === "object" && m ? String((m as Record<string, unknown>).name ?? m) : null))
      .filter((m): m is string => Boolean(m));
  }
  return [];
}

/**
 * Extract PubMed IDs from structured fields or from gene function text.
 * The API doesn't return a dedicated pmids array, but function descriptions
 * contain references like {ECO:...|PubMed:12345}.
 */
function extractPubmedIdsFromProps(props: Record<string, unknown>): string[] {
  const pubmedRaw = props.pmids ?? props.pubmed_ids ?? props.publications ?? [];
  if (Array.isArray(pubmedRaw)) {
    return pubmedRaw.map((p) => String(p)).filter((p) => /^\d+$/.test(p));
  }
  return [];
}

function extractPubmedIdsFromFunctionText(props: Record<string, unknown>): string[] {
  // Try structured fields first
  const structured = extractPubmedIdsFromProps(props);
  if (structured.length > 0) return structured;

  // Fall back: extract PubMed:NNNNN from gene function text
  const ids = new Set<string>();
  for (const key of ["src_gene_function", "dst_gene_function"]) {
    const text = props[key];
    if (typeof text === "string") {
      for (const match of text.matchAll(/PubMed:(\d+)/g)) {
        ids.add(match[1]);
      }
    }
  }
  return [...ids];
}

/**
 * Merge props from multiple sources for legacy format extraction
 */
function mergePropsFromLegacy(
  edgeRecord: Record<string, unknown>,
  linkProps: Record<string, unknown>
): Record<string, unknown> {
  const properties = edgeRecord?.properties as Record<string, unknown> | undefined;
  return {
    sources: linkProps?.sources ?? linkProps?.evidence_sources ?? edgeRecord?.sources ?? edgeRecord?.evidence_sources ?? properties?.sources,
    detection_methods: linkProps?.detection_methods ?? linkProps?.methods ?? edgeRecord?.detection_methods ?? edgeRecord?.methods,
    pubmed_ids: linkProps?.pmids ?? linkProps?.pubmed_ids ?? linkProps?.publications ?? edgeRecord?.pmids ?? edgeRecord?.pubmed_ids,
    num_sources: linkProps?.num_sources ?? edgeRecord?.num_sources,
  };
}

/**
 * Extract PPI edges from subgraph API response (preferred format)
 * Uses EntityRef format for consistent node representation
 *
 * Handles ALL edge types including:
 * - Seed → Neighbor edges
 * - Neighbor ↔ Neighbor edges (cross-connections/mesh)
 *
 * Requires includeProps: true in the API call to get edge properties
 * (num_sources, confidence_scores, sources, pubmed_ids, etc.)
 */
export function extractPPIEdgesFromSubgraph(
  seedGeneId: string,
  nodes: EntityRef[],
  edges: SubgraphEdge[],
): PPIEdge[] {
  // Create a map of node IDs to EntityRef for quick lookup
  const nodeMap = new Map<string, EntityRef>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  // Filter to only INTERACTS_WITH edges
  const ppiEdges = edges.filter((edge) => edge.type === "GENE_INTERACTS_WITH_GENE");

  return ppiEdges
    .map((edge) => {
      const props = edge.props ?? {};
      const ev = edge.evidence ?? {};

      const sourceNode = nodeMap.get(edge.from.id);
      const targetNode = nodeMap.get(edge.to.id);

      // Sources live in evidence.sources (string[]), not in props
      const evidenceSources = Array.isArray(ev.sources) ? ev.sources : [];
      const sources: PPIEvidenceSource[] = evidenceSources.map((s: unknown) =>
        typeof s === "string" ? { name: s } : { name: "Unknown" },
      );

      const numSources = sources.length || null;
      const numExperiments = typeof props.evidence_count === "number" ? props.evidence_count : null;

      // Build confidence from ot_mi_score and/or string_combined_score (0-1000 → 0-1)
      const confidenceScores: number[] = [];
      if (typeof props.ot_mi_score === "number") confidenceScores.push(props.ot_mi_score);
      if (typeof props.string_combined_score === "number") confidenceScores.push(props.string_combined_score / 1000);

      const detectionMethods = extractDetectionMethodsFromProps(props);
      // No structured pubmed_ids in the API — extract from gene function text if present
      const pubmedIds = extractPubmedIdsFromFunctionText(props);

      const edgeId = `ppi-${edge.from.id}-${edge.to.id}`;

      return {
        id: edgeId,
        sourceId: edge.from.id,
        sourceSymbol: sourceNode?.label ?? edge.from.label,
        targetId: edge.to.id,
        targetSymbol: targetNode?.label ?? edge.to.label,
        numSources,
        numExperiments,
        confidenceScores,
        sources,
        detectionMethods,
        pubmedIds,
        // Attach raw props for the detail panel
        _props: props,
        _confidenceClass: typeof props.confidence_class === "string" ? props.confidence_class : null,
        _interactionType: typeof props.interaction_type === "string" ? props.interaction_type : null,
      } satisfies PPIEdge;
    })
    .sort((a, b) => {
      const as = a.numSources ?? -1;
      const bs = b.numSources ?? -1;
      if (bs !== as) return bs - as;
      return a.targetSymbol.localeCompare(b.targetSymbol);
    });
}


/**
 * Extract PPI edges from legacy API response format
 * Supports multiple response formats for robustness
 */
export function extractPPIEdges(
  seedGeneId: string,
  seedGeneSymbol: string,
  relations: unknown,
  edges?: unknown,
): PPIEdge[] {
  const source = relations ?? edges;
  if (!source) return [];

  let list: unknown[] = [];

  if (Array.isArray(source)) {
    // Direct array of edges
    const direct = source.filter(
      (edge) =>
        (edge as Record<string, unknown>)?.type === "GENE_INTERACTS_WITH_GENE" ||
        (edge as Record<string, unknown>)?.edge_type === "GENE_INTERACTS_WITH_GENE",
    );
    if (direct.length > 0 && ((direct[0] as Record<string, unknown>)?.neighbor || (direct[0] as Record<string, unknown>)?.score)) {
      list = direct;
    } else {
      direct.forEach((entry) => {
        list = list.concat(getEdgeList(entry));
      });
    }
  } else if (typeof source === "object") {
    const record = source as Record<string, unknown>;
    // Look for INTERACTS_WITH key in various formats
    const byType =
      record.INTERACTS_WITH ||
      record.interacts_with ||
      record.Interacts_with;
    if (byType && typeof byType === "object") {
      const byTypeRecord = byType as Record<string, unknown>;
      if (Array.isArray(byTypeRecord.rows)) {
        list = byTypeRecord.rows;
      } else {
        list = getEdgeList(byType);
      }
    } else {
      list = getEdgeList(record.edges);
    }
    if (list.length === 0) {
      list = getEdgeList(record.relations);
    }
  }

  return list
    .map((edge, index) => {
      const edgeRecord = edge as Record<string, unknown>;
      const neighbor = (edgeRecord?.neighbor ?? edgeRecord?.target ?? edgeRecord?.node ?? {}) as Record<string, unknown>;
      const link = (edgeRecord?.link ?? edgeRecord?.edge ?? edgeRecord?.relation ?? edgeRecord?.props ?? {}) as Record<string, unknown>;
      const linkProps = (link?.props ?? link ?? {}) as Record<string, unknown>;

      const neighborId =
        neighbor?.id ||
        edgeRecord?.neighbor_id ||
        edgeRecord?.target_id ||
        edgeRecord?.node_id ||
        edgeRecord?.id ||
        `neighbor-${index}`;

      const neighborSymbol =
        neighbor?.gene_symbol ||
        neighbor?.symbol ||
        neighbor?.name ||
        neighbor?.label ||
        edgeRecord?.neighbor_symbol ||
        edgeRecord?.neighbor_name ||
        edgeRecord?.name ||
        edgeRecord?.label ||
        "Unknown";

      // Extract INTERACTS_WITH specific fields
      const numSources =
        linkProps?.num_sources ??
        link?.num_sources ??
        edgeRecord?.num_sources ??
        (edgeRecord?.properties as Record<string, unknown>)?.num_sources ??
        null;

      const numExperiments =
        linkProps?.num_experiments ??
        link?.num_experiments ??
        edgeRecord?.num_experiments ??
        (edgeRecord?.properties as Record<string, unknown>)?.num_experiments ??
        null;

      const confidenceScoresRaw =
        linkProps?.confidence_scores ??
        link?.confidence_scores ??
        edgeRecord?.confidence_scores ??
        (edgeRecord?.properties as Record<string, unknown>)?.confidence_scores ??
        [];

      const confidenceScores = Array.isArray(confidenceScoresRaw)
        ? confidenceScoresRaw.filter((v): v is number => typeof v === "number")
        : [];

      // Extract provenance data using merged props
      const mergedProps = mergePropsFromLegacy(edgeRecord, linkProps);
      const sources = extractSourcesFromProps(mergedProps);
      const detectionMethods = extractDetectionMethodsFromProps(mergedProps);
      const pubmedIds = extractPubmedIdsFromProps(mergedProps);

      const edgeId = `ppi-${seedGeneId}-${String(neighborId)}`;

      return {
        id: edgeId,
        sourceId: seedGeneId,
        sourceSymbol: seedGeneSymbol,
        targetId: String(neighborId),
        targetSymbol: String(neighborSymbol),
        numSources: typeof numSources === "number" ? numSources : null,
        numExperiments: typeof numExperiments === "number" ? numExperiments : null,
        confidenceScores,
        sources,
        detectionMethods,
        pubmedIds,
      } satisfies PPIEdge;
    })
    .sort((a, b) => {
      const as = a.numSources ?? -1;
      const bs = b.numSources ?? -1;
      if (bs !== as) return bs - as;
      return a.targetSymbol.localeCompare(b.targetSymbol);
    });
}

/**
 * Edge colors by source count (1-4 databases)
 * Width + color intensity: thicker AND darker for more sources
 * Using wider range for better visual distinction
 */
const EDGE_COLORS = {
  1: "#e2e8f0",  // slate-200 - very light
  2: "#94a3b8",  // slate-400 - medium
  3: "#475569",  // slate-600 - dark
  4: "#1e293b",  // slate-800 - very dark
} as const;

/**
 * Edge widths by source count - more dramatic scaling
 */
const EDGE_WIDTHS = {
  1: 1,
  2: 2,
  3: 3.5,
  4: 5,
} as const;

/**
 * Get edge styling based on source count
 */
function getEdgeStyle(numSources: number | null): { width: number; color: string } {
  const sources = Math.max(1, Math.min(numSources ?? 1, 4));
  return {
    width: EDGE_WIDTHS[sources as 1 | 2 | 3 | 4],
    color: EDGE_COLORS[sources as 1 | 2 | 3 | 4],
  };
}

/**
 * Node style colors based on experiment count
 * Uses warm color family (orange→amber→yellow) for natural hierarchy
 * More experiments = more intense/saturated color
 */
const NODE_COLORS = {
  seed: { background: "#6366f1", border: "#4f46e5" },      // Indigo - query gene (distinct)
  low: { background: "#e2e8f0", border: "#cbd5e1" },       // Slate-200/300 - 0-5 experiments (muted)
  moderate: { background: "#fef3c7", border: "#fcd34d" },  // Amber-100/300 - 6-20 experiments (soft warm)
  good: { background: "#fcd34d", border: "#fbbf24" },      // Amber-300/400 - 21-50 experiments (warm)
  high: { background: "#f97316", border: "#ea580c" },      // Orange-500/600 - 51+ experiments (intense)
} as const;

/**
 * Transform PPI data into Cytoscape elements
 * Handles all edge types including neighbor↔neighbor edges (cross-connections)
 */
export function transformToCytoscapeElements(
  seedGene: { id: string; symbol: string },
  ppiEdges: PPIEdge[],
): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const addedNodes = new Set<string>();

  // Add seed node first
  elements.push({
    data: {
      id: seedGene.id,
      label: seedGene.symbol,
      isSeed: true,
      numSources: null,
      numExperiments: null,
      confidenceScores: [],
      backgroundColor: NODE_COLORS.seed.background,
      borderColor: NODE_COLORS.seed.border,
      nodeSize: 48,
    },
  });
  addedNodes.add(seedGene.id);

  // Add all nodes from edges (both source and target, not just target)
  // This properly handles neighbor↔neighbor edges
  ppiEdges.forEach((edge) => {
    const tier = getExperimentTier(edge.numExperiments);
    const colors = NODE_COLORS[tier];
    const edgeStyle = getEdgeStyle(edge.numSources);

    // Add source node if not already added (could be a neighbor in cross-connections)
    if (!addedNodes.has(edge.sourceId)) {
      const isSeed = edge.sourceId === seedGene.id;
      elements.push({
        data: {
          id: edge.sourceId,
          label: edge.sourceSymbol,
          isSeed,
          numSources: edge.numSources,
          numExperiments: edge.numExperiments,
          confidenceScores: edge.confidenceScores,
          backgroundColor: isSeed ? NODE_COLORS.seed.background : colors.background,
          borderColor: isSeed ? NODE_COLORS.seed.border : colors.border,
          nodeSize: isSeed ? 48 : 36,
        },
      });
      addedNodes.add(edge.sourceId);
    }

    // Add target node if not already added
    if (!addedNodes.has(edge.targetId)) {
      const isSeed = edge.targetId === seedGene.id;
      elements.push({
        data: {
          id: edge.targetId,
          label: edge.targetSymbol,
          isSeed,
          numSources: edge.numSources,
          numExperiments: edge.numExperiments,
          confidenceScores: edge.confidenceScores,
          backgroundColor: isSeed ? NODE_COLORS.seed.background : colors.background,
          borderColor: isSeed ? NODE_COLORS.seed.border : colors.border,
          nodeSize: isSeed ? 48 : 36,
        },
      });
      addedNodes.add(edge.targetId);
    }

    // Add edge with actual source/target (could be neighbor↔neighbor)
    // Include edge styling based on source count
    // Use classes for reliable stylesheet targeting
    const sourceCount = Math.max(1, Math.min(edge.numSources ?? 1, 4));
    const edgeClass = `ppi-edge sources-${sourceCount}`;

    elements.push({
      data: {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        numSources: edge.numSources,
        numExperiments: edge.numExperiments,
        sourceCount: edge.sources.length,
        // Style data for stylesheet
        lineColor: edgeStyle.color,
        edgeWidth: edgeStyle.width,
      },
      classes: edgeClass,
    });
  });

  return elements;
}

/**
 * Create a map of edge ID to full edge data for quick lookup
 */
export function createEdgeMap(edges: PPIEdge[]): Map<string, PPIEdge> {
  return new Map(edges.map((edge) => [edge.id, edge]));
}

/**
 * Get node data from Cytoscape node element
 */
export function nodeToData(nodeData: Record<string, unknown>): PPINode {
  const confidenceScoresRaw = nodeData.confidenceScores;
  const confidenceScores = Array.isArray(confidenceScoresRaw)
    ? confidenceScoresRaw.filter((v): v is number => typeof v === "number")
    : [];

  return {
    id: String(nodeData.id ?? ""),
    label: String(nodeData.label ?? "Unknown"),
    isSeed: Boolean(nodeData.isSeed),
    numSources: typeof nodeData.numSources === "number" ? nodeData.numSources : null,
    numExperiments: typeof nodeData.numExperiments === "number" ? nodeData.numExperiments : null,
    confidenceScores,
  };
}

/**
 * Get confidence description based on sources
 */
export function getConfidenceDescription(numSources: number | null): string {
  if (numSources === null) return "Unknown confidence";
  if (numSources >= 5) return "High confidence - supported by multiple independent databases";
  if (numSources >= 2) return "Medium confidence - corroborated by multiple sources";
  return "Low confidence - limited supporting evidence";
}

/**
 * Format confidence score for display
 */
export function formatConfidenceScore(scores: number[]): string {
  if (!scores.length) return "N/A";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return avg.toFixed(3);
}

// =============================================================================
// Hub Spotlight Utilities
// =============================================================================

/**
 * Hub color gradient: blue (0%) → orange (50%) → red (100%)
 * Uses percentile for coloring to show relative importance
 */
export function getHubColor(percentile: number): { background: string; border: string } {
  // Clamp percentile to 0-100
  const p = Math.max(0, Math.min(100, percentile));

  if (p < 50) {
    // Blue to Orange gradient (0-50%)
    const ratio = p / 50;
    const r = Math.round(59 + (234 - 59) * ratio);  // 59 → 234
    const g = Math.round(130 + (179 - 130) * ratio); // 130 → 179
    const b = Math.round(246 + (8 - 246) * ratio);   // 246 → 8
    return {
      background: `rgb(${r}, ${g}, ${b})`,
      border: `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)})`,
    };
  } else {
    // Orange to Red gradient (50-100%)
    const ratio = (p - 50) / 50;
    const r = Math.round(234 + (220 - 234) * ratio); // 234 → 220
    const g = Math.round(179 + (38 - 179) * ratio);  // 179 → 38
    const b = Math.round(8 + (38 - 8) * ratio);      // 8 → 38
    return {
      background: `rgb(${r}, ${g}, ${b})`,
      border: `rgb(${Math.round(r * 0.85)}, ${Math.round(g * 0.85)}, ${Math.round(b * 0.85)})`,
    };
  }
}

/**
 * Scale node size based on degree (for hub mode)
 * Range: 36px (min) to 60px (max)
 */
export function getHubNodeSize(degreeTotal: number, maxDegree: number): number {
  const MIN_SIZE = 36;
  const MAX_SIZE = 60;

  if (maxDegree === 0) return MIN_SIZE;

  const ratio = Math.min(degreeTotal / maxDegree, 1);
  return MIN_SIZE + (MAX_SIZE - MIN_SIZE) * ratio;
}

/**
 * Format hub score for display
 */
export function formatHubScore(hubScore: number): string {
  return (hubScore * 100).toFixed(1) + "%";
}

/**
 * Format percentile for display
 */
export function formatPercentile(percentile: number): string {
  return percentile.toFixed(0) + "th";
}
