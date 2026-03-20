"use client";

import { cn } from "@infra/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/components/ui/select";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Check, Layers } from "lucide-react";
import type { EnrichmentAnalysis, ExportableTable } from "../types";

// ============================================================================
// Constants
// ============================================================================

const TISSUE_OPTIONS = [
  "Adipose",
  "Blood",
  "Brain",
  "Breast",
  "Colon",
  "Heart",
  "Kidney",
  "Liver",
  "Lung",
  "Muscle",
  "Ovary",
  "Pancreas",
  "Prostate",
  "Skin",
  "Stomach",
  "Testis",
  "Thyroid",
];

// ============================================================================
// Sub-components
// ============================================================================

function ToggleCard({
  label,
  description,
  selected,
  onToggle,
  disabled,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={disabled ? undefined : onToggle}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle();
        }
      }}
      className={cn(
        "relative flex flex-col gap-1 p-3.5 rounded-xl border text-left transition-all cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/30 hover:bg-accent/50",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div
        className={cn(
          "absolute top-3 right-3 flex h-4.5 w-4.5 items-center justify-center rounded transition-all",
          selected
            ? "bg-primary text-white"
            : "border border-border bg-background",
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </div>

      <p className="text-sm font-medium text-foreground leading-tight pr-6">
        {label}
      </p>

      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface EnrichmentPickerProps {
  analyses: EnrichmentAnalysis[];
  tables: ExportableTable[];
  isLoading: boolean;
  selectedAnalyses: Set<string>;
  selectedTables: Set<string>;
  onToggleAnalysis: (name: string) => void;
  onToggleTable: (table: string) => void;
  tissue: string;
  onTissueChange: (tissue: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EnrichmentPicker({
  analyses,
  tables,
  isLoading,
  selectedAnalyses,
  selectedTables,
  onToggleAnalysis,
  onToggleTable,
  tissue,
  onTissueChange,
  disabled,
  className,
}: EnrichmentPickerProps) {
  const hasTissueAwareSelected = tables.some(
    (t) => selectedTables.has(t.table) && t.tissue_aware,
  );
  const totalSelected = selectedAnalyses.size + selectedTables.size;

  if (!isLoading && analyses.length === 0 && tables.length === 0) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Enrichment
          </h3>
          <span className="text-xs text-muted-foreground">optional</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Add analyses and data exports to your results
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Analyses */}
          {analyses.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Analyses
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {analyses.map((a) => (
                  <ToggleCard
                    key={a.name}
                    label={a.label}
                    description={a.description}
                    selected={selectedAnalyses.has(a.name)}
                    onToggle={() => onToggleAnalysis(a.name)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Exportable tables */}
          {tables.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Data Exports
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tables.map((t) => (
                  <ToggleCard
                    key={t.table}
                    label={t.label}
                    selected={selectedTables.has(t.table)}
                    onToggle={() => onToggleTable(t.table)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tissue selector */}
      {hasTissueAwareSelected && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">Tissue group</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Filters tissue-specific exports
            </p>
          </div>
          <Select
            value={tissue}
            onValueChange={onTissueChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-40 ml-auto">
              <SelectValue placeholder="All tissues" />
            </SelectTrigger>
            <SelectContent>
              {TISSUE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary */}
      {totalSelected > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalSelected} selected
          {hasTissueAwareSelected && !tissue && (
            <span className="text-amber-600 ml-1">— tissue recommended</span>
          )}
        </p>
      )}
    </div>
  );
}
