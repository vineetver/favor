"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Switch } from "@shared/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Mail,
  Play,
  X,
} from "lucide-react";
import { useCallback, useId, useState } from "react";
import { fetchEnrichmentOptions, fetchTissueGroups } from "../api";
import { formatNumber, getDataTypeLabel } from "../lib/format";
import type { EnrichmentConfig, TypedValidateResponse } from "../types";
import { EnrichmentPicker } from "./enrichment-pack-picker";

// ============================================================================
// Types
// ============================================================================

interface JobConfigurationProps {
  typedValidation: TypedValidateResponse;
  isTypedCohort: boolean;
  filename?: string;
  onSubmit: (config: JobConfig) => void;
  isSubmitting?: boolean;
  error?: string | null;
  className?: string;
}

export interface JobConfig {
  includeNotFound: boolean;
  email?: string;
  enrichments?: EnrichmentConfig;
}

// ============================================================================
// Main Component
// ============================================================================

export function JobConfiguration({
  typedValidation,
  isTypedCohort,
  filename,
  onSubmit,
  isSubmitting = false,
  error,
  className,
}: JobConfigurationProps) {
  const [includeNotFound, setIncludeNotFound] = useState(true);
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const switchId = useId();
  const emailId = useId();

  // Enrichment state
  const [selectedAnalyses, setSelectedAnalyses] = useState<Set<string>>(new Set());
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [tissue, setTissue] = useState("");

  // Fetch available enrichment options + tissue groups
  const { data: enrichmentData, isLoading: isLoadingEnrichment } = useQuery({
    queryKey: ["enrichment-options"],
    queryFn: fetchEnrichmentOptions,
    staleTime: 5 * 60 * 1000,
  });
  const { data: tissueGroups = [] } = useQuery({
    queryKey: ["tissue-groups"],
    queryFn: fetchTissueGroups,
    staleTime: 10 * 60 * 1000,
  });

  const toggleSet = useCallback((prev: Set<string>, key: string) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let enrichments: EnrichmentConfig | undefined;
    if (selectedAnalyses.size > 0 || selectedTables.size > 0) {
      enrichments = {
        tissue: tissue || undefined,
        analyses: Array.from(selectedAnalyses).map((name) => ({ name })),
        tables: Array.from(selectedTables).map((table) => ({ table })),
      };
    }

    onSubmit({
      includeNotFound,
      email: email.trim() || undefined,
      enrichments,
    });
  };

  const rowCount = formatNumber(typedValidation.row_count_estimate);
  const dataType = getDataTypeLabel(typedValidation.data_type);
  const columnCount = typedValidation.schema_preview.length;

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-0", className)}>
      {/* Hero — centered file summary */}
      <div className="pt-4 pb-6 text-center">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <h2 className="text-base font-semibold text-foreground">
          Ready to process
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">{filename}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {dataType}
          {" · "}~{rowCount} rows
          {isTypedCohort && ` · ${columnCount} columns mapped`}
        </p>
      </div>

      {/* Enrichment — border + padding handled inside (returns null when empty) */}
      <EnrichmentPicker
        analyses={enrichmentData?.analyses ?? []}
        tables={enrichmentData?.exportable_tables ?? []}
        tissueGroups={tissueGroups}
        isLoading={isLoadingEnrichment}
        variantCount={typedValidation.row_count_estimate}
        selectedAnalyses={selectedAnalyses}
        selectedTables={selectedTables}
        onToggleAnalysis={(name) => setSelectedAnalyses((prev) => toggleSet(prev, name))}
        onToggleTable={(table) => setSelectedTables((prev) => toggleSet(prev, table))}
        tissue={tissue}
        onTissueChange={setTissue}
        disabled={isSubmitting}
        className="border-t border-border pt-5 pb-2"
      />

      {/* Options — clean divider-separated rows */}
      <div className="border-t border-border divide-y divide-border">
        {/* Include unmatched toggle — variant lists only */}
        {!isTypedCohort && (
          <label
            htmlFor={switchId}
            className="flex items-center justify-between gap-4 px-1 py-4 cursor-pointer"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                Include unmatched variants
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Output rows for variants not found in database
              </p>
            </div>
            <Switch
              id={switchId}
              checked={includeNotFound}
              onCheckedChange={setIncludeNotFound}
              disabled={isSubmitting}
            />
          </label>
        )}

        {/* Email notification — progressive disclosure */}
        <div className="px-1 py-4">
          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Add email notification</span>
              <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={emailId}
                  className="text-sm font-medium text-foreground"
                >
                  Email when complete
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmail(false);
                    setEmail("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 -mr-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <Input
                id={emailId}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 mt-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="pt-6">
        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Processing
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
