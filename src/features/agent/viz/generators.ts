/**
 * Pure deterministic generators that convert tool results into VizSpec objects.
 * Each generator returns null if data is insufficient for a useful visualization.
 * All generators are wrapped in try/catch — they never break agent flow.
 */

import type {
  VizSpec,
  BarChartVizSpec,
  EnrichmentVizSpec,
  NetworkVizSpec,
  StatCardVizSpec,
  DistributionVizSpec,
  ComparisonVizSpec,
  ScatterPlotVizSpec,
  QQPlotVizSpec,
  HeatmapVizSpec,
  ProteinStructureVizSpec,
} from "./types";

// ---------------------------------------------------------------------------
// Generator type
// ---------------------------------------------------------------------------

type VizGenerator = (
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
) => VizSpec | null;

// ---------------------------------------------------------------------------
// Individual generators
// ---------------------------------------------------------------------------

function genRankedNeighbors(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const out = output as Record<string, unknown>;
  const neighbors = out?.neighbors as
    | Array<{
        entity: { type: string; id: string; label: string };
        score?: number;
        rank?: number;
      }>
    | undefined;

  if (!neighbors || neighbors.length < 3) return null;

  // Only generate if there are actual scores (not just ranks)
  const hasScores = neighbors.some((n) => n.score != null && n.score > 0);
  if (!hasScores) return null;

  const edgeType = input.edgeType as string | undefined;
  const entityId = input.id as string | undefined;
  const entityType = input.type as string | undefined;
  const seedLabel = entityId
    ? `${entityType ?? ""}:${entityId}`.replace(/^:/, "")
    : "entity";

  return {
    type: "bar_chart",
    toolCallIndex,
    title: edgeType
      ? `${edgeType} neighbors of ${seedLabel}`
      : `Top neighbors of ${seedLabel}`,
    data: neighbors.slice(0, 20).map((n) => ({
      id: n.entity.id,
      label: n.entity.label,
      value: n.score ?? 0,
      category: n.entity.type,
    })),
    valueLabel: "Score",
    layout: "horizontal",
  };
}

function genEnrichment(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): EnrichmentVizSpec | null {
  const out = output as Record<string, unknown>;

  // Handle both new { enriched: [...] } and legacy array format
  let enriched: Array<{
    entity: { type: string; id: string; label: string };
    overlap: number;
    pValue: number;
    adjustedPValue: number;
    foldEnrichment: number;
    overlappingGenes: string[];
  }>;

  if (Array.isArray(output)) {
    enriched = output;
  } else if (out?.enriched && Array.isArray(out.enriched)) {
    enriched = out.enriched;
  } else {
    return null;
  }

  if (enriched.length < 2) return null;

  return {
    type: "enrichment_plot",
    toolCallIndex,
    title: "Pathway & term enrichment",
    data: enriched.slice(0, 20).map((e) => ({
      id: e.entity.id,
      label: e.entity.label,
      // Floor at 1e-300 to avoid -log10(0)=Infinity while keeping extreme values ranked highest
      negLogAdjP: -Math.log10(Math.max(e.adjustedPValue, 1e-300)),
      foldEnrichment: e.foldEnrichment,
      overlap: e.overlap,
      overlappingGenes: e.overlappingGenes?.slice(0, 10) ?? [],
    })),
  };
}

