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
  let enriched: Array<Record<string, unknown>>;

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
    data: enriched.slice(0, 20).map((e) => {
      const entity = e.entity as { id: string; label: string } | undefined;
      // Handle both overlappingGenes (legacy) and overlappingEntities (current)
      const rawOverlap = (e.overlappingEntities ?? e.overlappingGenes ?? []) as Array<string | { label?: string }>;
      const genes = rawOverlap.slice(0, 10).map((g) =>
        typeof g === "string" ? g : (g.label ?? "?"),
      );
      return {
        id: entity?.id ?? "?",
        label: entity?.label ?? "?",
        // Floor at 1e-300 to avoid -log10(0)=Infinity while keeping extreme values ranked highest
        negLogAdjP: -Math.log10(Math.max(e.adjustedPValue as number ?? 1, 1e-300)),
        foldEnrichment: (e.foldEnrichment as number) ?? 0,
        overlap: (e.overlap as number) ?? 0,
        overlappingGenes: genes,
      };
    }),
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
  const ct = (scatterChart.chart_type as string) ?? "";
  let xLabel = chartData.x_label as string | undefined;
  let yLabel = chartData.y_label as string | undefined;
  if (!xLabel || !yLabel) {
    if (ct.includes("pred_vs_actual") || ct.includes("predicted_vs_actual")) {
      xLabel ??= "Actual";
      yLabel ??= "Predicted";
    } else if (ct.includes("residual")) {
      xLabel ??= "Predicted";
      yLabel ??= "Residual";
    } else {
      xLabel ??= "X";
      yLabel ??= "Y";
    }
  }

  return {
    type: "scatter_plot",
    toolCallIndex,
    title: (scatterChart.title as string) ?? "Scatter plot",
    data: points.slice(0, 500),
    xLabel,
    yLabel,
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

  // Assign one color per unique domain name (not per instance)
  const nameToColor = new Map<string, string>();
  let colorIdx = 0;
  for (const d of pd.domains) {
    if (!nameToColor.has(d.name)) {
      nameToColor.set(d.name, DOMAIN_PALETTE[colorIdx % DOMAIN_PALETTE.length]);
      colorIdx++;
    }
  }

  return {
    type: "protein_structure",
    toolCallIndex,
    title: `Protein domains of ${geneLabel}`,
    geneLabel,
    proteinLength: pd.proteinLength,
    alphafoldId: pd.alphafoldId ?? null,
    domains: pd.domains.map((d) => ({
      ...d,
      color: nameToColor.get(d.name) ?? DOMAIN_PALETTE[0],
    })),
  };
}

// ---------------------------------------------------------------------------
// Run-tool analytics: shape-driven multi-chart generator
// Iterates ALL charts in the result and creates a VizSpec for each.
// Solves the "only first scatter rendered" bug (e.g. pred_vs_actual + residuals).
// ---------------------------------------------------------------------------

/**
 * Generate VizSpecs for all charts in a Run analytics result.
 * Returns stat card from metrics + one viz per chart (shape-driven).
 */
