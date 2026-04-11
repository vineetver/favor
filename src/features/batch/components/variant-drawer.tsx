"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import { Download, Loader2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { type VariantFilter, variantListSQL } from "../lib/igvf-queries";

// ============================================================================
// Format helpers
// ============================================================================

function fmtNum(v: unknown): string {
  return typeof v === "number"
    ? Math.abs(v) >= 100
      ? v.toFixed(0)
      : v.toFixed(2)
    : "—";
}
function fmtSci(v: unknown): string {
  return typeof v === "number"
    ? v < 0.001
      ? v.toExponential(1)
      : v.toFixed(4)
    : "—";
}

// ============================================================================
// Variant Detail (expanded row)
// ============================================================================

function VariantDetail({ row }: { row: Record<string, unknown> }) {
  const genes = Array.isArray(row.genes) ? (row.genes as string[]) : [];
  const methods = [
    ["aPC", row.pred_apc, row.apc_max_score],
    ["chromBPnet", row.pred_chrombpnet, row.chrombpnet_pval],
    ["ClinVar", row.pred_clinvar, null],
    ["lv cV2F", row.pred_liver_cv2f, row.cv2f_liver_score],
    ["cV2F", row.pred_cv2f, row.cv2f_global_score],
    ["lv ASE", row.pred_liver_ase, row.ase_liver_score],
    ["ASE", row.pred_ase, row.ase_overall_score],
    ["lv TLand", row.pred_liver_tland, row.tland_liver_score],
  ] as const;

  return (
    <div className="bg-muted/30 px-3 py-2.5 space-y-2.5">
      <div>
        <p className="text-[10px] font-medium text-muted-foreground mb-1">
          Prediction Methods
        </p>
        <div className="flex flex-wrap gap-1">
          {methods.map(([name, active, score]) => (
            <span
              key={name}
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] border",
                active
                  ? "bg-primary/10 text-foreground border-primary/20 font-medium"
                  : "bg-muted text-muted-foreground/40 border-border",
              )}
            >
              {name}
              {active && typeof score === "number" ? `: ${fmtNum(score)}` : ""}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[11px]">
        {(
          [
            ["Efflux p", row.efflux_p, true],
            ["Uptake p", row.uptake_p, true],
            ["Efflux Z", row.efflux_z, false],
            ["Efflux FDR", row.efflux_fdr, true],
            ["Uptake FDR", row.uptake_fdr, true],
            ["Uptake Z", row.uptake_z, false],
            ["MPRA q", row.encode_mpra_qvalue, false],
            ["MPRA log2FC", row.encode_mpra_log2fc, false],
            ["Finemap lnBF", row.finemapped_ln_bf, false],
          ] as const
        ).map(([label, val, sci]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span
              className={cn(
                "tabular-nums",
                val == null ? "text-muted-foreground/30" : "text-foreground",
              )}
            >
              {typeof val === "number"
                ? sci
                  ? fmtSci(val)
                  : fmtNum(val)
                : "—"}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
            Epigenetic Scores
          </p>
          {(
            [
              ["DNase", row.dnase_phred],
              ["H3K27ac", row.h3k27ac_phred],
              ["H3K4me3", row.h3k4me3_phred],
            ] as const
          ).map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-muted-foreground">{l}</span>
              <span
                className={cn(
                  "tabular-nums",
                  v == null ? "text-muted-foreground/30" : "text-foreground",
                )}
              >
                {typeof v === "number" ? v.toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
            Allele Frequency
          </p>
          {(
            [
              ["AFR", row.af_afr],
              ["AMR", row.af_amr],
              ["EAS", row.af_eas],
              ["NFE", row.af_nfe],
              ["SAS", row.af_sas],
              ["Global", row.af_global],
            ] as const
          ).map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-muted-foreground">{l}</span>
              <span
                className={cn(
                  "tabular-nums",
                  v == null ? "text-muted-foreground/30" : "text-foreground",
                )}
              >
                {typeof v === "number" ? fmtSci(v) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
        <span>
          {row.encode_ccre !== "None" ? `cCRE: ${row.encode_ccre}` : "No cCRE"}
        </span>
        <span>·</span>
        <span>CAGE: {String(row.cage_category)}</span>
        {typeof row.exonic_category === "string" && (
          <>
            <span>·</span>
            <span>{row.exonic_category}</span>
          </>
        )}
        {genes.length > 1 && (
          <>
            <span>·</span>
            <span>Genes: {genes.join(", ")}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Variant Drawer
// ============================================================================

export function VariantDrawer({
  filter,
  onClose,
  query,
}: {
  filter: VariantFilter;
  onClose: () => void;
  query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState("variant_vcf");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpandedIdx(null);
    query(variantListSQL(filter.sql))
      .then((r) => {
        if (!cancelled) {
          setRows(r.rows);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Query failed");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filter.sql, query]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const va = a[sortKey],
          vb = b[sortKey];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb));
        return sortDir === "asc" ? cmp : -cmp;
      }),
    [rows, sortKey, sortDir],
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const downloadTSV = () => {
    if (rows.length === 0) return;
    const keys = Object.keys(rows[0]);
    const lines = [
      keys.join("\t"),
      ...rows.map((r) =>
        keys
          .map((k) => {
            const v = r[k];
            return Array.isArray(v) ? v.join(",") : String(v ?? "");
          })
          .join("\t"),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/tab-separated-values",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "variants.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const COLS: Array<{ key: string; label: string }> = [
    { key: "variant_vcf", label: "Variant" },
    { key: "genes", label: "Gene" },
    { key: "variant_category", label: "Type" },
    { key: "pred_overall", label: "Func" },
    { key: "_sig", label: "Sig" },
    { key: "apc_max_score", label: "aPC" },
  ];

  return (
    <Sheet
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[45vw] max-w-3xl sm:max-w-3xl p-0 flex flex-col"
        showOverlay={false}
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between pr-8">
            <div>
              <SheetTitle className="text-sm">{filter.label}</SheetTitle>
              <SheetDescription className="text-xs">
                {loading
                  ? "Loading…"
                  : `${rows.length}${rows.length >= 1000 ? "+" : ""} variants`}
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTSV}
              disabled={rows.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1" /> TSV
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20 px-4">
              <p className="text-sm font-medium text-destructive mb-1">
                Query failed
              </p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-20">
              No variants match this filter.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  {COLS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="py-2 px-2 text-left text-muted-foreground font-medium cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-0.5">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const isExpanded = expandedIdx === i;
                  const genes = Array.isArray(row.genes)
                    ? (row.genes as string[])
                    : [];
                  const geneLabel = genes.length > 0 ? genes.join(", ") : "—";
                  const regionType =
                    typeof row.region_type === "string" ? row.region_type : "";
                  const consequence =
                    typeof row.consequence === "string" ? row.consequence : "";
                  const typeLabel =
                    consequence ||
                    regionType ||
                    (row.variant_category === "Coding"
                      ? "exonic"
                      : "noncoding");
                  const isSig =
                    !!row.either_sig ||
                    !!row.encode_mpra_sig ||
                    !!row.finemapped_sig;
                  return (
                    <React.Fragment key={i}>
                      <tr
                        onClick={() => setExpandedIdx(isExpanded ? null : i)}
                        className={cn(
                          "border-b border-border/50 cursor-pointer transition-colors",
                          isExpanded ? "bg-primary/5" : "hover:bg-accent/50",
                        )}
                      >
                        <td className="py-1.5 px-2 text-foreground font-mono text-[11px] whitespace-nowrap">
                          {String(row.variant_vcf ?? "")}
                        </td>
                        <td
                          className="py-1.5 px-2 text-foreground max-w-[140px]"
                          title={geneLabel}
                        >
                          <div className="truncate">{geneLabel}</div>
                        </td>
                        <td className="py-1.5 px-2">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px]",
                              row.variant_category === "Coding"
                                ? "bg-blue-100 text-blue-700 font-medium"
                                : "text-muted-foreground",
                            )}
                          >
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-1.5 px-2">
                          {row.pred_overall ? (
                            <span className="text-emerald-600 font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
                          {isSig ? (
                            <span className="text-amber-600 font-bold">✓</span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 tabular-nums text-foreground">
                          {typeof row.apc_max_score === "number"
                            ? row.apc_max_score.toFixed(1)
                            : "—"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={COLS.length} className="p-0">
                            <VariantDetail row={row} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
