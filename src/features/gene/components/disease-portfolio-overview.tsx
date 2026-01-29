"use client";

import { cn } from "@infra/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import { ScopeBar } from "@shared/components/ui/data-surface/scope-bar";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { Button } from "@shared/components/ui/button";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface DiseasePortfolioOverviewProps {
  relations?: unknown;
  edges?: unknown;
  geneId: string;
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
};

const SCORE_THRESHOLDS = [
  { value: "all", label: "All", min: null },
  { value: "0.2", label: "≥ 0.2", min: 0.2 },
  { value: "0.4", label: "≥ 0.4", min: 0.4 },
  { value: "0.6", label: "≥ 0.6", min: 0.6 },
  { value: "0.8", label: "≥ 0.8", min: 0.8 },
];

function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
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

function extractDiseaseEdges(relations: unknown, edges?: unknown): DiseaseEdge[] {
  const source = relations ?? edges;
  if (!source) return [];

  let list: any[] = [];

  if (Array.isArray(source)) {
    const direct = source.filter(
      (edge) =>
        edge?.type === "IMPLICATED_IN" || edge?.edge_type === "IMPLICATED_IN",
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
      record.IMPLICATED_IN ||
      record.implicated_in ||
      record.Implicated_in;
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
        link?.props?.score ??
        link?.score ??
        edge?.score ??
        edge?.properties?.score ??
        edge?.attributes?.score ??
        edge?.meta?.score ??
        null;
      const evidenceCount =
        link?.props?.evidenceCount ??
        link?.evidenceCount ??
        edge?.evidenceCount ??
        null;
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
          toStringList(link?.props?.evidenceTypes ?? link?.evidenceTypes)
            .concat(toStringList(edge?.evidence_types ?? edge?.evidenceTypes))
            .concat(toStringList(edge?.evidence))
            .concat(toStringList(edge?.evidence_summary)),
        ),
      );

      return {
        id: String(id),
        label: String(label),
        score: typeof score === "number" ? score : null,
        source: String(source),
        evidence,
        evidenceCount: typeof evidenceCount === "number" ? evidenceCount : null,
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
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const diseases = useMemo(
    () => extractDiseaseEdges(relations, edges),
    [relations, edges],
  );

  const sourceOptions = useMemo(() => {
    const sources = Array.from(new Set(diseases.map((item) => item.source)));
    return [{ value: "all", label: "All" }].concat(
      sources.map((source) => ({ value: source, label: source })),
    );
  }, [diseases]);

  const dimensions = useMemo<DimensionConfig[]>(
    () => [
      {
        label: "Score",
        value: scoreFilter,
        onChange: setScoreFilter,
        options: SCORE_THRESHOLDS.map(({ value, label }) => ({ value, label })),
      },
      {
        label: "Source",
        value: sourceFilter,
        onChange: setSourceFilter,
        options: sourceOptions,
      },
    ],
    [scoreFilter, sourceFilter, sourceOptions],
  );

  const filtered = useMemo(() => {
    return diseases.filter((disease) => {
      const min = SCORE_THRESHOLDS.find((opt) => opt.value === scoreFilter)?.min ?? null;
      const matchesScore = min === null || (disease.score ?? -1) >= min;
      const matchesSource =
        sourceFilter === "all" || disease.source === sourceFilter;
      return matchesScore && matchesSource;
    });
  }, [diseases, scoreFilter, sourceFilter]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return filtered[0] ?? null;
    return filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  if (!diseases.length) {
    return (
      <NoDataState
        categoryName="Disease Portfolio"
        description="No disease associations are available for this gene."
      />
    );
  }

  return (
    <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-slate-200 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-label text-subtle">
              Disease Portfolio (IMPLICATED_IN){geneSymbol ? ` (${geneSymbol})` : ""}
            </CardTitle>
            <div className="text-body-sm text-subtle">
              Ranked disease associations with evidence summary
            </div>
          </div>
          <div className="text-body-sm text-subtle">
            Source: <span className="text-body">Open Targets</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card className="border border-slate-200 py-0 gap-0 overflow-hidden">
          <ScopeBar dimensions={dimensions} />
        </Card>

        <Card className="border border-slate-200 py-0 gap-0 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr]">
            <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
              <CardHeader className="py-4 border-b border-slate-200">
                <div className="text-label text-subtle">Diseases (ranked)</div>
              </CardHeader>
              <CardContent className="px-0 py-0">
                <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-200">
                  {filtered.length === 0 && (
                    <div className="px-6 py-8 text-body-sm text-subtle">
                      No diseases match your filters.
                    </div>
                  )}
                  {filtered.map((disease) => (
                    <button
                      key={disease.id}
                      type="button"
                      onClick={() => setSelectedId(disease.id)}
                      className={cn(
                        "w-full px-6 py-3 text-left transition-colors",
                        "hover:bg-slate-50",
                        selectedId === disease.id && "bg-primary/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-heading">
                          {disease.label}
                        </div>
                        <div className="text-body-sm text-subtle">
                          {formatScore(disease.score)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </div>

            <div>
              <CardHeader className="py-4 border-b border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-label text-subtle">Inspector</div>
                  <div className="text-body-sm text-subtle">
                    {selected ? "Selected disease" : "No selection"}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 py-5">
                {!selected && (
                  <div className="text-body-sm text-subtle">
                    Select a disease to inspect details.
                  </div>
                )}

                {selected && (
                  <>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-heading">
                        {selected.label}
                      </div>
                      <div className="text-body-sm text-subtle">
                        Score: <span className="text-body">{formatScore(selected.score)}</span>
                        <span className="text-subtle"> • </span>
                        Source: <span className="text-body">{selected.source}</span>
                        {selected.evidenceCount ? (
                          <>
                            <span className="text-subtle"> • </span>
                            Evidence: <span className="text-body">{selected.evidenceCount}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-label text-subtle">Evidence</div>
                      {selected.evidence.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selected.evidence.map((item) => (
                            <span
                              key={`${selected.id}-${item}`}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-caption font-medium"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : selected.evidenceCount ? (
                        <div className="text-body-sm text-subtle">
                          {selected.evidenceCount} evidence items reported.
                        </div>
                      ) : (
                        <div className="text-body-sm text-subtle">No evidence summary available.</div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/hg38/gene/${encodeURIComponent(geneId)}/disease-and-therapeutics/evidence-command-center`}
                          className="inline-flex items-center gap-2"
                        >
                          View in Evidence Command Center
                        </Link>
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </div>
          </div>
        </Card>
      </CardContent>
    </Card>
  );
}
