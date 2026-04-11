"use client";

import { BatchWizard } from "@features/batch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";

export function BatchAnnotationClient() {
  return (
    <div className="min-h-screen relative overflow-hidden text-foreground">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
      </div>

      <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Batch Wizard */}
        <BatchWizard />

        {/* File format help — collapsible */}
        <FileFormatHelp />
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  File format reference (collapsible)                                 */
/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-sm font-semibold text-foreground mt-6 mb-3 first:mt-0">
      {children}
    </h4>
  );
}

function MiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left py-2 px-3 font-semibold text-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="py-2 px-3 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AliasGroup({ label, aliases }: { label: string; aliases: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-foreground font-medium shrink-0 w-28">{label}</span>
      <span className="text-muted-foreground font-mono">{aliases}</span>
    </div>
  );
}

function FileFormatHelp() {
  return (
    <Collapsible className="mt-8">
      <CollapsibleTrigger className="group flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        Need help with file formats?
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-6 rounded-xl border border-border bg-card p-6 space-y-1">
          {/* Supported file formats */}
          <SectionTitle>Supported file formats</SectionTitle>
          <MiniTable
            headers={["Format", "Extensions", "Notes"]}
            rows={[
              ["CSV", ".csv", "Comma-delimited"],
              ["TSV", ".tsv, .txt", "Tab-delimited"],
              ["TXT", ".txt", "Single-column (one key per line)"],
              ["Parquet", ".parquet, .pq", "Binary columnar format"],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-2">
            If no format hint is provided, the system auto-detects by inspecting
            delimiters in the first line.
          </p>

          {/* Variant key types */}
          <SectionTitle>Accepted variant key types</SectionTitle>
          <MiniTable
            headers={["Key type", "Example", "Description"]}
            rows={[
              ["rsID", "rs1234567", "dbSNP reference SNP ID"],
              [
                "VCF notation",
                "1-10001-A-T",
                "CHROM-POS-REF-ALT (separators -, :, or / accepted)",
              ],
              ["VID", "vid:12345678", "Internal variant ID"],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Mixed key types within a single file are supported but may be slower
            to process.
          </p>

          {/* Column detection */}
          <SectionTitle>Column detection</SectionTitle>
          <p className="text-xs text-muted-foreground mb-3">
            For multi-column files, the system automatically identifies columns
            by name. Recognized aliases:
          </p>
          <div className="space-y-1.5 bg-muted/30 rounded-lg p-3">
            <AliasGroup
              label="Chromosome"
              aliases="chr, chrom, #CHROM, contig"
            />
            <AliasGroup
              label="Position"
              aliases="pos, bp, base_pair_location"
            />
            <AliasGroup
              label="Reference"
              aliases="ref, reference, reference_allele"
            />
            <AliasGroup
              label="Alternate"
              aliases="alt, alternate, alternate_allele"
            />
            <AliasGroup
              label="Effect allele"
              aliases="a1, ea, allele1, effectallele"
            />
            <AliasGroup label="Other allele" aliases="a2, oa, nea, allele2" />
            <AliasGroup
              label="Variant ID"
              aliases="rsid, snp, snpid, marker, variant_id"
            />
            <AliasGroup label="P-value" aliases="pvalue, p, pval, p.value" />
            <AliasGroup label="Beta" aliases="beta, effect, b, estimate" />
            <AliasGroup label="Std error" aliases="se, stderr, std_err" />
            <AliasGroup label="Z-score" aliases="z, z_score, zscore" />
            <AliasGroup label="MAF" aliases="maf, freq, eaf, a1freq" />
            <AliasGroup label="Sample size" aliases="n, sample_size, n_total" />
            <AliasGroup label="PIP" aliases="pip, posterior_prob" />
            <AliasGroup label="Log BF" aliases="log_bf, logbf, bf" />
            <AliasGroup
              label="Credible set"
              aliases="cs_id, credible_set, cs"
            />
          </div>

          {/* Data types */}
          <SectionTitle>Data types auto-detected</SectionTitle>
          <MiniTable
            headers={["Data type", "Required columns", "Description"]}
            rows={[
              [
                "GWAS summary stats",
                "p-value, beta, SE, chrom, pos (≥4)",
                "Standard GWAS results",
              ],
              [
                "Credible set",
                "PIP, credible set ID, chrom, pos (≥3)",
                "Fine-mapping credible sets",
              ],
              [
                "Fine-mapping",
                "PIP, log BF, chrom, pos (≥3)",
                "Fine-mapping output",
              ],
              [
                "Variant list",
                "Variant ID column (rsID / VID / VCF)",
                "Simple list of variants",
              ],
            ]}
          />
          <p className="text-xs text-muted-foreground mt-2">
            If detection confidence is below 80%, you&apos;ll be asked to
            confirm the detected type.
          </p>

          {/* Resolution strategies */}
          <SectionTitle>Variant resolution</SectionTitle>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                1. CHROM + POS + REF + ALT
              </span>{" "}
              — fastest, most accurate
            </p>
            <p>
              <span className="font-medium text-foreground">2. rsID</span> —
              requires database lookup, slightly slower
            </p>
            <p>
              <span className="font-medium text-foreground">
                3. CHROM + POS only
              </span>{" "}
              — least specific, may match multiple variants
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Tip: files with ref and alt allele columns resolve faster than
            rsID-only files.
          </p>

          {/* Limits */}
          <SectionTitle>Limits</SectionTitle>
          <MiniTable
            headers={["Constraint", "Limit"]}
            rows={[
              ["Max file size", "10 GB"],
              ["Max line length", "64 KB"],
              ["Max columns", "1,000"],
              ["Rows sampled for validation", "up to 10,000"],
            ]}
          />

          {/* Link to full docs */}
          <div className="pt-4 text-center">
            <Link
              href="/docs/batch-annotation"
              className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              View full documentation &rarr;
            </Link>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