function generateRunAnalyticsAllSpecs(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): VizSpec[] {
  const out = output as Record<string, unknown>;
  if (out?.error) return [];
  const data = out?.data as Record<string, unknown> | undefined;
  if (!data) return [];

  const specs: VizSpec[] = [];

  // 1. Stat card from metrics
  const metrics = data.metrics as Record<string, unknown> | undefined;
  if (metrics && Object.keys(metrics).length > 0) {
    const taskType = (data.taskType as string) ?? "Analytics";
    const stats: StatCardVizSpec["stats"] = Object.entries(metrics)
      .slice(0, 8)
      .map(([key, val]) => ({
        label: key.replace(/_/g, " "),
        value: typeof val === "number" ? Number(val.toFixed(4)) : String(val),
      }));
    specs.push({ type: "stat_card", toolCallIndex, title: `${taskType} results`, stats });
  }

  // 2. One viz per chart — shape-driven (not chart_type name-driven)
  const charts = data.charts as Array<Record<string, unknown>> | undefined;
  if (!charts?.length) return specs;

  for (const chart of charts) {
    const chartData = chart.data as Record<string, unknown> | undefined;
    if (!chartData) continue;
    const title = (chart.title as string) ?? "Chart";
    const chartType = chart.chart_type as string | undefined;

    try {
      // QQ plot (check first — points have expected/observed, not x/y)
      if (chartType === "qq_plot") {
        const pts = chartData.points as Array<{ expected: number; observed: number; label?: string }> | undefined;
        if (pts && pts.length >= 2) {
          specs.push({
            type: "qq_plot", toolCallIndex, title,
            data: pts.slice(0, 1000),
            lambda: chartData.lambda as number | undefined,
          });
          continue;
        }
      }

      // Heatmap (rows/cols/values matrix)
      const hRows = chartData.rows as string[] | undefined;
      const hCols = chartData.cols as string[] | undefined;
      const hVals = chartData.values as number[][] | undefined;
      if (hRows?.length && hCols?.length && hVals?.length) {
        specs.push({
          type: "heatmap", toolCallIndex, title,
          rows: hRows.slice(0, 50),
          cols: hCols.slice(0, 50),
          values: hVals.slice(0, 50).map((r) => r.slice(0, 50)),
          colorScale: (chartData.color_scale as "diverging" | "sequential") ?? "sequential",
          valueLabel: chartData.value_label as string | undefined,
          minValue: chartData.min_value as number | undefined,
          maxValue: chartData.max_value as number | undefined,
        });
        continue;
      }

      // Bar chart (bars array)
      const bars = chartData.bars as Array<{ label: string; value: number; id?: string; category?: string }> | undefined;
      if (bars && bars.length >= 1) {
        specs.push({
          type: "bar_chart", toolCallIndex, title,
          data: bars.slice(0, 30).map((b) => ({
            id: b.id ?? b.label,
            label: b.label,
            value: b.value,
            category: b.category,
          })),
          valueLabel: (chartData.value_label as string) ?? "Value",
          layout: "horizontal",
        });
        continue;
      }

      // Scatter (points with x/y)
      const points = chartData.points as Array<{ x: number; y: number; label?: string; category?: string }> | undefined;
      if (points && points.length >= 2) {
        // Derive axis labels from chart_type when backend doesn't provide them
        let xLabel = chartData.x_label as string | undefined;
        let yLabel = chartData.y_label as string | undefined;
        if (!xLabel || !yLabel) {
          const ct = chartType ?? "";
          if (ct.includes("pred_vs_actual") || ct.includes("predicted_vs_actual")) {
            xLabel ??= "Actual";
            yLabel ??= "Predicted";
          } else if (ct.includes("residual")) {
            xLabel ??= "Predicted";
            yLabel ??= "Residual";
          } else {
            xLabel ??= "X";
            yLabel ??= "Y";
          }
        }
        specs.push({
          type: "scatter_plot", toolCallIndex, title,
          data: points.slice(0, 500),
          xLabel,
          yLabel,
          regressionLine: chartData.regression as { slope: number; intercept: number; r_squared: number } | undefined,
        });
        continue;
      }
    } catch {
      continue;
    }
  }

  return specs;
}

// ---------------------------------------------------------------------------
// Run-tool explore generators (read from output.data)
// ---------------------------------------------------------------------------

/** Helper: unwrap RunResult → data */
function runData(output: unknown): Record<string, unknown> | null {
  const out = output as Record<string, unknown>;
  return (out?.data as Record<string, unknown>) ?? null;
}

function genRunExploreNeighbors(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const data = runData(output);
  if (!data) return null;

  const results = data.results as Record<string, {
    count: number;
    top: Array<{ type: string; id: string; label: string; score?: number }>;
    edgeType: string;
    scoreField?: string;
  }> | undefined;
  if (!results) return null;

  // Pick the first branch with ≥3 scored entities
  for (const [intent, branch] of Object.entries(results)) {
    if (!branch.top?.length || branch.top.length < 3) continue;
    const hasScores = branch.top.some((n) => n.score != null && n.score > 0);
    if (!hasScores) continue;

    const seeds = data.resolved_seeds as Array<{ label?: string }> | undefined;
    const seedLabel = seeds?.[0]?.label ?? "entity";

    return {
      type: "bar_chart",
      toolCallIndex,
      title: `${intent} of ${seedLabel}`,
      data: branch.top.slice(0, 20).map((n) => ({
        id: n.id,
        label: n.label,
        value: n.score ?? 0,
        category: n.type,
      })),
      valueLabel: branch.scoreField ?? "Score",
      layout: "horizontal",
    };
  }
  return null;
}

