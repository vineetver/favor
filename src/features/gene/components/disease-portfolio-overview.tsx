"use client";

import { cn } from "@infra/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import { ExternalLink } from "@shared/components/ui/external-link";
import { Input } from "@shared/components/ui/input";
import { ScopeBar } from "@shared/components/ui/data-surface/scope-bar";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/** Maps graph edge types to their data source and a brief explanation */
const EVIDENCE_SOURCE_INFO: Record<string, { label: string; tip: string }> = {
  ASSOCIATED_WITH_DISEASE: { label: "OpenTargets", tip: "Integrated association score from the Open Targets Platform combining genetic, somatic, drug, and literature evidence" },
  CURATED_FOR: { label: "ClinGen", tip: "Expert-curated gene–disease validity classification from ClinGen" },
  CAUSES: { label: "DDG2P", tip: "Developmental disorder gene-to-phenotype mapping from DECIPHER" },
  CIVIC_EVIDENCED_FOR: { label: "CIViC", tip: "Clinical interpretation of variants relevant to this disease from CIViC" },
  PGX_ASSOCIATED: { label: "PharmGKB", tip: "Pharmacogenomic gene–disease relationship from PharmGKB" },
  THERAPEUTIC_TARGET_IN: { label: "TTD", tip: "Therapeutic target information from the Therapeutic Target Database" },
  SCORED_FOR_DISEASE: { label: "AbbVie", tip: "Genetic evidence score for this gene–disease pair from AbbVie" },
  BIOMARKER_FOR: { label: "TTD Biomarker", tip: "Gene product is a biomarker for this disease (Therapeutic Target Database)" },
  INHERITED_CAUSE_OF: { label: "Orphanet", tip: "Inherited gene–disease relationship from the Orphanet rare-disease database" },
  ASSERTED_FOR_DISEASE: { label: "CIViC Assertion", tip: "Clinically reviewed assertion about this gene–disease link from CIViC" },
};

interface DiseasePortfolioOverviewProps {
  relations?: unknown;
  edges?: unknown;
  geneId?: string;
  geneSymbol?: string | null;
  className?: string;
}

type DiseaseEdge = {
  id: string;
  label: string;
  score: number | null;
  source: string;
  evidence: string[];
  evidenceCount?: number | null;
  evidenceBreakdown?: Array<{ label: string; count: number }>;
  tags?: string[];
  description?: string | null;
  parents?: string[];
  ancestors?: string[];
  synonyms?: string[];
  therapeuticAreas?: string[];
};

const SCORE_THRESHOLDS = [
  { value: "all", label: "All", min: null },
  { value: "0.2", label: ">= 0.2", min: 0.2 },
  { value: "0.4", label: ">= 0.4", min: 0.4 },
  { value: "0.6", label: ">= 0.6", min: 0.6 },
  { value: "0.8", label: ">= 0.8", min: 0.8 },
];

const THERAPEUTIC_AREA_LABELS: Record<string, string> = {
  OTAR_0000017: "Immunology",
  OTAR_0000018: "Infection",
  OTAR_0000019: "Metabolic",
  OTAR_0000020: "Oncology",
  OTAR_0000021: "Cardiovascular",
  OTAR_0000022: "Endocrine",
  OTAR_0000023: "Gastroenterology",
  OTAR_0000024: "Rare Disease",
  OTAR_0000025: "Hematology",
  OTAR_0000026: "Inflammation",
  OTAR_0000027: "Musculoskeletal",
  OTAR_0000028: "Neurology",
  OTAR_0000029: "Ophthalmology",
  OTAR_0000030: "Psychiatry",
  OTAR_0000031: "Renal",
  OTAR_0000032: "Respiratory",
  OTAR_0000033: "Dermatology",
  OTAR_0000034: "Other",
};

function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return value.toFixed(2);
}