function genFindPaths(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): NetworkVizSpec | null {
  // New format: PathsResult { paths: CompressedPath[] }
  const out = output as Record<string, unknown>;
  const paths = out?.paths as Array<{
    rank: number;
    length: number;
    pathText: string;
    nodes: Array<{ type: string; id: string; label: string }>;
  }> | undefined;

  if (!paths || paths.length < 1) return null;

  // Deduplicate nodes and build edges from top 5 paths
  const nodeMap = new Map<string, { id: string; label: string; type: string }>();
  const edgeSet = new Set<string>();
  const edges: NetworkVizSpec["edges"] = [];

  // Determine seed IDs from input
  const fromId = input.from as string | undefined;
  const toId = input.to as string | undefined;
  const seedIds = new Set<string>();
  if (fromId) seedIds.add(fromId);
  if (toId) seedIds.add(toId);

  for (const path of paths.slice(0, 5)) {
    for (const node of path.nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, { id: node.id, label: node.label, type: node.type });
      }
    }
    // Build edges between consecutive nodes in path
    for (let i = 0; i < path.nodes.length - 1; i++) {
      const src = path.nodes[i];
      const tgt = path.nodes[i + 1];
      const key = `${src.id}->${tgt.id}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({
          source: src.id,
          target: tgt.id,
          type: "path_edge",
        });
      }
    }
  }

  const nodes = [...nodeMap.values()].slice(0, 50);
  if (nodes.length < 2) return null;

  const fromLabel = fromId ?? "source";
  const toLabel = toId ?? "target";

  return {
    type: "network",
    toolCallIndex,
    title: `Paths: ${fromLabel} to ${toLabel}`,
    nodes: nodes.map((n) => ({
      ...n,
      isSeed: seedIds.has(n.id),
    })),
    edges: edges.slice(0, 100),
  };
}

function genFindPatterns(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): NetworkVizSpec | null {
  const out = output as Record<string, unknown>;
  const matches = out?.matches as Array<{
    vars: Record<string, { type: string; id: string; label: string }>;
    edges: Array<{ type: string; from: string; to: string }>;
    score?: number;
  }> | undefined;

  if (!matches || matches.length < 1) return null;

  // Build deduplicated nodes and edges from top matches
  const nodeMap = new Map<string, { id: string; label: string; type: string }>();
  const edgeSet = new Set<string>();
  const edges: NetworkVizSpec["edges"] = [];

  for (const match of matches.slice(0, 10)) {
    for (const entity of Object.values(match.vars)) {
      if (!nodeMap.has(entity.id)) {
        nodeMap.set(entity.id, { id: entity.id, label: entity.label, type: entity.type });
      }
    }
    for (const e of match.edges) {
      const key = `${e.from}->${e.to}:${e.type}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        // Extract IDs from Type:ID format
        const fromId = e.from.includes(":") ? e.from.split(":").slice(1).join(":") : e.from;
        const toId = e.to.includes(":") ? e.to.split(":").slice(1).join(":") : e.to;
        edges.push({ source: fromId, target: toId, type: e.type });
      }
    }
  }

  const nodes = [...nodeMap.values()].slice(0, 50);
  if (nodes.length < 2) return null;

  const counts = out?.counts as { returned?: number } | undefined;

  return {
    type: "network",
    toolCallIndex,
    title: `Pattern matches (${counts?.returned ?? matches.length} found)`,
    nodes: nodes.map((n) => ({ ...n, isSeed: false })),
    edges: edges.slice(0, 100),
  };
}

function genGraphTraverse(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): NetworkVizSpec | null {
  const out = output as Record<string, unknown>;
  if (out?.error) return null;

  const nodes = out?.nodes as
    | Array<{ type: string; id: string; label: string }>
    | undefined;
  const edges = out?.edges as
    | Array<{ type: string; from: string; to: string }>
    | undefined;

  if (!nodes || nodes.length < 2) return null;

  // Determine seed IDs from input
  const seeds = input.seeds as
    | Array<{ type?: string; id?: string }>
    | undefined;
  const seedIds = new Set(seeds?.map((s) => s.id).filter(Boolean) as string[]);

  // Build node lookup by label (edges use labels for from/to)
  const labelToId = new Map<string, string>();
  for (const n of nodes) {
    labelToId.set(n.label, n.id);
  }

  return {
    type: "network",
    toolCallIndex,
    title: `Graph traversal (${nodes.length} nodes)`,
    nodes: nodes.slice(0, 50).map((n) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      isSeed: seedIds.has(n.id),
    })),
    edges: (edges ?? []).slice(0, 100).map((e) => ({
      source: labelToId.get(e.from) ?? e.from,
      target: labelToId.get(e.to) ?? e.to,
      type: e.type,
    })),
  };
}

function genConnections(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const out = output as Record<string, unknown>;
  const connections = out?.connections as
    | Array<{ edgeType: string; count: number; label?: string }>
    | undefined;

  if (!connections || connections.length < 2) return null;

  const fromEntity = (input.from as { id?: string } | undefined)?.id ?? "?";
  const toEntity = (input.to as { id?: string } | undefined)?.id ?? "?";

  return {
    type: "bar_chart",
    toolCallIndex,
    title: `Connections: ${fromEntity} \u2194 ${toEntity}`,
    data: connections.slice(0, 20).map((c) => ({
      id: c.edgeType,
      label: c.label ?? c.edgeType,
      value: c.count,
    })),
    valueLabel: "Edge count",
    layout: "horizontal",
  };
}