function genRunExploreCompare(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const data = runData(output);
  if (!data) return null;

  const entities = data.entities as Array<{ type: string; id: string; label: string }> | undefined;
  const shared = data.shared as Array<{
    entity: { type: string; id: string; label: string };
    sharedBy: string[];
    score?: number;
  }> | undefined;

  if (!entities || entities.length < 2 || !shared || shared.length < 2) return null;

  const labels = entities.map((e) => e.label).join(" vs ");

  return {
    type: "bar_chart",
    toolCallIndex,
    title: `Shared neighbors: ${labels}`,
    data: shared.slice(0, 20).map((s) => ({
      id: s.entity.id,
      label: s.entity.label,
      value: s.score ?? s.sharedBy.length,
      category: s.entity.type,
    })),
    valueLabel: "Score",
    layout: "horizontal",
  };
}

function genRunExploreEnrich(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): EnrichmentVizSpec | null {
  const data = runData(output);
  if (!data) return null;

  // Handle both standalone enrich (_mode: "enrich" → data.enriched)
  // and auto-enrichment embedded in neighbors (_mode: "neighbors" → data.enrichment.enriched)
  let enriched: Array<Record<string, unknown>> | undefined;
  if (Array.isArray(data.enriched)) {
    enriched = data.enriched;
  } else {
    const nested = data.enrichment as { enriched?: unknown[] } | undefined;
    if (Array.isArray(nested?.enriched)) {
      enriched = nested.enriched as Array<Record<string, unknown>>;
    }
  }

  if (!enriched || enriched.length < 2) return null;

  return {
    type: "enrichment_plot",
    toolCallIndex,
    title: "Pathway & term enrichment",
    data: enriched.slice(0, 20).map((e) => {
      const entity = e.entity as { id: string; label: string } | undefined;
      // overlappingEntities can be string[] (standalone enrich) or object[] (auto-enrichment)
      const rawOverlap = (e.overlappingEntities ?? e.overlappingGenes ?? []) as Array<string | { label?: string }>;
      const genes = rawOverlap.slice(0, 10).map((g) =>
        typeof g === "string" ? g : (g.label ?? "?"),
      );
      return {
        id: entity?.id ?? "?",
        label: entity?.label ?? "?",
        negLogAdjP: -Math.log10(Math.max(e.adjustedPValue as number ?? 1, 1e-300)),
        foldEnrichment: (e.foldEnrichment as number) ?? 0,
        overlap: (e.overlap as number) ?? 0,
        overlappingGenes: genes,
      };
    }),
  };
}

function genRunExploreSimilar(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const data = runData(output);
  if (!data) return null;

  const seed = data.seed as { label?: string } | undefined;
  const similar = data.similar as Array<{
    entity: { type: string; id: string; label: string };
    score: number;
  }> | undefined;

  if (!similar || similar.length < 3) return null;

  return {
    type: "bar_chart",
    toolCallIndex,
    title: `Entities similar to ${seed?.label ?? "seed"}`,
    data: similar.slice(0, 20).map((s) => ({
      id: s.entity.id,
      label: s.entity.label,
      value: s.score,
      category: s.entity.type,
    })),
    valueLabel: "Similarity",
    layout: "horizontal",
  };
}

