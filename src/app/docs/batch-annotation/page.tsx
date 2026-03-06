import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Prose, Callout } from "../_components/doc-primitives";

export const metadata: Metadata = {
  title: "Batch Annotation | FAVOR Docs",
  description:
    "Portal guide: upload variant files, get 232 annotation dimensions, build queryable cohorts, and analyze with the AI agent.",
};

/* ------------------------------------------------------------------ */
/*  Storyboard primitives                                              */
/* ------------------------------------------------------------------ */

function Marker({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">
      {n}
    </span>
  );
}

function Frame({
  children,
  caption,
}: {
  children: ReactNode;
  caption: string;
}) {
  return (
    <figure className="space-y-2.5">
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b border-border">
          <div className="w-2 h-2 rounded-full bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
        </div>
        <div className="bg-background">{children}</div>
      </div>
      <figcaption className="text-sm text-muted-foreground text-center px-4">
        {caption}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BatchAnnotationDocsPage() {
  return (
    <div className="space-y-14">
      <Prose>
        <h1>Batch Annotation</h1>
        <p>
          Upload a variant file, get back a fully annotated cohort with{" "}
          <strong>232 dimensions</strong> from 30+ databases. Query, filter, run
          statistics, and hand off to the{" "}
          <Link href="/docs/agent">AI agent</Link> &mdash; all from the same
          page.
        </p>
      </Prose>

      {/* 1 — Navigate */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={1} />
          <h2 className="text-lg font-semibold text-foreground">
            Navigate to Batch Annotation
          </h2>
        </div>
        <Frame caption="From the homepage, click Batch Annotation to open the upload wizard.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b1.jpeg"
            alt="FAVOR homepage with Batch Annotation navigation link"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 2 — Upload */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={2} />
          <h2 className="text-lg font-semibold text-foreground">
            Upload your file
          </h2>
        </div>
        <Frame caption="Drag and drop onto the dropzone. CSV, TSV, VCF, Parquet — format and delimiter auto-detected.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b2.png"
            alt="Batch annotation upload dropzone accepting CSV, TSV, VCF, and Parquet files"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 3 — Validation */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={3} />
          <h2 className="text-lg font-semibold text-foreground">
            Validation &amp; preview
          </h2>
        </div>
        <Frame caption="File validated with data type, row count, column schema, and confidence score. Schema preview shows column kinds and sample values.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b3.png"
            alt="Validation summary for gwas_sumstats_ebi.tsv showing GWAS Summary Stats type, ~30 rows, 10 columns, 100% confidence, and schema preview with column kinds and samples"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 4 — Column mapping */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={4} />
          <h2 className="text-lg font-semibold text-foreground">
            Map columns
          </h2>
        </div>
        <Frame caption="Your columns auto-mapped to canonical names with Exact or Alias source. Override any mapping with the dropdown.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b4.png"
            alt="Column mapping table showing original columns (CHR, POS, SNP, A1, A2, BETA, SE, P, N, INFO) mapped to canonical names (chromosome, position, rsid, effect_allele, other_allele, beta, se, p_value, n, info) with kind and source badges"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 5 — Submit & track */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={5} />
          <h2 className="text-lg font-semibold text-foreground">
            Results ready
          </h2>
        </div>
        <Frame caption="Job completed in seconds — download the Parquet file, open in AI Agent, or jump to Analytics.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b5.png"
            alt="Completed job for gwas_sumstats_ebi.tsv showing 30 found (100%), 0 not found, 0 errors, duration 7.4s, with Download, Open in AI Agent, and Open Analytics buttons"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 6 — Open Analytics */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={6} />
          <h2 className="text-lg font-semibold text-foreground">
            Open Analytics
          </h2>
        </div>
        <Frame caption="Click Open Analytics — in-browser summary dashboard over your annotated cohort, powered by DuckDB.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b6.png"
            alt="In-browser analytics dashboard showing gene breakdown, consequence distribution, score distributions, and clinical significance charts"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 7 — Analytics dashboard */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={7} />
          <h2 className="text-lg font-semibold text-foreground">
            Analytics dashboard
          </h2>
        </div>
        <Frame caption="Gene breakdown, consequence distribution, score histograms, and clinical significance — all computed in-browser.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b7.png"
            alt="Analytics dashboard with charts for gene breakdown, consequence distribution, score distributions, and clinical significance"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 8 — AI Agent */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={8} />
          <h2 className="text-lg font-semibold text-foreground">
            Ask the AI agent
          </h2>
        </div>
        <Frame caption="Click Open in AI Agent — ask natural language questions, run statistics, and cross-reference with the knowledge graph.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b8.png"
            alt="AI agent conversation analyzing the annotated cohort with natural language queries and generated visualizations"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 9 — Jobs list */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={9} />
          <h2 className="text-lg font-semibold text-foreground">
            Jobs dashboard
          </h2>
        </div>
        <Frame caption="All jobs in one place — filter by status, search by label. Come back anytime to download or re-analyze.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/b9.png"
            alt="Jobs dashboard listing all batch annotation jobs with status filters, search, and quick-access buttons"
            className="w-full"
          />
        </Frame>
      </section>

      {/* Tips */}
      <section>
        <Callout variant="tip" title="Start small">
          Try a file with a few hundred variants first. See the full pipeline in
          action in seconds, then scale up. Go to{" "}
          <Link
            href="/batch-annotation"
            className="text-primary hover:underline font-medium"
          >
            Batch Annotation
          </Link>{" "}
          to upload your first file.
        </Callout>
      </section>

      {/* Engineering link */}
      <section>
        <Callout variant="info" title="Engineering deep-dive">
          For streaming architecture, zero-allocation decoding, and horizontal
          scaling, see the{" "}
          <Link
            href="/docs/batch-pipeline"
            className="text-primary hover:underline font-medium"
          >
            Batch Pipeline
          </Link>{" "}
          page.
        </Callout>
      </section>
    </div>
  );
}
