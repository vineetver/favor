import type { Metadata } from "next";
import Link from "next/link";
import { Prose, Callout } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "capabilities", label: "What it can do" },
  { id: "getting-started", label: "Getting started" },
  { id: "example-prompts", label: "Example prompts" },
  { id: "operations", label: "Available operations" },
];

export const metadata: Metadata = {
  title: "AI Agent | FAVOR Docs",
  description:
    "How to use FAVOR-GPT effectively for variant analysis, cohort exploration, and graph queries.",
};

/* ------------------------------------------------------------------ */
/*  Layout primitives                                                  */
/* ------------------------------------------------------------------ */

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-2">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function Prompt({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-muted/60">
      <span className="text-primary text-sm mt-px shrink-0">&rsaquo;</span>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AgentDocsPage() {
  return (
    <div className="space-y-14">
      <DocsToc items={TOC_ITEMS} />

      <Prose>
        <h1>AI Agent (FAVOR-GPT)</h1>
        <p>
          Ask questions in plain English. FAVOR-GPT picks the right tools, runs
          them against your data, and returns results with charts, tables, and
          explanations &mdash; no code required.
        </p>
      </Prose>

      {/* Capabilities */}
      <section className="space-y-4">
        <h2 id="capabilities" className="text-lg font-semibold text-foreground">
          What it can do
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card
            title="Signal to mechanism"
            desc="Drug repurposing, target identification, enrichment, and phenotype mapping via natural language."

          />
          <Card
            title="Variant prioritization"
            desc="Annotate and rank by any score. Composite scoring with normalization and weighted multi-criteria ranking."

          />
          <Card
            title="Statistical analysis"
            desc="Async PCA, regression (linear, logistic, elastic net), clustering, correlation, hypothesis tests, and GWAS QC."

          />
          <Card
            title="Cross-session memory"
            desc="Pin entities, save findings, and continue conversations across sessions with full context."

          />
          <Card
            title="Visualization"
            desc="Bar, scatter, distribution, heatmap, QQ plots, network diagrams &mdash; deterministic charts from tool outputs."

          />
          <Card
            title="Multi-step composition"
            desc="Chain graph exploration, cohort queries, statistical analysis, and chart generation in a single conversation."

          />
        </div>
      </section>

      {/* Getting started */}
      <section className="space-y-4">
        <h2 id="getting-started" className="text-lg font-semibold text-foreground">
          Getting started
        </h2>
        <div className="space-y-3">
          {[
            {
              n: 1,
              title: "Open the agent",
              desc: (
                <>
                  Navigate to{" "}
                  <Link href="/agent" className="text-primary hover:underline">
                    /agent
                  </Link>
                  . Sessions persist context, state, and artifacts across turns.
                </>
              ),
            },
            {
              n: 2,
              title: "Set your context",
              desc: (
                <>
                  Select a cohort from a{" "}
                  <Link
                    href="/docs/batch-annotation"
                    className="text-primary hover:underline"
                  >
                    batch annotation
                  </Link>{" "}
                  job, or paste variant IDs directly.
                </>
              ),
            },
            {
              n: 3,
              title: "Ask questions",
              desc: "Request analyses, comparisons, or explorations. The agent picks tools, runs them, and synthesizes results.",
            },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Example prompts */}
      <section className="space-y-4">
        <h2 id="example-prompts" className="text-lg font-semibold text-foreground">
          Example prompts
        </h2>
        <div className="space-y-2">
          <Prompt>Set cohort &lt;id&gt; and show top 10 variants by CADD.</Prompt>
          <Prompt>Give me a QC summary and flag potential data-quality issues.</Prompt>
          <Prompt>Compare BRCA1 and TP53 for shared disease neighbors.</Prompt>
          <Prompt>Find paths from BRCA1 to breast cancer and summarize shortest links.</Prompt>
          <Prompt>Run PCA on numeric features and explain principal components.</Prompt>
          <Prompt>Create a cohort from these variants: rs123, rs456, rs789</Prompt>
        </div>
      </section>

      {/* Operations */}
      <section className="space-y-4">
        <h2 id="operations" className="text-lg font-semibold text-foreground">
          Available operations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">
                  Domain
                </th>
                <th className="text-left py-2.5 font-semibold text-foreground">
                  Operations
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  domain: "Cohort",
                  ops: "Query rows, filter/sort, group-by aggregation, derive sub-cohorts, composite scoring, variant prioritization, export",
                },
                {
                  domain: "Analytics",
                  ops: "Regression (linear, logistic, elastic net), PCA, clustering, correlation, hypothesis testing, GWAS QC",
                },
                {
                  domain: "Graph",
                  ops: "Explore neighbors, compare entities, find shortest paths, enrichment queries, structural pattern matching",
                },
                {
                  domain: "Workspace",
                  ops: "Pin entities, switch cohorts, save memories across sessions",
                },
              ].map((row) => (
                <tr
                  key={row.domain}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">
                    {row.domain}
                  </td>
                  <td className="py-3 text-muted-foreground">{row.ops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tips */}
      <section className="space-y-4">
        <Callout variant="tip" title="Tips">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>
              Start with a cohort or entity context &mdash; the agent works best
              when it knows what data you're working with.
            </li>
            <li>
              Exact column names are faster, but close matches auto-correct.
            </li>
            <li>
              Keep the same session for related analyses &mdash; context
              accumulates across turns.
            </li>
            <li>
              Plain labels like "BRCA1" work for graph queries &mdash; the agent
              resolves them automatically.
            </li>
          </ul>
        </Callout>

        <Callout variant="warning" title="Interpretation">
          FAVOR-GPT is a decision-support tool, not a diagnostic system. Treat
          outputs as hypotheses to validate, not conclusions to cite.
        </Callout>
      </section>

      {/* Engineering link */}
      <section>
        <Callout variant="info" title="Engineering deep-dive">
          For the tool architecture, planning loop, and error recovery behind
          the agent, see the{" "}
          <Link
            href="/docs/agent-system"
            className="text-primary hover:underline font-medium"
          >
            Agent System
          </Link>{" "}
          page.
        </Callout>
      </section>
    </div>
  );
}