function genCompareEntities(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): ComparisonVizSpec | null {
  const out = output as Record<string, unknown>;
  const entities = out?.entities as
    | Array<{ type: string; id: string; label: string }>
    | undefined;
  const comparisons = out?.comparisons as
    | Record<
        string,
        {
          sharedCount: number;
          uniqueCounts: Record<string, number>;
        }
      >
    | undefined;

  if (!entities || entities.length < 2 || !comparisons) return null;
  const compEntries = Object.entries(comparisons);
  if (compEntries.length < 1) return null;

  const labels = entities.map((e) => e.label).join(" vs ");

  return {
    type: "comparison",
    toolCallIndex,
    title: `Comparison: ${labels}`,
    entities,
    overallSimilarity: out.overallSimilarity as number | undefined,
    rows: compEntries.slice(0, 20).map(([edgeType, data]) => ({
      edgeType,
      sharedCount: data.sharedCount,
      uniqueCounts: data.uniqueCounts,
    })),
  };
}

function genSharedNeighbors(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const out = output as Record<string, unknown>;
  if (out?.error) return null;

  const neighbors = out?.neighbors as
    | Array<{
        neighbor: { type: string; id: string; label: string };
        supportedBy: string[];
      }>
    | undefined;

  if (!neighbors || neighbors.length < 3) return null;

  const entities = input.entities as
    | Array<{ id?: string }>
    | undefined;
  const entityLabels =
    entities?.map((e) => e.id).join(", ") ?? "entities";

  return {
    type: "bar_chart",
    toolCallIndex,
    title: `Shared neighbors of ${entityLabels}`,
    data: neighbors.slice(0, 20).map((n) => ({
      id: n.neighbor.id,
      label: n.neighbor.label,
      value: n.supportedBy.length,
      category: n.neighbor.type,
    })),
    valueLabel: "Supporting entities",
    layout: "horizontal",
  };
}

function genAnalyzeCohortGroupby(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const out = output as Record<string, unknown>;
  const buckets = out?.buckets as
    | Array<Record<string, unknown>>
    | undefined;
  const operation = input.operation as string | undefined;

  if (operation !== "groupby" || !buckets || buckets.length < 2) return null;

  const groupBy = (out.group_by ?? input.groupBy) as string | undefined;

  return {
    type: "bar_chart",
    toolCallIndex,
    title: groupBy
      ? `Variants by ${groupBy}`
      : "Cohort group breakdown",
    data: buckets.slice(0, 20).map((b, i) => {
      const key =
        (b[groupBy ?? "key"] as string) ??
        (b.gene as string) ??
        (b.key as string) ??
        `Group ${i + 1}`;
      const count = (b.count ?? b.variant_count ?? 0) as number;
      return {
        id: key,
        label: key,
        value: count,
      };
    }),
    valueLabel: "Count",
    layout: "horizontal",
  };
}

function genAnalyzeCohortCorrelation(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): StatCardVizSpec | null {
  const out = output as Record<string, unknown>;
  const operation = input.operation as string | undefined;

  if (operation !== "correlation") return null;
  if (out?.r == null) return null;

  const x = out.x as string | undefined;
  const y = out.y as string | undefined;

  const stats: StatCardVizSpec["stats"] = [
    { label: "Correlation (r)", value: Number((out.r as number).toFixed(4)) },
    { label: "Sample size (n)", value: out.n as number },
  ];
  if (out.x_mean != null) {
    stats.push({
      label: `Mean ${x ?? "x"}`,
      value: Number((out.x_mean as number).toFixed(4)),
    });
  }
  if (out.y_mean != null) {
    stats.push({
      label: `Mean ${y ?? "y"}`,
      value: Number((out.y_mean as number).toFixed(4)),
    });
  }

  return {
    type: "stat_card",
    toolCallIndex,
    title: x && y ? `Correlation: ${x} vs ${y}` : "Correlation analysis",
    stats,
  };
}

