"use client";

import type { Gene } from "@features/gene/types";
import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import { Chip, LinkChip, StatusBadge, type BadgeVariant } from "@shared/components/ui/status-badge";
import { ScopeBar } from "@shared/components/ui/data-surface/scope-bar";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { ChevronDown, ChevronRight, Copy, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface SafetyLiabilitiesAccordionProps {
  liabilities?: Gene["opentargets"]["safety_liabilities"] | null;
  geneSymbol?: string | null;
  className?: string;
}

type SafetyLiability = NonNullable<
  Gene["opentargets"]["safety_liabilities"]
>[number];

type DirectionCategory = "increase" | "decrease" | "mixed" | "unknown";

const DIRECTION_META: Record<DirectionCategory, { label: string; variant: BadgeVariant }> = {
  increase: { label: "↑", variant: "positive" },
  decrease: { label: "↓", variant: "negative" },
  mixed: { label: "↔", variant: "warning" },
  unknown: { label: "•", variant: "neutral" },
};

function classifyDirection(text: string): DirectionCategory {
  const normalized = text.toLowerCase();

  if (
    normalized.includes("increase") ||
    normalized.includes("up") ||
    normalized.includes("positive") ||
    normalized.includes("elevated")
  ) {
    return "increase";
  }

  if (
    normalized.includes("decrease") ||
    normalized.includes("down") ||
    normalized.includes("negative") ||
    normalized.includes("reduced")
  ) {
    return "decrease";
  }

  return "unknown";
}

function getDirectionSummary(effects: SafetyLiability["effects"]): DirectionCategory {
  if (!effects || effects.length === 0) return "unknown";

  const directions = new Set<DirectionCategory>();
  effects.forEach((effect) => {
    if (effect.direction) {
      directions.add(classifyDirection(effect.direction));
    }
  });

  if (directions.has("increase") && directions.has("decrease")) return "mixed";
  if (directions.has("increase")) return "increase";
  if (directions.has("decrease")) return "decrease";
  return "unknown";
}

function getDirectionChips(effects: SafetyLiability["effects"]) {
  if (!effects || effects.length === 0) return ["unknown"] as DirectionCategory[];

  const chips = new Set<DirectionCategory>();
  effects.forEach((effect) => {
    if (effect.direction) {
      chips.add(classifyDirection(effect.direction));
    }
  });

  if (chips.size === 0) return ["unknown"] as DirectionCategory[];
  return Array.from(chips);
}

function parseLiterature(literature?: string | null) {
  if (!literature) return [];

  return Array.from(
    new Set(
      literature
        .split(/[,;\s]+/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function getLiabilityKey(item: SafetyLiability, index: number) {
  const base = item.eventId || item.event || "event";
  const source = item.datasource || "source";
  return `${base}::${source}::${index}`;
}

const VARIANT_TOKEN_REGEX =
  /\b\d{1,2}[_:]\d+[_:][A-Za-z,]+[_:][A-Za-z,]+\b/g;

type VariantChip = {
  chr: string;
  pos: string;
  ref: string;
  alt: string;
  key: string;
};

function extractVariantChips(text?: string | null): VariantChip[] {
  if (!text) return [];

  const matches = text.match(VARIANT_TOKEN_REGEX);
  if (!matches) return [];

  const chips: VariantChip[] = [];
  const seen = new Set<string>();

  matches
    .map((entry) => entry.replace(/[_:]/g, "_"))
    .filter(Boolean)
    .forEach((token) => {
      const parts = token.split("_");
      if (parts.length < 4) return;

      const [chr, pos, refRaw, altRaw] = parts;
      const ref = refRaw.replace(/[^A-Za-z]/g, "");
      const altParts = altRaw
        .split(",")
        .map((value) => value.replace(/[^A-Za-z]/g, ""))
        .filter(Boolean);

      if (!chr || !pos || !ref || altParts.length === 0) return;

      altParts.forEach((alt) => {
        const key = `${chr}-${pos}-${ref}-${alt}`;
        if (seen.has(key)) return;
        seen.add(key);
        chips.push({ chr, pos, ref, alt, key });
      });
    });

  return chips;
}

function formatVariantChip(chip: VariantChip) {
  return `${chip.chr}-${chip.pos}-${chip.ref}-${chip.alt}`;
}

function StudyRow({
  study,
  variantTokens,
  expanded,
  onToggle,
}: {
  study: SafetyLiability["studies"][number];
  variantTokens: VariantChip[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const rawSummary = study.description
    ? study.description.split(/[\n.]+/)[0]
    : "No summary available.";
  const summary = variantTokens.length
    ? (() => {
        const cleaned = rawSummary
          .replace(VARIANT_TOKEN_REGEX, " ")
          .replace(/\s*,\s*/g, ", ")
          .replace(/,\s*(?=,|$)/g, "")
          .replace(/:\s*,/g, ": ")
          .replace(/[,;:]\s*$/g, "")
          .replace(/:\s*$/g, "")
          .replace(/\s+/g, " ")
          .trim();
        return cleaned || "Summary unavailable.";
      })()
    : rawSummary;

  return (
    <>
      <TableRow>
        <TableCell className="text-body-sm text-heading font-medium">
          {study.name || "—"}
        </TableCell>
        <TableCell className="text-body-sm text-subtle">
          {study.type || "—"}
        </TableCell>
        <TableCell className="text-body-sm text-subtle">
          {variantTokens.length > 0
            ? `${variantTokens.length} variants`
            : "—"}
        </TableCell>
        <TableCell>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {expanded ? "Collapse" : "Expand"}
          </button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
      <TableCell colSpan={4} className="bg-slate-50/60">
        <div className="space-y-3">
          <div className="text-body-sm text-body">
            <span className="text-subtle">Summary:</span> {summary}
          </div>
          <div className="space-y-2">
            <div className="text-body-sm text-subtle">Variants</div>
            {variantTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {variantTokens.map((token) => (
                  <Chip key={token.key}>{formatVariantChip(token)}</Chip>
                ))}
              </div>
            ) : (
                  <div className="text-body-sm text-subtle">—</div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function SafetyLiabilitiesAccordion({
  liabilities,
  geneSymbol,
  className,
}: SafetyLiabilitiesAccordionProps) {
  const [datasourceFilter, setDatasourceFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [studyFilter, setStudyFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedStudies, setExpandedStudies] = useState<Record<string, boolean>>({});

  const datasourceOptions = useMemo(() => {
    const sources = Array.from(
      new Set(
        (liabilities ?? [])
          .map((item) => item.datasource)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    return [
      { value: "all", label: "All" },
      ...sources.map((source) => ({ value: source, label: source })),
    ];
  }, [liabilities]);

  const directionOptions = useMemo(() => {
    const directions = Array.from(
      new Set((liabilities ?? []).map((item) => getDirectionSummary(item.effects))),
    );

    const labels: Record<DirectionCategory, string> = {
      increase: "Increase",
      decrease: "Decrease",
      mixed: "Mixed",
      unknown: "Unknown",
    };

    return [
      { value: "all", label: "All" },
      ...directions.map((direction) => ({
        value: direction,
        label: labels[direction],
      })),
    ];
  }, [liabilities]);

  const studyOptions = [
    { value: "all", label: "All" },
    { value: "with", label: "Has studies" },
    { value: "without", label: "No studies" },
  ];

  const dimensions = useMemo<DimensionConfig[]>(
    () => [
      {
        label: "Datasource",
        options: datasourceOptions,
        value: datasourceFilter,
        onChange: setDatasourceFilter,
      },
      {
        label: "Direction",
        options: directionOptions,
        value: directionFilter,
        onChange: setDirectionFilter,
      },
      {
        label: "Has studies",
        options: studyOptions,
        value: studyFilter,
        onChange: setStudyFilter,
        presentation: "segmented",
      },
    ],
    [datasourceFilter, datasourceOptions, directionFilter, directionOptions, studyFilter],
  );

  const filteredLiabilities = useMemo(() => {
    if (!liabilities) return [];

    return liabilities
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
      const matchesDatasource =
        datasourceFilter === "all" || item.datasource === datasourceFilter;

      const summary = getDirectionSummary(item.effects);
      const matchesDirection =
        directionFilter === "all" || summary === directionFilter;

      const hasStudies = (item.studies?.length ?? 0) > 0;
      const matchesStudies =
        studyFilter === "all" ||
        (studyFilter === "with" ? hasStudies : !hasStudies);

      return (
        matchesDatasource &&
        matchesDirection &&
        matchesStudies
      );
    });
  }, [datasourceFilter, directionFilter, liabilities, studyFilter]);

  useEffect(() => {
    if (filteredLiabilities.length === 0) {
      setSelectedKey(null);
      return;
    }

    if (!selectedKey) {
      const next = filteredLiabilities[0];
      if (!next) return;
      setSelectedKey(getLiabilityKey(next.item, next.index));
      return;
    }

    const stillExists = filteredLiabilities.some(
      (entry) => getLiabilityKey(entry.item, entry.index) === selectedKey,
    );

    if (!stillExists) {
      const next = filteredLiabilities[0];
      if (!next) return;
      setSelectedKey(getLiabilityKey(next.item, next.index));
    }
  }, [filteredLiabilities, selectedKey]);

  const selected = useMemo(() => {
    if (!selectedKey) return filteredLiabilities[0]?.item ?? null;

    const matched = filteredLiabilities.find(
      (entry) => getLiabilityKey(entry.item, entry.index) === selectedKey,
    );
    return matched?.item ?? filteredLiabilities[0]?.item ?? null;
  }, [filteredLiabilities, selectedKey]);

  const selectedDirections = useMemo((): Array<{
    direction: string;
    dosing: string;
    category: DirectionCategory;
  }> => {
    if (!selected?.effects) return [];

    return selected.effects.map((effect) => {
      const category: DirectionCategory = effect.direction
        ? classifyDirection(effect.direction)
        : "unknown";

      return {
        direction: effect.direction || "Unknown",
        dosing: effect.dosing || "—",
        category,
      };
    });
  }, [selected]);

  const groupedBiosamples = useMemo(() => {
    if (!selected?.biosamples) return [];

    const map = new Map<string, string[]>();

    selected.biosamples.forEach((sample) => {
      const tissue = sample.tissueLabel || "Unknown tissue";
      const cell =
        sample.cellLabel || sample.cellFormat || sample.cellId || "Unknown cell";

      if (!map.has(tissue)) {
        map.set(tissue, []);
      }

      const list = map.get(tissue);
      if (list && !list.includes(cell)) {
        list.push(cell);
      }
    });

    return Array.from(map.entries());
  }, [selected]);

  const literature = useMemo(() => parseLiterature(selected?.literature), [selected]);

  const sourceSummary = useMemo(() => {
    const sources = datasourceOptions
      .filter((option) => option.value !== "all")
      .map((option) => option.label);

    if (sources.length === 0) return "Open Targets";
    return `Open Targets / ${sources.join(" / ")}`;
  }, [datasourceOptions]);

  if (!liabilities || liabilities.length === 0) {
    return (
      <NoDataState
        categoryName="Safety Liabilities"
        description="No safety liability events are available for this gene."
      />
    );
  }

  return (
    <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-slate-200 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-heading">
              Safety Liabilities{geneSymbol ? ` (${geneSymbol})` : ""}
            </CardTitle>
            <div className="text-xs text-subtle">
              Event-level safety signals and supporting studies
            </div>
          </div>
          <div className="text-xs text-subtle">{sourceSummary}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Bar */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <ScopeBar dimensions={dimensions} />
        </div>

        {/* Master-Detail Panel */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,360px)_1fr]">
            {/* List Panel */}
            <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="text-label text-subtle">Event Ledger</div>
              </div>
              <div>
                <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-200">
                  {filteredLiabilities.length === 0 && (
                    <div className="px-6 py-8 text-body-sm text-subtle">
                      No events match your filters.
                    </div>
                  )}
                  {filteredLiabilities.map(({ item, index }) => {
                    const key = getLiabilityKey(item, index);
                    const chips = getDirectionChips(item.effects);
                    const anchor = toSlug(
                      `${item.event || item.eventId || "event"}-${item.datasource || "source"}-${index}`,
                    );

                    return (
                      <button
                        key={key}
                        type="button"
                        id={`event-${anchor}`}
                        onClick={() => setSelectedKey(key)}
                        className={cn(
                          "w-full px-6 py-3 text-left transition-colors",
                          "hover:bg-slate-50",
                          selectedKey === key && "bg-primary/5",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-heading">
                              {item.event || "Unnamed event"}
                            </div>
                            <div className="text-body-sm text-subtle">
                              {item.datasource || "Unknown source"}
                              {item.studies?.length
                                ? ` • ${item.studies.length} studies`
                                : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {chips.map((chip) => (
                              <StatusBadge
                                key={`${key}-${chip}`}
                                variant={DIRECTION_META[chip].variant}
                              >
                                {DIRECTION_META[chip].label}
                              </StatusBadge>
                            ))}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="px-6 py-4 border-t border-slate-200">
                  <div className="text-label text-subtle mb-2">Legend</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(["increase", "decrease", "mixed"] as DirectionCategory[]).map(
                      (category) => (
                        <StatusBadge key={category} variant={DIRECTION_META[category].variant}>
                          {DIRECTION_META[category].label} {category}
                        </StatusBadge>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detail Panel */}
            <div>
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-label text-subtle">Inspector</div>
                  <div className="text-body-sm text-subtle">
                    {selected?.event ? `Selected: ${selected.event}` : "No selection"}
                  </div>
                </div>
              </div>
              <div className="px-6 py-6 space-y-6">
                {!selected && (
                  <div className="text-body-sm text-subtle">
                    Select an event to inspect details.
                  </div>
                )}

                {selected && (
                  <>
                    <div className="flex flex-wrap items-center gap-6 text-body-sm text-body">
                      <div>
                        <span className="text-subtle">Event ID:</span>{" "}
                        <span className="text-data">
                          {selected.eventId || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-subtle">Datasource:</span>{" "}
                        <span className="text-body">
                          {selected.datasource || "—"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-label text-subtle">Effects</div>
                      {selectedDirections.length === 0 ? (
                        <div className="text-body-sm text-subtle">No effects reported.</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-label text-subtle">
                                Direction
                              </TableHead>
                              <TableHead className="text-label text-subtle">
                                Dosing
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDirections.map((effect, index) => (
                              <TableRow key={`${effect.direction}-${index}`}>
                                <TableCell>
                                  <StatusBadge variant={DIRECTION_META[effect.category].variant}>
                                    {DIRECTION_META[effect.category].label} {effect.direction}
                                  </StatusBadge>
                                </TableCell>
                                <TableCell className="text-body-sm text-body">
                                  {effect.dosing}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-label text-subtle">
                        Studies ({selected.studies?.length ?? 0})
                      </div>
                      {selected.studies && selected.studies.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-label text-subtle">Study</TableHead>
                              <TableHead className="text-label text-subtle">Type</TableHead>
                              <TableHead className="text-label text-subtle">Key IDs</TableHead>
                              <TableHead className="text-label text-subtle">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selected.studies.map((study, index) => {
                              const studyKey = `${study.name || "study"}-${index}`;
                              const variants = extractVariantChips(study.description);

                              return (
                                <StudyRow
                                  key={studyKey}
                                  study={study}
                                  variantTokens={variants}
                                  expanded={Boolean(expandedStudies[studyKey])}
                                  onToggle={() =>
                                    setExpandedStudies((prev) => ({
                                      ...prev,
                                      [studyKey]: !prev[studyKey],
                                    }))
                                  }
                                />
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-body-sm text-subtle">—</div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-label text-subtle">
                        Biosamples ({selected.biosamples?.length ?? 0})
                      </div>
                      {groupedBiosamples.length > 0 ? (
                        <div className="space-y-3">
                          {groupedBiosamples.map(([tissue, cells]) => (
                            <div key={tissue} className="space-y-2">
                              <div className="text-sm font-semibold text-heading">
                                {tissue}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {cells.map((cell) => (
                                  <Chip key={`${tissue}-${cell}`}>{cell}</Chip>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-body-sm text-subtle">—</div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="text-label text-subtle">Literature</div>
                      {literature.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {literature.map((reference) => (
                            <LinkChip
                              key={reference}
                              href={`https://pubmed.ncbi.nlm.nih.gov/${reference}`}
                            >
                              PMID {reference}
                            </LinkChip>
                          ))}
                        </div>
                      ) : (
                        <div className="text-body-sm text-subtle">—</div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
                      {selected.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={selected.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2"
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                            Open source
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!selected.event && !selected.eventId) return;
                          if (!navigator?.clipboard) return;
                          const selectedIndex = filteredLiabilities.findIndex(
                            (entry) => entry.item === selected,
                          );
                          const anchor = toSlug(
                            `${selected.event || selected.eventId || "event"}-${selected.datasource || "source"}-${Math.max(
                              selectedIndex,
                              0,
                            )}`,
                          );
                          const url = `${window.location.href.split("#")[0]}#event-${anchor}`;
                          await navigator.clipboard.writeText(url);
                        }}
                        className="inline-flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy event link
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
