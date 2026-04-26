import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Callout, Prose } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "before-you-upload", label: "Before you upload" },
  { id: "upload-and-validate", label: "Upload and validate" },
  { id: "mapping", label: "Map columns" },
  { id: "results", label: "Review results" },
  { id: "analyze-variant-list", label: "Analyze variant list" },
  { id: "jobs", label: "Jobs dashboard" },
];

export const metadata: Metadata = {
  title: "Batch Annotation | FAVOR Docs",
  description:
    "Portal guide: upload variant files, build annotated variant lists, and continue into analytics or the AI agent.",
};

function Marker({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
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
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-border" />
          <div className="h-2 w-2 rounded-full bg-border" />
          <div className="h-2 w-2 rounded-full bg-border" />
        </div>
        <div className="bg-background">{children}</div>
      </div>
      <figcaption className="px-4 text-center text-sm text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function BatchAnnotationDocsPage() {
  return (
    <div className="space-y-14">
      <DocsToc items={TOC_ITEMS} />

      <Prose>
        <h1>Batch Annotation</h1>
        <p>
          Upload a variant file and FAVOR turns it into a queryable variant list
          with annotations, validation metadata, and downstream analysis entry
          points. Use this workflow when you have more than a few variants and
          want one place to annotate, inspect, and analyze them.
        </p>
      </Prose>

      <Callout title="Working offline or at WGS scale?">
        For files larger than the upload limit or air-gapped environments, use
        the{" "}
        <Link href="/cli" className="font-medium text-primary">
          FAVOR CLI
        </Link>{" "}
        — runs annotation, tissue context, and rare-variant tests on your own
        hardware. Existing R/STAARpipeline users can stick with the{" "}
        <Link href="/favor-annotator" className="font-medium text-primary">
          FAVOR Annotator
        </Link>
        .
      </Callout>

      <section className="space-y-4">
        <h2
          id="before-you-upload"
          className="text-lg font-semibold text-foreground"
        >
          Before you upload
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Supported formats",
              body: "CSV, TSV, VCF, and Parquet are accepted. FAVOR detects the file type and delimiter automatically.",
            },
            {
              title: "Variant identifiers",
              body: "The smoothest path is a file with rsIDs or coordinate-based variant columns that can be mapped cleanly.",
            },
            {
              title: "Column review",
              body: "If your headers are close to standard names, auto-mapping usually works. You can still override any mapping before submission.",
            },
            {
              title: "Recommended first run",
              body: "Start with a small file so you can verify the mapping and output shape before scaling up to a larger variant list.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <Frame caption="Open Batch Annotation from the main navigation to start a new upload.">
          <Image
            src="/static/b1.jpeg"
            alt="FAVOR homepage with Batch Annotation navigation link"
            width={3024}
            height={1580}
            sizes="100vw"
            className="h-auto w-full"
          />
        </Frame>
      </section>

      <section className="space-y-4">
        <h2
          id="upload-and-validate"
          className="text-lg font-semibold text-foreground"
        >
          Upload and validate
        </h2>
        <div className="space-y-3">
          {[
            {
              n: 1,
              title: "Upload the file",
              body: "Drag and drop the variant list file into the upload area. FAVOR prepares a preview before you commit to the run.",
            },
            {
              n: 2,
              title: "Inspect the validation summary",
              body: "Check the detected dataset type, row count, schema, and confidence score. This is where malformed files usually show up.",
            },
            {
              n: 3,
              title: "Confirm the sample values",
              body: "The preview is there to help you verify that the detected column kinds match what your file actually contains.",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Marker n={step.n} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Frame caption="Upload the variant list file. FAVOR handles common tabular and variant formats directly.">
            <Image
              src="/static/b2.png"
              alt="Batch annotation upload dropzone accepting CSV, TSV, VCF, and Parquet files"
              width={1792}
              height={1406}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full"
            />
          </Frame>
          <Frame caption="Review the validation summary before you proceed. It shows the inferred file type, schema, and sample values.">
            <Image
              src="/static/b3.png"
              alt="Validation summary for gwas_sumstats_ebi.tsv showing GWAS Summary Stats type, ~30 rows, 10 columns, 100% confidence, and schema preview with column kinds and samples"
              width={1800}
              height={1554}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full"
            />
          </Frame>
        </div>
      </section>

      <section className="space-y-4">
        <h2 id="mapping" className="text-lg font-semibold text-foreground">
          Map columns
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          FAVOR maps your incoming columns to canonical names. Review this step
          carefully, especially if your file uses project-specific headers or
          ambiguous abbreviations.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">
              Auto-mapping
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Exact and alias matches are detected automatically. This is often
              enough for standard GWAS or variant list files.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">
              Manual override
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              If a column lands on the wrong canonical field, override it before
              submission. This is the last clean checkpoint before annotation
              runs.
            </p>
          </div>
        </div>
        <Frame caption="Review each mapping. Auto-detected matches are shown, but you can reassign any column before submission.">
          <Image
            src="/static/b4.png"
            alt="Column mapping table showing original columns (CHR, POS, SNP, A1, A2, BETA, SE, P, N, INFO) mapped to canonical names (chromosome, position, rsid, effect_allele, other_allele, beta, se, p_value, n, info) with kind and source badges"
            width={1676}
            height={1444}
            sizes="100vw"
            className="h-auto w-full"
          />
        </Frame>
      </section>

      <section className="space-y-4">
        <h2 id="results" className="text-lg font-semibold text-foreground">
          Review results
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          When the job finishes, the result page becomes the handoff point for
          everything else: download the variant list, open analytics, or send it
          directly to the AI agent.
        </p>
        <Frame caption="Completed jobs show coverage, timing, and the next actions available for that variant list.">
          <Image
            src="/static/b5.png"
            alt="Completed job for gwas_sumstats_ebi.tsv showing 30 found (100%), 0 not found, 0 errors, duration 7.4s, with Download, Open in AI Agent, and Open Analytics buttons"
            width={1800}
            height={1192}
            sizes="100vw"
            className="h-auto w-full"
          />
        </Frame>
      </section>

      <section className="space-y-4">
        <h2
          id="analyze-variant-list"
          className="text-lg font-semibold text-foreground"
        >
          Analyze the variant list
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Open Analytics",
              body: "Use the built-in dashboard for quick summary charts, distributions, and first-pass inspection.",
            },
            {
              title: "Stay in the browser",
              body: "The analytics view is useful when you want deterministic summary views without switching into a conversational workflow.",
            },
            {
              title: "Open in AI Agent",
              body: "Use the agent when the next step is exploratory, comparative, or statistical rather than just descriptive.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Frame caption="Open Analytics for a fast summary dashboard over the annotated variant list.">
            <Image
              src="/static/b6.png"
              alt="In-browser analytics dashboard showing gene breakdown, consequence distribution, score distributions, and clinical significance charts"
              width={1914}
              height={1270}
              sizes="100vw"
              className="h-auto w-full"
            />
          </Frame>
          <Frame caption="The analytics dashboard is optimized for direct inspection of distributions, counts, and top categories.">
            <Image
              src="/static/b7.png"
              alt="Analytics dashboard with charts for gene breakdown, consequence distribution, score distributions, and clinical significance"
              width={1824}
              height={1568}
              sizes="100vw"
              className="h-auto w-full"
            />
          </Frame>
          <Frame caption="Open in AI Agent when you want follow-up questions, variant list comparisons, statistics, or graph-aware interpretation.">
            <Image
              src="/static/b8.png"
              alt="AI agent conversation analyzing the annotated variant list with natural language queries and generated visualizations"
              width={3024}
              height={1716}
              sizes="100vw"
              className="h-auto w-full"
            />
          </Frame>
        </div>
      </section>

      <section className="space-y-3">
        <h2 id="jobs" className="text-lg font-semibold text-foreground">
          Jobs dashboard
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The jobs dashboard is the history view for your uploads. Use it to
          revisit completed variant lists, filter by status, and reopen analysis
          later.
        </p>
        <Frame caption="All jobs stay accessible from one dashboard, so you can return to downloads and analyses without re-uploading.">
          <Image
            src="/static/b9.png"
            alt="Jobs dashboard listing all batch annotation jobs with status filters, search, and quick-access buttons"
            width={1828}
            height={814}
            sizes="100vw"
            className="h-auto w-full"
          />
        </Frame>
      </section>

      <section>
        <Callout variant="tip" title="Start small">
          Try a file with a few hundred variants first. See the full workflow in
          seconds, then scale up. Go to{" "}
          <Link
            href="/batch-annotation"
            className="text-primary hover:underline font-medium"
          >
            Batch Annotation
          </Link>{" "}
          to upload your first file.
        </Callout>
      </section>

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