function genGwasAssociations(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const out = output as Record<string, unknown>;
  const associations = out?.topAssociations as
    | Array<{ trait: string; pValueMlog: number; effectSize?: string }>
    | undefined;

  if (!associations || associations.length < 3) return null;

  const entityId = input.entityId as string | undefined;

  return {
    type: "bar_chart",
    toolCallIndex,
    title: entityId
      ? `GWAS associations for ${entityId}`
      : "GWAS associations",
    data: associations.slice(0, 20).map((a) => ({
      id: a.trait,
      label: a.trait,
      value: a.pValueMlog,
    })),
    valueLabel: "-log10(p-value)",
    layout: "horizontal",
  };
}

function genVariantBatchSummary(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): DistributionVizSpec | null {
  const out = output as Record<string, unknown>;
  if (!out) return null;

  const groups: DistributionVizSpec["groups"] = [];

  const byGene = out.byGene as
    | Array<{ geneSymbol: string; count: number }>
    | undefined;
  if (byGene?.length) {
    groups.push({
      label: "By Gene",
      data: byGene.slice(0, 15).map((g) => ({
        id: g.geneSymbol,
        label: g.geneSymbol,
        value: g.count,
      })),
    });
  }

  const byConsequence = out.byConsequence as
    | Array<{ category: string; count: number }>
    | undefined;
  if (byConsequence?.length) {
    groups.push({
      label: "By Consequence",
      data: byConsequence.slice(0, 15).map((c) => ({
        id: c.category,
        label: c.category,
        value: c.count,
      })),
    });
  }

  const byClinical = out.byClinicalSignificance as
    | Array<{ category: string; count: number }>
    | undefined;
  if (byClinical?.length) {
    groups.push({
      label: "By Clinical Significance",
      data: byClinical.slice(0, 15).map((c) => ({
        id: c.category,
        label: c.category,
        value: c.count,
      })),
    });
  }

  const byFrequency = out.byFrequency as
    | Array<{ category: string; count: number }>
    | undefined;
  if (byFrequency?.length) {
    groups.push({
      label: "By Frequency",
      data: byFrequency.slice(0, 15).map((f) => ({
        id: f.category,
        label: f.category,
        value: f.count,
      })),
    });
  }

  if (groups.length === 0) return null;

  return {
    type: "distribution",
    toolCallIndex,
    title: "Variant batch summary",
    groups,
  };
}

function genGeneVariantStats(
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): DistributionVizSpec | null {
  const out = output as Record<string, unknown>;
  if (!out?.gene || out.totalVariants == null) return null;

  const gene = out.gene as string;
  const groups: DistributionVizSpec["groups"] = [];

  // ClinVar breakdown
  const clinvar = out.clinvar as Record<string, number> | undefined;
  if (clinvar) {
    const entries = Object.entries(clinvar).filter(([, v]) => v > 0);
    if (entries.length > 0) {
      groups.push({
        label: "ClinVar Classification",
        data: entries.map(([k, v]) => ({ id: k, label: k, value: v })),
      });
    }
  }

  // Consequence breakdown
  const consequence = out.consequence as Record<string, number> | undefined;
  if (consequence) {
    const entries = Object.entries(consequence).filter(([, v]) => v > 0);
    if (entries.length > 0) {
      groups.push({
        label: "Consequence Type",
        data: entries.map(([k, v]) => ({ id: k, label: k, value: v })),
      });
    }
  }

  // Frequency breakdown
  const frequency = out.frequency as Record<string, number> | undefined;
  if (frequency) {
    const entries = Object.entries(frequency).filter(([, v]) => v > 0);
    if (entries.length > 0) {
      groups.push({
        label: "Allele Frequency",
        data: entries.map(([k, v]) => ({ id: k, label: k, value: v })),
      });
    }
  }

  if (groups.length === 0) return null;

  const geneSymbol = (input.geneSymbol as string) ?? gene;
  return {
    type: "distribution",
    toolCallIndex,
    title: `Variant stats for ${geneSymbol}`,
    groups,
  };
}

// ---------------------------------------------------------------------------
// Analytics generators
// ---------------------------------------------------------------------------

function genAnalyticsStatCard(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): StatCardVizSpec | null {
  const out = output as Record<string, unknown>;
  if (out?.error) return null;

  const metrics = out?.metrics as Record<string, unknown> | undefined;
  if (!metrics || Object.keys(metrics).length === 0) return null;

  const taskType = (out.taskType as string) ?? "Analytics";

  const stats: StatCardVizSpec["stats"] = Object.entries(metrics)
    .slice(0, 8)
    .map(([key, val]) => ({
      label: key.replace(/_/g, " "),
      value: typeof val === "number" ? Number(val.toFixed(4)) : String(val),
    }));

  return {
    type: "stat_card",
    toolCallIndex,
    title: `${taskType} results`,
    stats,
  };
}