function ScoreBar({ value }: { value: number | null }) {
  const numeric = typeof value === "number" ? value : 0;
  const clamped = Math.max(0, Math.min(1, numeric));
  const percent = Math.round(clamped * 100);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-foreground w-8">{formatScore(value)}</span>
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary/60"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function EvidenceBars({
  breakdown,
}: {
  breakdown: Array<{ label: string; count: number }>;
}) {
  if (!breakdown.length) return null;
  const max = Math.max(...breakdown.map((item) => item.count), 1);

  return (
    <div className="space-y-2">
      {breakdown.map((item) => {
        const percent = Math.round((item.count / max) * 100);
        return (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-28 text-xs text-muted-foreground">{item.label}</div>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            <div className="w-20 text-right text-xs text-muted-foreground tabular-nums">
              {item.count.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function getEdgeList(value: unknown): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidate = (record.edges ?? record.items ?? record.data) as unknown;
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function toStringList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item) {
          const record = item as Record<string, unknown>;
          return (
            (record.type as string) ||
            (record.label as string) ||
            (record.name as string) ||
            (record.datasource as string) ||
            (record.source as string)
          );
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return toStringList(record.types ?? record.datasources ?? record.sources);
  }
  return [];
}

function toBreakdownList(value: unknown): Array<{ label: string; count: number }> {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const label =
          (record.label as string) ||
          (record.type as string) ||
          (record.name as string);
        const count =
          (record.count as number) ||
          (record.value as number) ||
          (record.total as number);
        if (!label || typeof count !== "number") return null;
        return { label, count };
      })
      .filter((item): item is { label: string; count: number } => Boolean(item));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([label, count]) =>
        typeof count === "number" ? { label, count } : null,
      )
      .filter((item): item is { label: string; count: number } => Boolean(item));
  }
  return [];
}

function toAreaLabel(areaId: string | undefined, labelMap: Record<string, string>) {
  if (!areaId) return "Uncategorized";
  return labelMap[areaId] ?? areaId;
}

function pickAreaId(therapeuticAreas: string[] | undefined, labelMap: Record<string, string>): string | undefined {
  if (!therapeuticAreas?.length) return undefined;
  return therapeuticAreas.find((id) => labelMap[id]) ?? therapeuticAreas[0];
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(disease|syndrome|disorder|neoplasm|carcinoma|cancer|tumor|tumour)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string) {
  return new Set(
    normalizeLabel(value)
      .split(" ")
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function sharesOntology(a: DiseaseEdge, b: DiseaseEdge) {
  const aSet = new Set([...(a.parents ?? []), ...(a.ancestors ?? [])]);
  return (b.parents ?? []).some((id) => aSet.has(id)) ||
    (b.ancestors ?? []).some((id) => aSet.has(id));
}

function isSimilarDisease(a: DiseaseEdge, b: DiseaseEdge) {
  const similarity = jaccard(tokenSet(a.label), tokenSet(b.label));
  if (similarity >= 0.85) return true;
  if (similarity >= 0.5 && sharesOntology(a, b)) return true;
  return false;
}

type DiseaseCluster = {
  id: string;
  label: string;
  representative: DiseaseEdge;
  items: DiseaseEdge[];
  area: string;
};

function clusterDiseases(diseases: DiseaseEdge[], labelMap: Record<string, string>): DiseaseCluster[] {
  const clusters: DiseaseCluster[] = [];

  diseases.forEach((disease) => {
    const match = clusters.find((cluster) =>
      isSimilarDisease(cluster.representative, disease),
    );

    if (match) {
      match.items.push(disease);
      if ((disease.score ?? -1) > (match.representative.score ?? -1)) {
        match.representative = disease;
        match.label = disease.label;
      }
      return;
    }

    const areaId = pickAreaId(disease.therapeuticAreas, labelMap);
    const area = toAreaLabel(areaId, labelMap);

    clusters.push({
      id: disease.id,
      label: disease.label,
      representative: disease,
      items: [disease],
      area,
    });
  });

  return clusters;
}

function extractDiseaseEdges(relations: unknown, edges?: unknown): DiseaseEdge[] {
  const source = relations ?? edges;
  if (!source) return [];

  let list: any[] = [];

  if (Array.isArray(source)) {
    const direct = source.filter(
      (edge) =>
        edge?.type === "ASSOCIATED_WITH_DISEASE" || edge?.edge_type === "ASSOCIATED_WITH_DISEASE",
    );
    if (direct.length > 0 && (direct[0]?.neighbor || direct[0]?.score)) {
      list = direct;
    } else {
      direct.forEach((entry) => {
        list = list.concat(getEdgeList(entry));
      });
    }
  } else if (typeof source === "object") {
    const record = source as Record<string, unknown>;
    const byType =
      record.ASSOCIATED_WITH_DISEASE ||
      record.associated_with_disease ||
      record.Associated_with_disease;
    if (byType && typeof byType === "object") {
      const byTypeRecord = byType as Record<string, unknown>;
      if (Array.isArray(byTypeRecord.rows)) {
        list = byTypeRecord.rows as any[];
      } else {
        list = getEdgeList(byType);
      }
    } else {
      list = getEdgeList(byType);
    }
    if (list.length === 0) {
      list = getEdgeList(record.edges);
    }
    if (list.length === 0) {
      list = getEdgeList(record.relations);
    }
  }

  return list
    .map((edge, index) => {
      const neighbor = edge?.neighbor ?? edge?.target ?? edge?.node ?? {};
      const link = edge?.link ?? edge?.edge ?? edge?.relation ?? edge?.props ?? {};
      const linkProps = link?.props ?? link ?? {};
      const therapeuticAreas = toStringList(
        neighbor?.therapeutic_areas ??
          neighbor?.therapeuticAreas,
      );
      const id =
        neighbor?.id ||
        edge?.neighbor_id ||
        edge?.target_id ||
        edge?.node_id ||
        edge?.id ||
        `edge-${index}`;
      const label =
        neighbor?.disease_name ||
        neighbor?.name ||
        neighbor?.label ||
        edge?.neighbor_label ||
        edge?.neighbor_name ||
        edge?.name ||
        edge?.label ||
        "Unknown disease";
      const score =
        linkProps?.overall_score ??
        linkProps?.score ??
        link?.overall_score ??
        link?.score ??
        edge?.overall_score ??
        edge?.score ??
        edge?.properties?.overall_score ??
        edge?.properties?.score ??
        edge?.attributes?.overall_score ??
        edge?.attributes?.score ??
        edge?.meta?.score ??
        null;
      const evidenceCount =
        linkProps?.evidence_count ??
        linkProps?.evidenceCount ??
        link?.evidence_count ??
        link?.evidenceCount ??
        edge?.evidence_count ??
        edge?.evidenceCount ??
        null;
      const evidenceBreakdownRaw = toBreakdownList(
        linkProps?.evidenceBreakdown ??
          linkProps?.evidence_breakdown ??
          linkProps?.evidenceCounts ??
          linkProps?.evidence_counts ??
          edge?.evidenceBreakdown ??
          edge?.evidence_breakdown ??
          edge?.evidenceCounts ??
          edge?.evidence_counts,
      );
      const evidenceBreakdown = evidenceBreakdownRaw
        .slice()
        .sort((a, b) => b.count - a.count);
      const source =
        neighbor?.source ||
        link?.source ||
        edge?.source ||
        edge?.datasource ||
        edge?.edge_source ||
        edge?.properties?.source ||
        edge?.attributes?.source ||
        "Open Targets";
      const evidence = Array.from(
        new Set(
          toStringList(linkProps?.evidenceTypes ?? link?.evidenceTypes)
            .concat(toStringList(edge?.evidence_types ?? edge?.evidenceTypes))
            .concat(toStringList(edge?.evidence))
            .concat(toStringList(edge?.evidence_summary)),
        ),
      );
      const tags = Array.from(new Set(toStringList(neighbor?.tags)));
      const description =
        typeof neighbor?.description === "string"
          ? neighbor.description
          : null;
      const parents = toStringList(neighbor?.parents);
      const ancestors = toStringList(neighbor?.ancestors);
      const synonyms = toStringList(neighbor?.synonyms);

      return {
        id: String(id),
        label: String(label),
        score: typeof score === "number" ? score : null,
        source: String(source),
        evidence,
        evidenceCount: typeof evidenceCount === "number" ? evidenceCount : null,
        evidenceBreakdown,
        tags,
        description,
        parents,
        ancestors,
        synonyms,
        therapeuticAreas,
      } satisfies DiseaseEdge;
    })
    .sort((a, b) => {
      const as = a.score ?? -1;
      const bs = b.score ?? -1;
      if (bs !== as) return bs - as;
      return a.label.localeCompare(b.label);
    });
}

export function DiseasePortfolioOverview({
  relations,
  edges,
  geneId,
  geneSymbol,
  className,
}: DiseasePortfolioOverviewProps) {
  const [scoreFilter, setScoreFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortMode, setSortMode] = useState("score-desc");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolvedAreaLabels, setResolvedAreaLabels] = useState<Record<string, string>>({});
  const [connections, setConnections] = useState<Array<{
    edgeType: string;
    label: string;
    count: number;
    edges: Array<{ fields?: Record<string, unknown> }>;
  }> | null>(null);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const connectionsAbort = useRef<AbortController | null>(null);

  const diseases = useMemo(
    () => extractDiseaseEdges(relations, edges),
    [relations, edges],
  );

  // Merge static + dynamically resolved therapeutic area labels
  const areaLabelMap = useMemo(() => ({
    ...THERAPEUTIC_AREA_LABELS,
    ...resolvedAreaLabels,
  }), [resolvedAreaLabels]);

  // Resolve unknown therapeutic area IDs to human-readable names
  useEffect(() => {
    const unknownIds = new Set<string>();
    diseases.forEach((d) => {
      d.therapeuticAreas?.forEach((id) => {
        if (id && !THERAPEUTIC_AREA_LABELS[id]) unknownIds.add(id);
      });
    });
    if (unknownIds.size === 0) return;

    const ids = Array.from(unknownIds).slice(0, 100).map((id) => ({ type: "Disease", id }));
    fetch(`${API_BASE}/entities/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ids }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const map: Record<string, string> = {};
        for (const item of data?.data?.items ?? []) {
          if (item.entity?.id && item.entity?.label) {
            map[item.entity.id] = item.entity.label;
          }
        }
        if (Object.keys(map).length > 0) {
          setResolvedAreaLabels((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
  }, [diseases]);

  // Fetch connections between gene and selected disease
  useEffect(() => {
    if (!selectedId || !geneId) {
      setConnections(null);
      return;
    }

    connectionsAbort.current?.abort();
    const controller = new AbortController();
    connectionsAbort.current = controller;
    setConnectionsLoading(true);

    fetch(`${API_BASE}/graph/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        from: { type: "Gene", id: geneId },
        to: { type: "Disease", id: selectedId },
        limitPerType: 5,
        includeReverse: false,
      }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!controller.signal.aborted) {
          setConnections(data?.data?.connections ?? null);
          setConnectionsLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setConnections(null);
          setConnectionsLoading(false);
        }
      });

    return () => controller.abort();
  }, [selectedId, geneId]);

  const areaOptions = useMemo(() => {
    const areas = Array.from(
      new Set(
        diseases.map((disease) => {
          const areaId = pickAreaId(disease.therapeuticAreas, areaLabelMap);
          return toAreaLabel(areaId, areaLabelMap);
        }),
      ),
    ).filter(Boolean);
    return [{ value: "all", label: "All" }].concat(
      areas.map((area) => ({ value: area, label: area })),
    );
  }, [diseases, areaLabelMap]);

  const dimensions = useMemo<DimensionConfig[]>(
    () => [
      {
        label: "Area",
        value: areaFilter,
        onChange: setAreaFilter,
        options: areaOptions,
      },
      {
        label: "Min score",
        value: scoreFilter,
        onChange: setScoreFilter,
        options: [
          { value: "all", label: "Any" },
          { value: "0.2", label: "0.2+" },
          { value: "0.4", label: "0.4+" },
          { value: "0.6", label: "0.6+" },
          { value: "0.8", label: "0.8+" },
        ],
      },
      {
        label: "Sort by",
        value: sortMode,
        onChange: setSortMode,
        options: [
          { value: "score-desc", label: "Score" },
          { value: "evidence-desc", label: "Evidence" },
          { value: "alpha", label: "A-Z" },
        ],
        presentation: "segmented",
      },
    ],
    [areaFilter, areaOptions, scoreFilter, sortMode],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return diseases.filter((disease) => {
      const min = SCORE_THRESHOLDS.find((opt) => opt.value === scoreFilter)?.min ?? null;
      const matchesScore = min === null || (disease.score ?? -1) >= min;
      const areaId = pickAreaId(disease.therapeuticAreas, areaLabelMap);
      const areaLabel = toAreaLabel(areaId, areaLabelMap);
      const matchesArea = areaFilter === "all" || areaLabel === areaFilter;
      const matchesSearch =
        query.length === 0 ||
        disease.label.toLowerCase().includes(query) ||
        disease.synonyms?.some((syn) => syn.toLowerCase().includes(query)) ||
        disease.description?.toLowerCase().includes(query);

      return matchesScore && matchesArea && matchesSearch;
    });
  }, [areaFilter, areaLabelMap, diseases, scoreFilter, search]);

  const clusters = useMemo(() => clusterDiseases(filtered, areaLabelMap), [filtered, areaLabelMap]);

  const sortedClusters = useMemo(() => {
    const items = [...clusters];
    if (sortMode === "alpha") {
      return items.sort((a, b) => a.label.localeCompare(b.label));
    }
    if (sortMode === "evidence-desc") {
      return items.sort((a, b) => {
        const av = a.representative.evidenceCount ?? -1;
        const bv = b.representative.evidenceCount ?? -1;
        if (bv !== av) return bv - av;
        return a.label.localeCompare(b.label);
      });
    }
    return items.sort((a, b) => {
      const av = a.representative.score ?? -1;
      const bv = b.representative.score ?? -1;
      if (bv !== av) return bv - av;
      return a.label.localeCompare(b.label);
    });
  }, [clusters, sortMode]);

  const groupedClusters = useMemo(() => {
    const map = new Map<string, DiseaseCluster[]>();
    sortedClusters.forEach((cluster) => {
      const area = cluster.area || "Uncategorized";
      if (!map.has(area)) {
        map.set(area, []);
      }
      map.get(area)?.push(cluster);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedClusters]);

  const rankedGroups = useMemo(() => {
    let rank = 1;
    return groupedClusters.map(([area, clusters]) => ({
      area,
      clusters: clusters.map((cluster) => ({
        cluster,
        rank: rank++,
      })),
    }));
  }, [groupedClusters]);

  useEffect(() => {
    if (sortedClusters.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillExists = sortedClusters.some((cluster) =>
      cluster.items.some((item) => item.id === selectedId),
    );
    if (!selectedId || !stillExists) {
      setSelectedId(sortedClusters[0]?.representative.id ?? null);
    }
  }, [sortedClusters, selectedId]);

  const selectedCluster = useMemo(() => {
    if (!selectedId) return sortedClusters[0] ?? null;
    return (
      sortedClusters.find((cluster) =>
        cluster.items.some((item) => item.id === selectedId),
      ) ?? sortedClusters[0] ?? null
    );
  }, [sortedClusters, selectedId]);

  const selected = selectedCluster?.representative ?? null;
  const inspectorTag =
    selectedCluster?.area && selectedCluster.area !== "Uncategorized"
      ? selectedCluster.area
      : selected?.tags?.[0];

  if (!diseases.length) {
    return (
      <NoDataState
        categoryName="Disease Portfolio"
        description="No disease associations are available for this gene."
      />
    );
  }

  return (
    <Card className={cn("border border-border py-0 gap-0", className)}>
      <CardHeader className="border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Disease Portfolio
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {diseases.length} disease associations from Open Targets
            </div>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <Input
              type="text"
              placeholder="Search diseases..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Filters */}
        <div className="border-b border-border bg-muted/50">
          <ScopeBar dimensions={dimensions} />
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
          {/* Disease List */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="max-h-[520px] overflow-y-auto">
              {rankedGroups.length === 0 && (
                <div className="px-6 py-8 text-xs text-muted-foreground">
                  No diseases match your filters.
                </div>
              )}
              {rankedGroups.map((group) => (
                <div key={group.area}>
                  <div className="px-6 py-2.5 border-b border-border bg-muted sticky top-0 z-10">
                    <div className="text-xs font-medium text-muted-foreground">
                      {group.area} ({group.clusters.length})
                    </div>
                  </div>
                  {group.clusters.map(({ cluster }) => {
                    const representative = cluster.representative;
                    const isSelected = selectedId
                      ? cluster.items.some((item) => item.id === selectedId)
                      : false;
                    const relatedCount = cluster.items.length - 1;

                    return (
                      <button
                        key={cluster.id}
                        type="button"
                        onClick={() => setSelectedId(representative.id)}
                        className={cn(
                          "w-full px-6 py-3 text-left transition-colors border-b border-border",
                          "hover:bg-muted",
                          isSelected && "bg-primary/5 border-l-2 border-l-primary",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">
                              {cluster.label}
                              {relatedCount > 0 && (
                                <span className="ml-1 text-muted-foreground font-normal">+{relatedCount}</span>
                              )}
                            </div>
                          </div>
                          <ScoreBar value={representative.score} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Inspector Panel */}
          <div>
            <div className="px-6 py-2.5 border-b border-border bg-muted">
              <div className="text-xs font-medium text-muted-foreground">Details</div>
            </div>
            <div className="px-6 py-6 space-y-6">
              {!selected && (
                <div className="text-xs text-muted-foreground">
                  Select a disease to view details.
                </div>
              )}

              {selected && (
                <>
                  {/* Disease Header */}
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">
                      {selected.label}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Score</span>
                        <span className="text-sm font-semibold text-foreground">{formatScore(selected.score)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Evidence</span>
                        <span className="text-sm font-semibold text-foreground">
                          {selected.evidenceCount?.toLocaleString() ?? "N/A"}
                        </span>
                      </div>
                      {inspectorTag && (
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {inspectorTag}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {selected.description && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {selected.description}
                      </div>
                    </div>
                  )}

                  {/* Evidence Sources (from connections query) */}
                  {connectionsLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                  )}
                  {!connectionsLoading && connections && connections.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Evidence Sources
                      </div>
                      <TooltipProvider delayDuration={200}>
                        <div className="flex flex-wrap gap-1.5">
                          {connections.map((conn) => {
                            const info = EVIDENCE_SOURCE_INFO[conn.edgeType];
                            const label = info?.label ?? conn.edgeType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                            return (
                              <Tooltip key={conn.edgeType}>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground cursor-default">
                                    {label}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-64">
                                  <p className="text-xs">{info?.tip ?? conn.label}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    </div>
                  )}

                  {/* Evidence Breakdown */}
                  {selected.evidenceBreakdown && selected.evidenceBreakdown.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Evidence by Type
                      </div>
                      <EvidenceBars breakdown={selected.evidenceBreakdown} />
                    </div>
                  )}

                  {/* Synonyms */}
                  {selected.synonyms && selected.synonyms.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Also known as
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selected.synonyms.slice(0, 5).join(", ")}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <ExternalLink
                      href={`https://platform.opentargets.org/disease/${encodeURIComponent(selected.id)}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View on Open Targets
                    </ExternalLink>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
