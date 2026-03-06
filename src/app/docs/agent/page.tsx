import type { Metadata } from "next";
import Link from "next/link";
import { Prose, Callout, Step, CodeBlock } from "../_components/doc-primitives";

export const metadata: Metadata = {
  title: "AI Agent | FAVOR Docs",
  description:
    "How to use FAVOR-GPT effectively for variant analysis, cohort exploration, and graph queries.",
};

export default function AgentDocsPage() {
  return (
    <Prose>
      <h1>AI Agent (FAVOR-GPT)</h1>
      <p>
        FAVOR-GPT reasons over your data, runs statistical analyses, explores
        the biomedical knowledge graph, and generates visualizations &mdash; all
        through natural language.
      </p>

      <h2>Capabilities</h2>

      <div className="not-prose mt-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Capability</th>
              <th className="text-left py-2.5 font-semibold text-foreground">What it does</th>
            </tr>
          </thead>
          <tbody>
            {[
              { cap: "Variant ranking", desc: "Rank by CADD, LINSIGHT, gnomAD AF, or any annotation score with weighted composites" },
              { cap: "Quality control", desc: "QC summaries with distribution stats and data-quality flags" },
              { cap: "Statistical analytics", desc: "PCA, regression, clustering, correlation, and hypothesis tests on cohort data" },
              { cap: "Graph exploration", desc: "Discover neighbors, compare entities, find paths, enrichment across 14.8M entities" },
              { cap: "Visualization", desc: "Bar, scatter, distribution, heatmap, QQ plots, network diagrams — auto-generated" },
              { cap: "Cohort management", desc: "Create, filter, derive, and export variant cohorts" },
            ].map((row) => (
              <tr key={row.cap} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.cap}</td>
                <td className="py-3 text-muted-foreground">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Getting started</h2>
      <div className="not-prose">
        <Step number={1} title="Open the agent">
          Navigate to{" "}
          <Link href="/agent" className="text-primary hover:underline">
            /agent
          </Link>
          . Sessions persist context, state, and artifacts across turns.
        </Step>
        <Step number={2} title="Set your context">
          Create or select a cohort. Paste variant IDs or reference an existing{" "}
          <Link
            href="/batch-annotation"
            className="text-primary hover:underline"
          >
            batch annotation
          </Link>{" "}
          result.
        </Step>
        <Step number={3} title="Ask questions">
          Request analyses, comparisons, or explorations. The agent selects
          tools, runs them, and synthesizes results.
        </Step>
      </div>

      <h2>Effective prompts</h2>
      <CodeBlock title="Good prompts">
        {`"Set cohort <id> and show top 10 variants by CADD."
"Give me a QC summary and flag potential data-quality issues."
"Compare BRCA1 and TP53 for shared disease neighbors."
"Find paths from BRCA1 to breast cancer and summarize shortest links."
"Run PCA on numeric features and explain principal components."
"Create a cohort from these variants: rs123, rs456, rs789"`}
      </CodeBlock>

      <h2>Available operations</h2>

      <div className="not-prose mt-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Domain</th>
              <th className="text-left py-2.5 font-semibold text-foreground">Operations</th>
            </tr>
          </thead>
          <tbody>
            {[
              { domain: "Cohort", ops: "Query rows, filter/sort, group-by aggregation, derive sub-cohorts, composite scoring, variant prioritization, export" },
              { domain: "Analytics", ops: "Regression (linear, logistic, elastic net), PCA, clustering, correlation, hypothesis testing, GWAS QC. Async with auto-polling and charts" },
              { domain: "Graph", ops: "Explore neighbors, compare entities, find shortest paths, enrichment queries, structural pattern matching" },
              { domain: "Workspace", ops: "Pin entities, switch cohorts, save memories across sessions" },
            ].map((row) => (
              <tr key={row.domain} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.domain}</td>
                <td className="py-3 text-muted-foreground">{row.ops}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Tips</h2>
      <Callout variant="tip" title="Getting the most out of FAVOR-GPT">
        <ul className="list-disc pl-4 space-y-1 mt-1">
          <li>
            Start with a cohort or entity context &mdash; the agent works best
            when it knows what data you&rsquo;re working with.
          </li>
          <li>
            Use exact column names for annotation fields (the agent
            auto-corrects close matches, but exact is faster).
          </li>
          <li>
            Keep the same session for related analyses &mdash; the agent
            accumulates context and references prior results.
          </li>
          <li>
            Plain labels like &ldquo;BRCA1&rdquo; work for graph queries
            &mdash; the agent resolves them automatically.
          </li>
        </ul>
      </Callout>

      <Callout variant="warning" title="Interpretation">
        FAVOR-GPT is a decision-support tool, not a diagnostic system. Treat
        agent outputs as hypotheses to validate, not conclusions to cite.
      </Callout>
    </Prose>
  );
}