function genRunExploreAggregate(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | StatCardVizSpec | null {
  const data = runData(output);
  if (!data) return null;

  const seed = data.seed as { label?: string } | undefined;
  const buckets = data.buckets as Array<{ key: string; value: number }> | undefined;
  const value = data.value as number | undefined;
  const metric = data.metric as string | undefined;
  const edgeType = data.edgeType as string | undefined;

  if (buckets && buckets.length >= 2) {
    return {
      type: "bar_chart",
      toolCallIndex,
      title: `${metric ?? "Aggregate"}: ${edgeType ?? "edges"} of ${seed?.label ?? "entity"}`,
      data: buckets.slice(0, 20).map((b) => ({
        id: b.key,
        label: b.key,
        value: b.value,
      })),
      valueLabel: metric ?? "Value",
      layout: "horizontal",
    };
  }

  if (value != null) {
    return {
      type: "stat_card",
      toolCallIndex,
      title: `${seed?.label ?? "Entity"} aggregation`,
      stats: [{ label: `${metric ?? "Value"} (${edgeType ?? "edges"})`, value }],
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Run-tool traverse generators
// ---------------------------------------------------------------------------

function genRunTraverseChain(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): BarChartVizSpec | null {
  const data = runData(output);
  if (!data) return null;

  const seed = data.seed as { label?: string } | undefined;
  const steps = data.steps as Array<{
    intent: string;
    edgeType: string;
    scoreField?: string;
    count: number;
    top: Array<{ type: string; id: string; label: string; score?: number }>;
  }> | undefined;

  if (!steps?.length) return null;

  // Show the last step with scored results — that's the "answer"
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (!step.top?.length || step.top.length < 2) continue;
    const hasScores = step.top.some((n) => n.score != null && n.score > 0);
    if (!hasScores) continue;

    const hops = steps.map((s) => s.intent).join(" → ");

    return {
      type: "bar_chart",
      toolCallIndex,
      title: `${seed?.label ?? "seed"} → ${hops}`,
      data: step.top.slice(0, 20).map((n) => ({
        id: n.id,
        label: n.label,
        value: n.score ?? 0,
        category: n.type,
      })),
      valueLabel: step.scoreField ?? "Score",
      layout: "horizontal",
    };
  }

  return null;
}

function genRunTraversePaths(
  output: unknown,
  _input: Record<string, unknown>,
  toolCallIndex: number,
): NetworkVizSpec | null {
  const data = runData(output);
  if (!data) return null;

  const paths = data.paths as Array<{
    rank: number;
    length: number;
    pathText: string;
    nodes: Array<{ type: string; id: string; label: string }>;
  }> | undefined;

  if (!paths || paths.length < 1) return null;

  const from = data.from as string | undefined;
  const to = data.to as string | undefined;

  const nodeMap = new Map<string, { id: string; label: string; type: string }>();
  const edgeSet = new Set<string>();
  const edges: NetworkVizSpec["edges"] = [];

  const seedIds = new Set<string>();
  if (from) {
    const id = from.includes(":") ? from.split(":").slice(1).join(":") : from;
    seedIds.add(id);
  }
  if (to) {
    const id = to.includes(":") ? to.split(":").slice(1).join(":") : to;
    seedIds.add(id);
  }

  for (const path of paths.slice(0, 5)) {
    for (const node of path.nodes) {
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, { id: node.id, label: node.label, type: node.type });
      }
    }
    for (let i = 0; i < path.nodes.length - 1; i++) {
      const src = path.nodes[i];
      const tgt = path.nodes[i + 1];
      const key = `${src.id}->${tgt.id}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: src.id, target: tgt.id, type: "path_edge" });
      }
    }
  }

  const nodes = [...nodeMap.values()].slice(0, 50);
  if (nodes.length < 2) return null;

  return {
    type: "network",
    toolCallIndex,
    title: `Paths: ${from ?? "source"} → ${to ?? "target"}`,
    nodes: nodes.map((n) => ({ ...n, isSeed: seedIds.has(n.id) })),
    edges: edges.slice(0, 100),
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
  analyzeCohort: [genAnalyzeCohortGroupby, genAnalyzeCohortCorrelation],
  getGwasAssociations: [genGwasAssociations],
  variantBatchSummary: [genVariantBatchSummary],
  getGeneVariantStats: [genGeneVariantStats],
  runAnalytics: [genAnalyticsStatCard, genAnalyticsScatter, genAnalyticsQQ, genAnalyticsBar, genAnalyticsHeatmap],
  // run_analytics is handled by generateRunAnalyticsAllSpecs (shape-driven, multi-chart)
  // — see special case in generateVizSpecs below
  // Run tool — explore modes (collect ALL matches: protein domains + chart)
  run_explore: [
    genProteinDomains,
    genRunExploreNeighbors,
    genRunExploreCompare,
    genRunExploreEnrich,
    genRunExploreSimilar,
    genRunExploreAggregate,
  ],
  // Run tool — traverse modes
  run_traverse: [genRunTraverseChain, genRunTraversePaths],
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

  // Run analytics: shape-driven multi-chart generator (handles ALL charts)
  if (resolved === "run_analytics") {
    try {
      return generateRunAnalyticsAllSpecs(output, input, toolCallIndex);
    } catch {
      return [];
    }
  }

  const generators = GENERATOR_REGISTRY[resolved];
  if (!generators) return [];

  // For runAnalytics and run_explore, collect ALL matching specs
  // (e.g. protein domains + bar chart, or stat card + scatter)
  if (resolved === "runAnalytics" || resolved === "run_explore") {
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
