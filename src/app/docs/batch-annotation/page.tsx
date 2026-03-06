import type { Metadata } from "next";
import Link from "next/link";
import { Prose, Callout, Step } from "../_components/doc-primitives";
import { StatBanner } from "../_components/stat-banner";
import { DataFlowDiagram } from "../_components/data-flow-diagram";
import {
  FlowDiagram,
  FlowNode,
  FlowConnector,
} from "../_components/flow-diagram";

export const metadata: Metadata = {
  title: "Batch Annotation | FAVOR Docs",
  description:
    "Portal guide: upload variant files, get 232 annotation dimensions, build queryable cohorts, and analyze with the AI agent.",
};

export default function BatchAnnotationDocsPage() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <div>
        <Prose>
          <h1>Batch Annotation</h1>
          <p>
            Upload a variant file. Get back a fully annotated, queryable cohort
            with <strong>232 annotation dimensions</strong> from 30+ databases,
            a statistical analysis suite, and direct access to the{" "}
            <Link href="/docs/agent">AI agent</Link>.
          </p>
        </Prose>
        <div className="mt-6">
          <StatBanner
            stats={[
              { value: "232", label: "Annotation Dimensions", detail: "Functional, conservation, population, regulatory" },
              { value: "30+", label: "Data Sources", detail: "gnomAD, ClinVar, CADD, LINSIGHT, and more" },
              { value: "10K+", label: "Records / sec", detail: "Per node, horizontally scalable" },
              { value: "12", label: "Analytics Methods", detail: "Regression, PCA, clustering, and more" },
            ]}
          />
        </div>
      </div>

      {/* Journey */}
      <section>
        <Prose>
          <h2>The journey</h2>
          <p>
            Four screens between your raw file and a research-ready cohort.
            Most uploads complete in under two minutes.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="Upload to analysis"
            steps={[
              { label: "Upload", detail: "Drag and drop your file" },
              { label: "Validate", detail: "Auto-detected format and columns" },
              { label: "Configure", detail: "Review mappings, submit" },
              { label: "Analyze", detail: "Query, filter, stats, AI agent" },
            ]}
          />
        </div>
      </section>

      {/* Step 1: Upload */}
      <section>
        <Prose>
          <h2>Step 1: Upload your file</h2>
          <p>
            Drag your file onto the dropzone at{" "}
            <Link href="/batch-annotation">Batch Annotation</Link>. Files
            upload directly to cloud storage via presigned URL &mdash; they
            never pass through the application server.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Property</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Auto-detected</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Limits</th>
              </tr>
            </thead>
            <tbody>
              {[
                { prop: "File formats", auto: "CSV, TSV, TXT, VCF, Parquet — delimiter auto-detected", limits: "Up to 500 MB" },
                { prop: "Data types", auto: "Variant lists, GWAS, credible sets, fine-mapping — classified by columns", limits: "Up to 500K variant keys" },
                { prop: "Identifiers", auto: "rsIDs, VCF coordinates, FAVOR VIDs — per-row classification", limits: "Mixed formats OK" },
              ].map((row) => (
                <tr key={row.prop} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.prop}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.auto}</td>
                  <td className="py-3 text-muted-foreground whitespace-nowrap">{row.limits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Step 2: Validate */}
      <section>
        <Prose>
          <h2>Step 2: Validation and preview</h2>
          <p>
            FAVOR analyzes your file structure within seconds. Nothing starts
            processing until you confirm.
          </p>
        </Prose>
        <div className="mt-4">
          <FlowDiagram>
            <FlowNode
              icon="search"
              title="Format detection"
              subtitle="File type, delimiter, and header row identified with confidence score."
              index={0}
            />
            <FlowConnector />
            <FlowNode
              icon="compass"
              title="Data type classification"
              subtitle="Variant list, GWAS, credible set, or fine-mapping — based on column names and value heuristics."
              index={1}
            />
            <FlowConnector />
            <FlowNode
              icon="layers"
              title="Schema preview"
              items={[
                "Column names, data kinds, and sample values",
                "Row count estimate and identifier type breakdown",
                "Warnings for unusual patterns or low confidence",
              ]}
              index={2}
            />
          </FlowDiagram>
        </div>
        <div className="mt-4">
          <Callout variant="info" title="Typed cohorts">
            GWAS, credible set, and fine-mapping files get an interactive
            column mapping step. The system auto-maps your column names to
            canonical names (e.g. <code>CHR</code> to <code>chromosome</code>,{" "}
            <code>PVAL</code> to <code>p_value</code>) using an alias
            dictionary. Override any mapping with a dropdown before submitting.
          </Callout>
        </div>
      </section>

      {/* Step 3: Configure and submit */}
      <section>
        <Prose>
          <h2>Step 3: Configure and submit</h2>
          <p>
            Review settings and submit. For variant lists, toggle inclusion of
            unmatched variants. For typed cohorts (GWAS, credible sets,
            fine-mapping), review the confirmed column mapping and data type.
          </p>
        </Prose>
        <div className="mt-4">
          <Callout variant="tip" title="Start small">
            Try a file with a few hundred variants first. See the full pipeline
            in action in seconds, then scale up.
          </Callout>
        </div>
      </section>

      {/* Step 4: Track progress */}
      <section>
        <Prose>
          <h2>Step 4: Track progress</h2>
          <p>
            After submitting, the job detail page auto-refreshes with live
            progress: rows resolved, variants found, speed, and estimated time
            remaining.
          </p>
        </Prose>
        <div className="mt-4">
          <FlowDiagram>
            <FlowNode
              icon="calendar-clock"
              title="Queued"
              subtitle="Waiting for a worker. Small jobs get priority placement."
              index={0}
            />
            <FlowConnector />
            <FlowNode
              icon="zap"
              title="Running"
              items={[
                "Live progress bar with percentage",
                "Stats: rows resolved, variants found/not found",
                "Processing speed (rows/sec) and time remaining",
              ]}
              index={1}
            />
            <FlowConnector />
            <FlowNode
              icon="check-circle"
              title="Complete"
              subtitle="Final stats, download link, buttons to Analytics and AI Agent."
              index={2}
            />
          </FlowDiagram>
        </div>
        <div className="mt-4">
          <Callout variant="info" title="Processing speed">
            10,000+ records/sec per worker. A 500-variant file finishes in
            seconds; 50,000 variants in under two minutes. Close the tab and
            come back &mdash; find all jobs on the{" "}
            <Link href="/batch-annotation/jobs" className="text-primary hover:underline font-medium">
              Jobs Dashboard
            </Link>.
          </Callout>
        </div>
      </section>

      {/* Jobs dashboard */}
      <section>
        <Prose>
          <h2>Jobs dashboard</h2>
          <p>
            The{" "}
            <Link href="/batch-annotation/jobs">Jobs Dashboard</Link>{" "}
            lists every job with status, variant count, and date. Filter by
            status, search by label, sort by date. Completed jobs show download
            links and quick-access buttons to Analytics and the AI Agent.
          </p>
        </Prose>
      </section>

      {/* After annotation */}
      <section>
        <Prose>
          <h2>After annotation</h2>
          <p>
            Once your cohort is ready, everything operates on the same
            annotated dataset in the browser.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Capability</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cap: "Query & filter", desc: "Filter by any of 232 dimensions. Stack filters, sort, paginate with column selection." },
                { cap: "Rank & prioritize", desc: "Multi-criteria weighted composite scoring with automatic normalization." },
                { cap: "Derive sub-cohorts", desc: "Filtered subsets as independent cohorts with their own analytics and agent access." },
                { cap: "Run analytics", desc: "12 methods: regression, PCA, clustering, bootstrap CIs, permutation tests, multiple testing correction. Async with chart generation." },
                { cap: "Group & aggregate", desc: "Group by gene, consequence, chromosome. Count, mean, min, max, median per group." },
                { cap: "AI agent handoff", desc: "Natural language questions, graph cross-reference, and automated visualization over your cohort." },
              ].map((row) => (
                <tr key={row.cap} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.cap}</td>
                  <td className="py-3 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analytics report */}
      <section>
        <Prose>
          <h2>Analytics report</h2>
          <p>
            Every cohort has an Analytics page. The <strong>Report</strong>{" "}
            view computes visual dashboards in-browser over your Parquet file
            using DuckDB. The <strong>SQL Query</strong> view gives you direct
            SQL over the same data.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">View</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {[
                { view: "Gene breakdown", desc: "Top genes ranked by variant count" },
                { view: "Consequence distribution", desc: "Missense, synonymous, splice, UTR, intergenic — counts and percentages" },
                { view: "Score distributions", desc: "CADD, REVEL, gnomAD AF, conservation — histograms and summary stats" },
                { view: "Clinical significance", desc: "ClinVar classification breakdown with review status" },
                { view: "Regional breakdown", desc: "By chromosome, functional region, regulatory context" },
                { view: "SQL query", desc: "Arbitrary SQL against your cohort via DataFusion" },
              ].map((row) => (
                <tr key={row.view} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.view}</td>
                  <td className="py-3 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Agent connection */}
      <section>
        <Prose>
          <h2>Connected to the AI agent</h2>
          <p>
            Select your cohort in a conversation and start asking questions.
            The{" "}
            <Link href="/docs/agent">agent</Link> reads your
            schema, runs queries, executes analytics, and cross-references
            variants with the{" "}
            <Link href="/docs/knowledge-graph">14.8M-entity knowledge graph</Link>.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="From cohort to discovery"
            steps={[
              { label: "Your cohort", detail: "Annotated, queryable, filterable" },
              { label: "AI agent", detail: "Natural language queries" },
              { label: "Knowledge graph", detail: "14.8M entities, 52 relationship types" },
              { label: "Insights", detail: "Drug targets, pathways, phenotype associations" },
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="space-y-4">
          <Callout variant="tip" title="Ready to try it?">
            Go to{" "}
            <Link href="/batch-annotation" className="text-primary hover:underline font-medium">
              Batch Annotation
            </Link>{" "}
            to upload your first file. Start small, then scale up.
          </Callout>
          <Callout variant="info" title="Engineering deep-dive">
            See the{" "}
            <Link href="/docs/batch-pipeline" className="text-primary hover:underline font-medium">
              Batch Pipeline
            </Link>{" "}
            page for streaming architecture, zero-allocation decoding, and
            horizontal scaling details.
          </Callout>
        </div>
      </section>
    </div>
  );
}
