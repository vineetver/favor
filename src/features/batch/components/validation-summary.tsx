"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileText,
  Lightbulb,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  formatBytes,
  formatNumber,
  formatPercent,
  getFormatLabel,
  getKeyTypeLabel,
} from "../lib/format";
import type { ValidateResponse } from "../types";
import { StatCard } from "./stat-card";

interface ValidationSummaryProps {
  validation: ValidateResponse;
  filename?: string;
  className?: string;
}

// ============================================================================
// Status Header - Compact with action-focused messaging
// ============================================================================

function StatusHeader({
  ok,
  needsAttention,
  filename,
}: {
  ok: boolean;
  needsAttention: boolean;
  filename?: string;
}) {
  if (!ok) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-rose-100">
          <XCircle className="w-4 h-4 text-rose-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-rose-800">Validation Failed</h3>
          <p className="text-sm text-rose-600 mt-0.5">
            Please fix the errors below and try again
          </p>
        </div>
      </div>
    );
  }

  if (needsAttention) {
    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-amber-800">Ready with warnings</h3>
          </div>
          <p className="text-sm text-amber-600 mt-0.5">
            {filename && <span className="font-medium">{filename}</span>}
            {filename && " — "}Review the warnings below before continuing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
      <div className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-emerald-100">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-emerald-800">File validated</h3>
        <p className="text-sm text-emerald-600 mt-0.5">
          {filename && <span className="font-medium">{filename}</span>}
          {filename && " — "}Ready to configure processing options
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Detected Format Badges
// ============================================================================

function FormatBadges({ validation }: { validation: ValidateResponse }) {
  const { suggested_patch } = validation;
  const isRsId = validation.key_type_detected === "RSID";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
        <FileText className="w-3 h-3" />
        {getFormatLabel(validation.format_detected)}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
          isRsId ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700",
        )}
      >
        <Zap className="w-3 h-3" />
        {getKeyTypeLabel(validation.key_type_detected)}
        {isRsId && " (slower)"}
      </span>
      {suggested_patch.has_header && (
        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
          Header detected
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Data Preview with row numbers
// ============================================================================

function DataPreview({
  validation,
  maxRows = 5,
}: {
  validation: ValidateResponse;
  maxRows?: number;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { stats } = validation;
  const examples: string[] = [];

  if (stats?.examples?.vcf?.length > 0) {
    examples.push(...stats.examples.vcf);
  } else if (stats?.examples?.rsid?.length > 0) {
    examples.push(...stats.examples.rsid);
  } else if (stats?.examples?.vid?.length > 0) {
    examples.push(...stats.examples.vid);
  }

  if (examples.length === 0) return null;

  const displayedExamples = expanded ? examples.slice(0, 25) : examples.slice(0, maxRows);
  const remainingRows = validation.estimated_rows - displayedExamples.length;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayedExamples.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayedExamples]);

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">Data preview</span>
        <div className="flex items-center gap-2">
          {examples.length > maxRows && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              {expanded ? "Show less" : `Show ${Math.min(25, examples.length)} rows`}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      <div className="p-3 bg-white max-h-64 overflow-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {displayedExamples.map((example, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="pr-3 py-0.5 text-slate-400 text-right select-none w-8">
                  {i + 1}
                </td>
                <td className="py-0.5 text-slate-600 truncate">{example}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {remainingRows > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400">
            + {formatNumber(remainingRows)} more rows
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Recommendation callout
// ============================================================================

function RecommendationCallout({ validation }: { validation: ValidateResponse }) {
  const isRsId = validation.key_type_detected === "RSID";

  if (!isRsId) return null;

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
      <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div className="text-xs text-blue-700">
        <span className="font-medium">Tip:</span> Using VCF format (chr-pos-ref-alt) instead of
        rsIDs will process faster and provide more accurate matches.
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ValidationSummary({
  validation,
  filename,
  className,
}: ValidationSummaryProps) {
  const { stats, dry_run, errors, warnings, suggested_patch } = validation;
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const isLowConfidence = stats.confidence < 0.7;
  const isRsId = validation.key_type_detected === "RSID";
  const needsAttention = hasWarnings || isLowConfidence || isRsId;

  // Calculate rates
  const totalSampled = stats.rsid + stats.vcf + stats.vid + stats.invalid;
  const invalidRate = totalSampled > 0 ? stats.invalid / totalSampled : 0;
  const validRate = 1 - invalidRate;
  const matchRate = dry_run?.variant_found_rate ?? 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Header */}
      <StatusHeader ok={validation.ok} needsAttention={needsAttention} filename={filename} />

      {/* Errors - blocking issues */}
      {!validation.ok && hasErrors && (
        <div className="space-y-2">
          {errors.map((error, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200"
            >
              <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <div className="text-sm text-rose-700">
                <span className="font-medium">{error.code}:</span> {error.message}
                {error.line && (
                  <span className="text-rose-500 ml-1">(line {error.line})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success content */}
      {validation.ok && (
        <>
          {/* Format badges */}
          <FormatBadges validation={validation} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={`${validation.is_estimate ? "~" : ""}${formatNumber(validation.estimated_rows)}`}
              label="Rows"
            />
            <StatCard
              value={formatPercent(matchRate)}
              label="Match rate"
              variant={matchRate >= 0.8 ? "positive" : matchRate >= 0.5 ? "warning" : "negative"}
            />
            <StatCard
              value={formatPercent(validRate)}
              label="Valid keys"
              variant={invalidRate > 0.1 ? "negative" : "default"}
            />
          </div>

          {/* Recommendation for rsID users */}
          <RecommendationCallout validation={validation} />

          {/* Data Preview */}
          <DataPreview validation={validation} />

          {/* Warnings - non-blocking issues */}
          {(hasWarnings || isLowConfidence) && (
            <div className="space-y-2">
              {isLowConfidence && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-700">
                    <span className="font-medium">Low confidence ({formatPercent(stats.confidence)}):</span>{" "}
                    File may contain mixed key types
                  </div>
                </div>
              )}
              {warnings
                .filter(
                  (w) =>
                    !w.toLowerCase().includes("rsid") &&
                    !w.toLowerCase().includes("suggested settings") &&
                    !w.toLowerCase().includes("mixed key types") &&
                    !w.toLowerCase().includes("low confidence"),
                )
                .map((warning, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-amber-700">{warning}</span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