function genAnalyticsScatter(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): ScatterPlotVizSpec | null {
  const out = output as Record<string, unknown>;
  if (out?.error) return null;

  const charts = out?.charts as Array<Record<string, unknown>> | undefined;
  if (!charts) return null;

  // Find a scatter chart
  const scatterChart = charts.find((c) => c.chart_type === "scatter");
  if (!scatterChart) return null;

  const chartData = scatterChart.data as Record<string, unknown> | undefined;
  if (!chartData) return null;

  const points = chartData.points as Array<{ x: number; y: number; label?: string; category?: string }> | undefined;
  if (!points || points.length < 2) return null;

  const regression = chartData.regression as { slope: number; intercept: number; r_squared: number } | undefined;

  return {
    type: "scatter_plot",
    toolCallIndex,
    title: (scatterChart.title as string) ?? "Scatter plot",
    data: points.slice(0, 500),
    xLabel: (chartData.x_label as string) ?? "X",
    yLabel: (chartData.y_label as string) ?? "Y",
    regressionLine: regression,
  };
}

function genAnalyticsQQ(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): QQPlotVizSpec | null {
  const out = output as Record<string, unknown>;
  if (out?.error) return null;

  const charts = out?.charts as Array<Record<string, unknown>> | undefined;
  if (!charts) return null;

  // Find a QQ plot chart
  const qqChart = charts.find((c) => c.chart_type === "qq_plot");
  if (!qqChart) return null;

  const chartData = qqChart.data as Record<string, unknown> | undefined;
  if (!chartData) return null;

  const points = chartData.points as Array<{ expected: number; observed: number; label?: string }> | undefined;
  if (!points || points.length < 2) return null;

  return {
    type: "qq_plot",
    toolCallIndex,
    title: (qqChart.title as string) ?? "QQ plot",
    data: points.slice(0, 1000),
    lambda: chartData.lambda as number | undefined,
  };
}

function genAnalyticsBar(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const out = output as Record<string, unknown>;
  if (out?.error) return null;

  const charts = out?.charts as Array<Record<string, unknown>> | undefined;
  if (!charts) return null;

  // Find a bar chart
  const barChart = charts.find((c) => c.chart_type === "bar");
  if (!barChart) return null;

  const chartData = barChart.data as Record<string, unknown> | undefined;
  if (!chartData) return null;

  const bars = chartData.bars as Array<{ id: string; label: string; value: number; category?: string }> | undefined;
  if (!bars || bars.length < 2) return null;

  return {
    type: "bar_chart",
    toolCallIndex,
    title: (barChart.title as string) ?? "Analytics results",
    data: bars.slice(0, 20),
    valueLabel: (chartData.value_label as string) ?? "Value",
    layout: "horizontal",
  };
}

function genAnalyticsHeatmap(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): HeatmapVizSpec | null {
  const out = output as Record<string, unknown>;
  if (out?.error) return null;

  const charts = out?.charts as Array<Record<string, unknown>> | undefined;
  if (!charts) return null;

  const heatmapChart = charts.find((c) => c.chart_type === "heatmap");
  if (!heatmapChart) return null;

  const chartData = heatmapChart.data as Record<string, unknown> | undefined;
  if (!chartData) return null;

  const rows = chartData.rows as string[] | undefined;
  const cols = chartData.cols as string[] | undefined;
  const values = chartData.values as number[][] | undefined;

  if (!rows?.length || !cols?.length || !values?.length) return null;

  return {
    type: "heatmap",
    toolCallIndex,
    title: (heatmapChart.title as string) ?? "Heatmap",
    rows: rows.slice(0, 50),
    cols: cols.slice(0, 50),
    values: values.slice(0, 50).map((r) => r.slice(0, 50)),
    colorScale: (chartData.color_scale as "diverging" | "sequential") ?? "sequential",
    valueLabel: chartData.value_label as string | undefined,
    minValue: chartData.min_value as number | undefined,
    maxValue: chartData.max_value as number | undefined,
  };
}

