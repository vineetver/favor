"use client";

import type { Gene } from "@features/gene/types";
import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import { DimensionSelector } from "@shared/components/ui/data-surface/dimension-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ChemicalProbesOverviewProps {
  probes?: Gene["opentargets"]["chemical_probes"] | null;
  geneSymbol?: string | null;
  className?: string;
}

type ChemicalProbe = NonNullable<
  Gene["opentargets"]["chemical_probes"]
>[number];

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(1);
}

function getProbeKey(probe: ChemicalProbe) {
  return `${probe.id || "probe"}::${probe.drugId || "drug"}`;
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const clamped = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-body-sm text-subtle">{label}</div>
      <div className="flex-1">
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full bg-primary/70"
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
      <div className="w-14 text-right text-body-sm text-body">
        {formatScore(value)}
      </div>
    </div>
  );
}

function QualityBadge({ probe }: { probe: ChemicalProbe }) {
  const isHigh = probe.isHighQuality;
  const isCalculated = probe.origin?.includes("calculated");

  const label = isHigh ? "High" : isCalculated ? "Calc" : "Standard";
  const className = isHigh
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isCalculated
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
        className,
      )}
    >
      {label}
    </span>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
      {children}
    </span>
  );
}

export function ChemicalProbesOverview({
  probes,
  geneSymbol,
  className,
}: ChemicalProbesOverviewProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState("all");
  const [mechanismFilter, setMechanismFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState("all");

  const sortedProbes = useMemo(() => {
    return [...(probes ?? [])].sort((a, b) => {
      const av = a.probesDrugsScore ?? -1;
      const bv = b.probesDrugsScore ?? -1;
      if (av === bv) return (a.id || "").localeCompare(b.id || "");
      return bv - av;
    });
  }, [probes]);

  const mechanismOptions = useMemo(() => {
    const items = new Set<string>();
    probes?.forEach((probe) => {
      probe.mechanismOfAction?.forEach((item) => items.add(item));
    });

    return [{ value: "all", label: "All" }].concat(
      Array.from(items)
        .sort((a, b) => a.localeCompare(b))
        .map((item) => ({ value: item, label: item })),
    );
  }, [probes]);

  const originOptions = useMemo(() => {
    const items = new Set<string>();
    probes?.forEach((probe) => {
      probe.origin?.forEach((item) => items.add(item));
    });

    return [{ value: "all", label: "All" }].concat(
      Array.from(items)
        .sort((a, b) => a.localeCompare(b))
        .map((item) => ({ value: item, label: item })),
    );
  }, [probes]);

  const qualityOptions = [
    { value: "all", label: "All" },
    { value: "high", label: "High" },
    { value: "calc", label: "Calculated" },
    { value: "standard", label: "Standard" },
  ];

  const filteredProbes = useMemo(() => {
    return sortedProbes.filter((probe) => {
      const matchesQuality =
        qualityFilter === "all" ||
        (qualityFilter === "high" && probe.isHighQuality) ||
        (qualityFilter === "calc" && probe.origin?.includes("calculated")) ||
        (qualityFilter === "standard" &&
          !probe.isHighQuality &&
          !probe.origin?.includes("calculated"));

      const matchesMechanism =
        mechanismFilter === "all" ||
        probe.mechanismOfAction?.includes(mechanismFilter);

      const matchesOrigin =
        originFilter === "all" || probe.origin?.includes(originFilter);

      return matchesQuality && matchesMechanism && matchesOrigin;
    });
  }, [mechanismFilter, originFilter, qualityFilter, sortedProbes]);

  const topProbes = useMemo(
    () => filteredProbes.slice(0, 3),
    [filteredProbes],
  );

  const scoreAverages = useMemo(() => {
    const takeAverage = (values: Array<number | null | undefined>) => {
      const valid = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
      if (valid.length === 0) return null;
      const total = valid.reduce((sum, value) => sum + value, 0);
      return total / valid.length;
    };

    return {
      probesDrugsScore: takeAverage(filteredProbes.map((probe) => probe.probesDrugsScore)),
      probeMinerScore: takeAverage(filteredProbes.map((probe) => probe.probeMinerScore)),
      scoreInCells: takeAverage(filteredProbes.map((probe) => probe.scoreInCells)),
      scoreInOrganisms: takeAverage(filteredProbes.map((probe) => probe.scoreInOrganisms)),
    };
  }, [filteredProbes]);

  const sources = useMemo(() => {
    const names = new Set<string>();
    probes?.forEach((probe) => {
      probe.urls?.forEach((url) => {
        if (url?.niceName) names.add(url.niceName);
      });
    });

    if (names.size === 0) return "Open Targets";
    return `Open Targets / ${Array.from(names).join(" / ")}`;
  }, [probes]);

  useEffect(() => {
    if (!filteredProbes.length) {
      setSelectedKey(null);
      return;
    }

    if (!selectedKey) {
      setSelectedKey(getProbeKey(filteredProbes[0]));
      return;
    }

    const exists = filteredProbes.some((probe) => getProbeKey(probe) === selectedKey);
    if (!exists) {
      setSelectedKey(getProbeKey(filteredProbes[0]));
    }
  }, [filteredProbes, selectedKey]);

  const selected = useMemo(() => {
    if (!filteredProbes.length) return null;

    return (
      filteredProbes.find((probe) => getProbeKey(probe) === selectedKey) ??
      filteredProbes[0]
    );
  }, [filteredProbes, selectedKey]);

  if (!probes || probes.length === 0) {
    return (
      <NoDataState
        categoryName="Chemical Probes"
        description="No chemical probe data is available for this gene."
      />
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-label text-subtle">
          Chemical Probes Overview{geneSymbol ? ` (${geneSymbol})` : ""}
        </div>
        <div className="text-body-sm text-subtle">
          Source: <span className="text-body">{sources}</span>
        </div>
      </div>

      <Card className="border border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="text-label text-subtle">Top Probes & Scores</div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="text-body-sm text-subtle">Top probes by P&amp;D score</div>
            {topProbes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-body-sm text-body">
                {topProbes.map((probe, index) => (
                  <span key={getProbeKey(probe)} className="inline-flex items-center gap-2">
                    {index > 0 && <span className="text-slate-300">•</span>}
                    <span className="font-medium text-heading">{probe.id || "—"}</span>
                    <span className="text-subtle">({formatScore(probe.probesDrugsScore)})</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-body-sm text-subtle">No probes match your filters.</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-body-sm text-subtle">Score distributions</div>
            <div className="space-y-2">
              <ScoreBar label="P&amp;D score" value={scoreAverages.probesDrugsScore} />
              <ScoreBar label="ProbeMiner" value={scoreAverages.probeMinerScore} />
              <ScoreBar label="Cells score" value={scoreAverages.scoreInCells} />
              <ScoreBar label="Organisms" value={scoreAverages.scoreInOrganisms} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 py-0 gap-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-start gap-4 px-6 py-3 bg-slate-50/50 border-b border-slate-200">
          <DimensionSelector
            label="Quality"
            options={qualityOptions}
            value={qualityFilter}
            onChange={setQualityFilter}
            presentation="segmented"
          />
          <DimensionSelector
            label="Mechanism"
            options={mechanismOptions}
            value={mechanismFilter}
            onChange={setMechanismFilter}
          />
          <DimensionSelector
            label="Origin"
            options={originOptions}
            value={originFilter}
            onChange={setOriginFilter}
          />
        </div>
      </Card>

      <Card className="border border-slate-200 py-0 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <CardHeader className="py-4 border-b border-slate-200">
              <div className="text-label text-subtle">Probe List</div>
            </CardHeader>
            <CardContent className="px-0 py-0">
              <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-200">
                {filteredProbes.length === 0 && (
                  <div className="px-6 py-8 text-body-sm text-subtle">
                    No probes match your filters.
                  </div>
                )}
                {filteredProbes.map((probe) => {
                  const key = getProbeKey(probe);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={cn(
                        "w-full px-6 py-3 text-left transition-colors",
                        "hover:bg-slate-50",
                        selectedKey === key && "bg-primary/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-heading">
                            {probe.id || "—"}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <QualityBadge probe={probe} />
                            {probe.mechanismOfAction?.map((item) => (
                              <Chip key={`${key}-${item}`}>{item}</Chip>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-body-sm text-subtle space-y-1">
                          <div>P&amp;D {formatScore(probe.probesDrugsScore)}</div>
                          {probe.probeMinerScore != null && (
                            <div>PM {formatScore(probe.probeMinerScore)}</div>
                          )}
                          <div>Cells {formatScore(probe.scoreInCells)}</div>
                          <div>Org {formatScore(probe.scoreInOrganisms)}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </div>

          <div>
            <CardHeader className="py-4 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-label text-subtle">Inspector</div>
                <div className="text-body-sm text-subtle">
                  {selected?.id ? `Selected: ${selected.id}` : "No selection"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 py-5">
              {!selected && (
                <div className="text-body-sm text-subtle">
                  Select a probe to inspect details.
                </div>
              )}

              {selected && (
                <>
                  <div className="flex flex-wrap items-center gap-4">
                    <QualityBadge probe={selected} />
                    {selected.origin?.map((item) => (
                      <Chip key={`origin-${item}`}>{item}</Chip>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-body-sm text-body">
                    <div>
                      <span className="text-subtle">Target ID:</span>{" "}
                      <span className="text-data">{selected.targetFromSourceId || "—"}</span>
                    </div>
                    <div>
                      <span className="text-subtle">Drug ID:</span>{" "}
                      <span className="text-data">{selected.drugId || "—"}</span>
                    </div>
                    <div>
                      <span className="text-subtle">Control:</span>{" "}
                      <span className="text-body">{selected.control || "—"}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-label text-subtle">Score Snapshot</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-label text-subtle">Metric</TableHead>
                          <TableHead className="text-label text-subtle">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-body-sm text-body">P&amp;D score</TableCell>
                          <TableCell className="text-body-sm text-heading">
                            {formatScore(selected.probesDrugsScore)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-body-sm text-body">ProbeMiner</TableCell>
                          <TableCell className="text-body-sm text-heading">
                            {formatScore(selected.probeMinerScore)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-body-sm text-body">Cells score</TableCell>
                          <TableCell className="text-body-sm text-heading">
                            {formatScore(selected.scoreInCells)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-body-sm text-body">Organisms score</TableCell>
                          <TableCell className="text-body-sm text-heading">
                            {formatScore(selected.scoreInOrganisms)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="space-y-3">
                    <div className="text-label text-subtle">Mechanism of Action</div>
                    {selected.mechanismOfAction && selected.mechanismOfAction.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selected.mechanismOfAction.map((item) => (
                          <Chip key={`moa-${item}`}>{item}</Chip>
                        ))}
                      </div>
                    ) : (
                      <div className="text-body-sm text-subtle">—</div>
                    )}
                  </div>

                  {selected.urls && selected.urls.some((link) => link.url) && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                      {selected.urls
                        .filter((link) => Boolean(link.url))
                        .map((link, index) => (
                          <Button key={`${link.niceName}-${index}`} variant="outline" size="sm" asChild>
                            <a
                              href={link.url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {link.niceName || "Source"}
                            </a>
                          </Button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
}
