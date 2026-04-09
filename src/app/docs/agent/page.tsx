import type { Metadata } from "next";
import Link from "next/link";
import { Callout, Prose } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "capabilities", label: "Best uses" },
  { id: "getting-started", label: "Getting started" },
  { id: "how-to-ask", label: "How to ask" },
  { id: "example-prompts", label: "Example prompts" },
  { id: "operations", label: "Available operations" },
  { id: "limits", label: "Limits" },
];

export const metadata: Metadata = {
  title: "AI Agent | FAVOR Docs",
  description:
    "How to use FAVOR-GPT effectively for variant list analysis, graph exploration, and follow-up statistics.",
};

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function Prompt({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 px-3.5 py-2.5">
      <span className="mt-px shrink-0 text-sm text-primary">&rsaquo;</span>
      <p className="text-sm text-foreground">{children}</p>
    </div>
  );
}

export default function AgentDocsPage() {
  return (
    <div className="space-y-14">
      <DocsToc items={TOC_ITEMS} />

      <Prose>
        <h1>AI Agent (FAVOR-GPT)</h1>
        <p>
          FAVOR-GPT is the conversational layer on top of FAVOR. It is most
          useful when your question is multi-step: find the right entities,
          inspect a variant list, run an analysis, then turn the result into a
          table or chart without leaving the same session.
        </p>
      </Prose>

      <section className="space-y-4">
        <h2 id="capabilities" className="text-lg font-semibold text-foreground">
          Best uses
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card
            title="Variant list follow-up"
            desc="Start from a batch-annotated variant list, rank variants, filter by annotations, and ask for summary analyses."
          />
          <Card
            title="Graph exploration"
            desc="Compare genes, diseases, drugs, and variants, then walk paths and neighbourhoods in the knowledge graph."
          />
          <Card
            title="Statistical analysis"
            desc="Run PCA, regression, clustering, correlations, hypothesis tests, and QC workflows when the question needs actual computation."
          />
          <Card
            title="Reusable sessions"
            desc="Keep one session open while you refine the question. Entities, variant lists, and prior results stay in context across turns."
          />
          <Card
            title="Output generation"
            desc="Turn tool outputs into tables, plots, and concise summaries without manually exporting intermediate results."
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2
          id="getting-started"
          className="text-lg font-semibold text-foreground"
        >
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
                  Select a variant list from a{" "}
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
              title: "Ask for a concrete operation",
              desc: "Request a comparison, ranking, plot, QC pass, or statistical test so the agent can choose the right tool path.",
            },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
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

      <section className="space-y-4">
        <h2 id="how-to-ask" className="text-lg font-semibold text-foreground">
          How to ask
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            title="Name the variant list or entity"
            desc="The agent is more reliable when you anchor the conversation on a concrete variant list, gene, disease, or variant set."
          />
          <Card
            title="Ask for an operation"
            desc="Use verbs like compare, rank, summarize, test, plot, or explain so the agent can choose the right tool sequence."
          />
          <Card
            title="State the output shape"
            desc="If you want a table, chart, shortlist, or QC summary, say that explicitly. It reduces back-and-forth."
          />
          <Card
            title="Keep related work in one session"
            desc="A single session works better than restarting, because the agent can build on previous variant list selections and findings."
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2
          id="example-prompts"
          className="text-lg font-semibold text-foreground"
        >
          Example prompts
        </h2>
        <div className="space-y-2">
          <Prompt>
            Set variant list &lt;id&gt; and show the top 10 variants by CADD
            with consequence and ClinVar labels.
          </Prompt>
          <Prompt>
            Give me a QC summary for this variant list and flag possible
            data-quality issues before analysis.
          </Prompt>
          <Prompt>
            Compare BRCA1 and TP53 for shared disease neighbours and show the
            strongest links.
          </Prompt>
          <Prompt>
            Find paths from BRCA1 to breast cancer and summarize the shortest
            evidence-backed routes.
          </Prompt>
          <Prompt>
            Run PCA on the numeric annotations in this variant list and explain
            the first two components.
          </Prompt>
          <Prompt>
            Create a variant list from these variants: rs123, rs456, rs789, then
            rank them by deleteriousness.
          </Prompt>
        </div>
      </section>

      <section className="space-y-4">
        <h2 id="operations" className="text-lg font-semibold text-foreground">
          Available operations
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2.5 pr-4 text-left font-semibold text-foreground">
                  Domain
                </th>
                <th className="py-2.5 text-left font-semibold text-foreground">
                  Operations
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  domain: "Variant list",
                  ops: "Query rows, filter and sort, group-by aggregation, derive sub-lists, composite scoring, variant prioritization, export",
                },
                {
                  domain: "Analytics",
                  ops: "Regression, PCA, clustering, correlation, hypothesis testing, GWAS QC",
                },
                {
                  domain: "Graph",
                  ops: "Explore neighbors, compare entities, find shortest paths, enrichment queries, structural pattern matching",
                },
                {
                  domain: "Workspace",
                  ops: "Pin entities, switch variant lists, and save memories across sessions",
                },
              ].map((row) => (
                <tr
                  key={row.domain}
                  className="border-b border-border last:border-0"
                >
                  <td className="whitespace-nowrap py-3 pr-4 align-top font-medium text-foreground">
                    {row.domain}
                  </td>
                  <td className="py-3 text-muted-foreground">{row.ops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <Callout variant="tip" title="Tips">
          <ul className="mt-1 list-disc space-y-1 pl-4">
            <li>
              Start with a variant list or entity context. The agent works best
              when it knows what data you are working with.
            </li>
            <li>
              Exact column names are faster, but close matches auto-correct.
            </li>
            <li>
              Keep the same session for related analyses so the working context
              accumulates across turns.
            </li>
            <li>
              Plain labels like "BRCA1" work for graph queries. The agent will
              resolve them automatically.
            </li>
          </ul>
        </Callout>
      </section>

      <section className="space-y-4">
        <h2 id="limits" className="text-lg font-semibold text-foreground">
          Limits
        </h2>
        <Callout variant="warning" title="Interpretation">
          FAVOR-GPT is a decision-support tool, not a diagnostic system. Treat
          outputs as hypotheses to validate, not conclusions to cite.
        </Callout>
      </section>

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