// ---------------------------------------------------------------------------
// Protein domain architecture
// ---------------------------------------------------------------------------

const DOMAIN_PALETTE = [
  "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981",
  "#ef4444", "#3b82f6", "#ec4899", "#84cc16",
];

function genProteinDomains(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): ProteinStructureVizSpec | null {
  const out = output as Record<string, unknown>;
  // RunResult shape: { text_summary, data: { _proteinDomains, resolved_seeds, ... }, state_delta }
  const data = out?.data as Record<string, unknown> | undefined;
  const pd = data?._proteinDomains as {
    proteinLength?: number;
    alphafoldId?: string | null;
    domains?: Array<{
      id: string;
      name: string;
      description?: string;
      start: number;
      end: number;
      type?: string;
      meanPlddt?: number;
    }>;
  } | undefined;

  if (!pd?.domains?.length || !pd.proteinLength) return null;

  const seeds = data?.resolved_seeds as Array<{ label?: string }> | undefined;
  const geneLabel = seeds?.[0]?.label ?? "Protein";

  return {
    type: "protein_structure",
    toolCallIndex,
    title: `Protein domains of ${geneLabel}`,
    geneLabel,
    proteinLength: pd.proteinLength,
    alphafoldId: pd.alphafoldId ?? null,
    domains: pd.domains.map((d, i) => ({
      ...d,
      color: DOMAIN_PALETTE[i % DOMAIN_PALETTE.length],
    })),
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const GENERATOR_REGISTRY: Record<string, VizGenerator[]> = {
  getRankedNeighbors: [genRankedNeighbors],
  runEnrichment: [genEnrichment],
  findPaths: [genFindPaths],
  findPatterns: [genFindPatterns],
  graphTraverse: [genGraphTraverse],
  getConnections: [genConnections],
  compareEntities: [genCompareEntities],
  getSharedNeighbors: [genSharedNeighbors],
  // analyzeCohort has two generators — groupby and correlation
  analyzeCohort: [genAnalyzeCohortGroupby, genAnalyzeCohortCorrelation],
  getGwasAssociations: [genGwasAssociations],
  variantBatchSummary: [genVariantBatchSummary],
  getGeneVariantStats: [genGeneVariantStats],
  // runAnalytics: multiple chart types from analytics pipeline
  runAnalytics: [genAnalyticsStatCard, genAnalyticsScatter, genAnalyticsQQ, genAnalyticsBar, genAnalyticsHeatmap],
  // run_explore: protein domain architecture from explore neighbors
  run_explore: [genProteinDomains],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to generate VizSpecs from a tool result.
 * Returns an array of specs (may be empty). For most tools, returns at most one.
 * For runAnalytics, may return multiple (stat card + scatter + QQ etc).
 * Never throws — all generators are wrapped in try/catch.
 */
export function generateVizSpecs(
  toolName: string,
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): VizSpec[] {
  // Resolve "Run" → "run_<command>" so client-side matches server-side keys
  const resolved =
    toolName === "Run" && typeof input.command === "string"
      ? `run_${input.command}`
      : toolName;

  const generators = GENERATOR_REGISTRY[resolved];
  if (!generators) return [];

  // For runAnalytics, collect ALL matching specs (multiple chart types)
  if (toolName === "runAnalytics") {
    const specs: VizSpec[] = [];
    for (const gen of generators) {
      try {
        const spec = gen(output, input, toolCallIndex);
        if (spec) specs.push(spec);
      } catch {
        continue;
      }
    }
    return specs;
  }

  // For all other tools, return the first match only
  for (const gen of generators) {
    try {
      const spec = gen(output, input, toolCallIndex);
      if (spec) return [spec];
    } catch {
      continue;
    }
  }
  return [];
}

/**
 * Attempt to generate a VizSpec from a tool result.
 * Returns null if no generator matches or data is insufficient.
 * Never throws — all generators are wrapped in try/catch.
 *
 * @deprecated Use generateVizSpecs for multi-spec support (e.g., runAnalytics).
 */
export function generateVizSpec(
  toolName: string,
  output: unknown,
  input: Record<string, unknown>,
  toolCallIndex: number,
): VizSpec | null {
  const specs = generateVizSpecs(toolName, output, input, toolCallIndex);
  return specs[0] ?? null;
}
