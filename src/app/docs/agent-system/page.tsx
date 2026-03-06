import type { Metadata } from "next";
import { Prose, Callout } from "../_components/doc-primitives";
import { StatBanner } from "../_components/stat-banner";
import { DataFlowDiagram } from "../_components/data-flow-diagram";
import { TechCard } from "../_components/tech-card";
import { AgentArchDiagram } from "../_components/agent-arch-diagram";

export const metadata: Metadata = {
  title: "AI Agent | FAVOR Docs",
  description:
    "A tool-using AI system that plans, executes, self-corrects, and synthesizes over structured genomic data. 4 domains, 26 operations, full reliability pipeline.",
};

export default function AgentSystemDocsPage() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <div>
        <Prose>
          <h1>AI Agent</h1>
          <p>
            A tool-using reasoning system that plans multi-step analytical
            workflows, executes them against structured genomic data, and
            self-corrects on failure. Five tools, four command domains, a full
            reliability pipeline from validation to graduated escalation.
          </p>
        </Prose>
        <div className="mt-6">
          <StatBanner
            stats={[
              { value: "4", label: "Domains", detail: "Cohort, Analyze, Graph, Workspace" },
              { value: "5", label: "Tools", detail: "State, Read, Search, Run, AskUser" },
              { value: "9", label: "Analyze ops", detail: "Regression, PCA, clustering, and more" },
              { value: "12", label: "Chart types", detail: "Same output always makes the same chart" },
            ]}
          />
        </div>
      </div>

      {/* What it solves */}
      <section>
        <Prose>
          <h2>What it solves</h2>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Problem</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Solution</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Guardrail</th>
              </tr>
            </thead>
            <tbody>
              {[
                { prob: "Signal to mechanism", sol: "Drug repurposing, target identification, enrichment, phenotype mapping via natural language", guard: "Doesn't dead-end. Auto-selects traversal direction from intent. If the first plan fails or is ambiguous, it tries a safer alternative and returns the best partial answer with a clear next step." },
                { prob: "Variant prioritization", sol: "Annotate and rank by any score; composite scoring with normalization", guard: "Rankings are reproducible and explainable. Inputs, weights, and corrections are recorded." },
                { prob: "Statistical analysis", sol: "Async PCA / regression / clustering", guard: "Falls back to alternative methods automatically. Retries are idempotent and never corrupt state." },
                { prob: "Cross-session memory", sol: "Pin entities, save findings, continuous conversation across sessions", guard: "Asks rather than guessing when recall is ambiguous." },
                { prob: "Visualization", sol: "Deterministic charts from tool outputs", guard: "Charts are generated from data, not invented. Insufficient data yields no chart, not nonsense." },
                { prob: "Multi-step composition", sol: "Chain graph → cohort → stats → charts", guard: "Prevents infinite loops. Surfaces one precise question when stuck." },
              ].map((row) => (
                <tr key={row.prob} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.prob}</td>
                  <td className="py-3 pr-4 text-muted-foreground align-top">{row.sol}</td>
                  <td className="py-3 text-muted-foreground align-top">{row.guard}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Architecture */}
      <section>
        <Prose>
          <h2>Architecture</h2>
          <p>
            Tool-loop: observe workspace state, select a tool, execute through
            the reliability pipeline, collect results, decide whether to call
            another tool or synthesize. Up to 8 steps per turn with token
            budget monitoring and stuck-loop detection.
          </p>
        </Prose>
        <div className="mt-4">
          <AgentArchDiagram />
        </div>
      </section>

      {/* Five-tool surface */}
      <section>
        <Prose>
          <h2>Five-tool surface</h2>
          <p>
            Five non-overlapping tools. Each one does exactly one job, describes
            itself to the model, and stays out of the others&apos; way.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Tool</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Purpose</th>
                <th className="text-left py-2.5 font-semibold text-foreground">What it actually does</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tool: "State (Context)", purpose: "Workspace snapshot", detail: "Where are we right now? Current dataset, available fields, what you've saved, what's running, and what the agent should remember." },
                { tool: "Read", purpose: "Get details", detail: "Show me one thing clearly. Pull a specific item (variant, gene, cohort, result) with the right context and formatting. No raw dumps." },
                { tool: "Search", purpose: "Resolve names", detail: "Turn what I typed into the right thing. Finds the correct entity, field, or method even with typos, and returns ranked options if ambiguous." },
                { tool: "Run", purpose: "Do the work", detail: "Execute an action. Filtering, ranking, analysis, or graph traversal runs through validation + safe auto-fixes, and returns results or a fix-it plan." },
                { tool: "AskUser", purpose: "Clarify ambiguity", detail: "Don't guess, ask. When there are multiple plausible interpretations, it asks one precise question with choices." },
              ].map((row) => (
                <tr key={row.tool} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.tool}</td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap align-top">{row.purpose}</td>
                  <td className="py-3 text-muted-foreground">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Command domains */}
      <section>
        <Prose>
          <h2>Four domains, one command surface</h2>
          <p>
            Run is one door into four kinds of work. You tell it what
            you&apos;re trying to do (cohort, analyze, graph, or
            workspace). It picks the correct operation, validates inputs, and
            either returns results or a ready-to-run fix.
          </p>
        </Prose>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TechCard
            name="Cohort"
            purpose="Work with your uploaded variants, GWAS hits, and credible sets"
            stat="5"
            statLabel="Operations"
            index={0}
            details={[
              "Filter and page through variants with any combination of scores and annotations",
              "Summarize distributions: counts, histograms, aggregations over any column",
              "Create focused sub-cohorts from filters for downstream analysis",
              "Rank variants by one or more annotation scores",
              "Build weighted composite scores with automatic normalization",
            ]}
          />
          <TechCard
            name="Analyze"
            purpose="Run statistical analyses asynchronously with automatic polling"
            stat="9"
            statLabel="Operations"
            index={1}
            headlineCount={3}
            details={[
              "Run regression (linear, logistic, or elastic net with auto-fallback)",
              "Reduce dimensions with PCA and explained variance",
              "Cluster variants or samples (k-means, hierarchical)",
              "Compute correlations with confidence metrics",
              "Rank feature importance with permutation testing",
              "Correct p-values for multiple testing (BH, Bonferroni, Holm)",
              "Estimate confidence intervals via bootstrap",
              "Run permutation-based hypothesis tests",
              "Test polygenic risk score associations",
            ]}
          />
          <TechCard
            name="Graph"
            purpose="Explore and traverse the 191M-edge biomedical knowledge graph"
            stat="8"
            statLabel="Modes"
            index={2}
            headlineCount={3}
            details={[
              "Find neighbors, ranked by edge type and evidence score",
              "Multi-hop traversal driven by intent, with automatic backtracking",
              "Enrichment analysis (Fisher's exact test for pathway over-representation)",
              "Compare entities: shared vs. unique connections at a glance",
              "Find similar entities by shared connection patterns",
              "Deep entity profiles with structured evidence sections",
              "Aggregate across connections: count, avg, sum, min, max with grouping",
              "Shortest-path search between any two entities",
              "Structural pattern matching on the full graph",
            ]}
          />
          <TechCard
            name="Workspace"
            purpose="Save session progress so every conversation picks up where you left off"
            stat="4"
            statLabel="Operations"
            index={3}
            details={[
              "Switch the active cohort (schema auto-loads)",
              "Pin entities for quick reference across turns",
              "Save analysis notes to cross-session semantic memory",
              "Export cohort data and artifacts",
            ]}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Engineering note: every operation is strictly typed and validated. Invalid parameter combinations are rejected before execution.
        </p>
      </section>

      {/* Reliability pipeline */}
      <section>
        <Prose>
          <h2>Reliability pipeline</h2>
          <p>
            Every agent request returns either results or a ready-to-run fix.
          </p>
        </Prose>
        <div className="mt-4 space-y-4">
          {[
            {
              step: "1",
              title: "Make it runnable",
              output: "typed request",
              desc: "Parse, fill defaults, normalize parameters.",
            },
            {
              step: "2",
              title: "Prevent predictable mistakes",
              output: "corrected request + data menu",
              desc: "Check cohort, fetch the field list, auto-correct field names, guard against oversized jobs.",
            },
            {
              step: "3",
              title: "Run with a receipt",
              output: "result + trace ID",
              desc: "Execute the handler. Always return the same response shape plus a trace ID.",
            },
            {
              step: "4",
              title: 'Explain "nothing happened"',
              output: "fixes + next steps",
              desc: "Attach what was corrected. If results are empty, probe the likely culprit and suggest a retry.",
            },
            {
              step: "5",
              title: "Stop loops",
              output: "results or a precise question",
              desc: "1st: apply a fix. 2nd: reload + alternate approach. 3rd: ask you one clear question.",
            },
          ].map((s) => (
            <div key={s.step} className="flex gap-4">
              <span className="text-sm font-bold text-foreground tabular-nums w-4 shrink-0 pt-0.5">
                {s.step}
              </span>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">{s.title}</span>
                  <span className="text-muted-foreground ml-1.5">({s.output})</span>
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Example</p>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-foreground">&ldquo;Group by CADD score&rdquo;</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-muted-foreground">agent sends <code className="text-xs bg-muted px-1 py-0.5 rounded">cadd</code></span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-muted-foreground">auto-corrected to <code className="text-xs bg-muted px-1 py-0.5 rounded">cadd_phred</code></span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-foreground font-medium">succeeds on first try</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">You never see the typo. The pipeline fixes it before execution.</p>
        </div>
      </section>

      {/* Error handling */}
      <section>
        <Prose>
          <h2>Self-correcting error handling</h2>
          <p>
            Every failure is classified, tagged with a hint, and paired with a
            recovery action the agent can execute immediately.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="Error classification"
            steps={[
              { label: "Client errors", detail: "validation, missing_param, unknown_command, entity_not_found" },
              { label: "API errors", detail: "bad_request, not_found, auth, rate_limit, timeout, server_error" },
              { label: "Operational", detail: "analytics_failed, cohort_processing_failed, internal_error" },
              { label: "Recovery", detail: "Structured next_actions with tool, args, reason, confidence" },
            ]}
          />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">Mechanism</th>
                <th className="text-left py-2.5 font-semibold text-foreground">How it works</th>
              </tr>
            </thead>
            <tbody>
              {[
                { mech: "Column auto-correction", how: "Fuzzy-matches misspelled column names using multiple signals. High confidence: auto-corrects silently. Low confidence: asks you." },
                { mech: "Empty result probing", how: "When a query returns nothing, probes suspect filters one by one to find the culprit. Suggests relaxed filters with confidence." },
                { mech: "Graph chain fallback", how: "Batch traversal fails → falls back to per-step ranked-neighbor calls. Partial results always preserved." },
                { mech: "Graduated escalation", how: "Tracks repeated failures per operation. 1st: tries an automatic fix. 2nd: reloads context and tries an alternate approach. 3rd: asks you one precise question." },
                { mech: "Idempotent retries", how: "Retries are keyed so they never produce duplicate side effects. Only transient errors (rate limits, timeouts, server errors) are retried." },
              ].map((row) => (
                <tr key={row.mech} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.mech}</td>
                  <td className="py-3 text-muted-foreground">{row.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data-quality auto-recovery */}
      <section>
        <Prose>
          <h2>Data-quality auto-recovery</h2>
          <p>
            Not all failures are crashes. Many are &ldquo;the data can&apos;t
            support the question.&rdquo; We detect those early and return a
            safer alternative.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">Mechanism</th>
                <th className="text-left py-2.5 font-semibold text-foreground">How it works</th>
              </tr>
            </thead>
            <tbody>
              {[
                { mech: "Degenerate target detection", how: "If the label has no variation (all 0s, all 1s, 99.9% one class), we stop before training and suggest the nearest meaningful analysis: rates, stratified counts, or a different target." },
                { mech: "Coverage-aware feature gating", how: "Auto-drops columns that are mostly null or have near-zero coverage. Suggests higher-coverage substitutes, or asks one precise question to proceed." },
                { mech: "Too-small sample guard", how: "If the filtered cohort is below the minimum size for the requested method, we refuse to run junk stats and suggest widening filters or switching to summary mode." },
                { mech: "Unstable fit fallback", how: "If the model fit becomes unstable (infinite or implausible coefficients), we automatically regularize or switch methods and explain why." },
                { mech: "Model robustness fallback", how: "If the math breaks (collinearity, singular matrices, unstable fits), we fall back to safer methods automatically." },
                { mech: "Robust scaling guard", how: "Auto-detects extreme outliers and applies robust scaling so one data point can't hijack results. Asks before transforming if the impact is large." },
                { mech: "Multiple-testing auto-correction", how: "If many hypotheses are tested, results are automatically corrected and ranked by effect size, not just p-values." },
                { mech: "Cost-aware query fallback", how: "If a request will explode in size or cost, we cap, sample, or suggest a narrower query before timing out." },
              ].map((row) => (
                <tr key={row.mech} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.mech}</td>
                  <td className="py-3 text-muted-foreground">{row.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Model guardrails */}
      <section>
        <Prose>
          <h2>Keeping the model on track</h2>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">Guardrail</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Mechanism</th>
              </tr>
            </thead>
            <tbody>
              {[
                { guard: "Token budget", mech: "Fixed budget per session. At 75% the agent starts summarizing; at 90% it must conclude. Never loses track mid-task." },
                { guard: "Stuck-loop detection", mech: "If it repeats the same failing action, it stops and explains what failed instead of burning cycles." },
                { guard: "Output compaction", mech: 'The agent sees only what it needs (top results + "how to fetch more"). Full results still show in the UI and exports.' },
                { guard: "Context snapshot", mech: 'Each turn includes a "you are here" snapshot: current dataset, available fields, saved items, and running jobs. Never guesses context.' },
                { guard: "Query classification", mech: "Simple questions skip the tool loop and answer directly. Tools run only when data access is required." },
                { guard: "Evidence-first scientific claims", mech: 'For scientific statements, the agent must cite a tool result from your data or graph. If it can\'t, it says "no data found."' },
                { guard: "Cost-aware planning", mech: "The agent probes with low-cost queries before running expensive jobs, and surfaces cost when it matters." },
              ].map((row) => (
                <tr key={row.guard} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.guard}</td>
                  <td className="py-3 text-muted-foreground">{row.mech}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Example run */}
      <section>
        <Prose>
          <h2>Example run</h2>
          <p>
            A single user question triggers multi-step tool execution with
            self-correction.
          </p>
        </Prose>
        <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
          {/* User question */}
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">
              User
            </p>
            <p className="text-sm text-foreground">
              &ldquo;Which variants in my GWAS cohort have the highest CADD
              scores, and are any in TP53-related pathways?&rdquo;
            </p>
          </div>
          {/* Tool calls */}
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Agent execution (3 tool calls)
            </p>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-medium text-foreground">
                    Run <span className="font-mono text-xs text-muted-foreground">cohort.rank</span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    sort_by: &ldquo;cadd_pherd&rdquo; &rarr; <span className="text-primary font-medium">auto-corrected to &ldquo;cadd_phred&rdquo;</span> (0.91 Levenshtein)
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-medium text-foreground">
                    Search <span className="font-mono text-xs text-muted-foreground">entity:&ldquo;TP53&rdquo;</span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Resolved to Gene:7157 via 5-tier cascade (exact match, tier 1)
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-medium text-foreground">
                    Run <span className="font-mono text-xs text-muted-foreground">graph.explore_enrich</span>
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Fisher&apos;s exact test: 3 pathway overlaps (p &lt; 0.001), bar chart generated
                  </p>
                </div>
              </li>
            </ol>
          </div>
          {/* Result */}
          <div className="px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Result
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Top 15 variants ranked by CADD, 3 in TP53 pathways (apoptosis,
              cell cycle, DNA damage response). Enrichment bar chart attached.
              Correction noted in trace: <span className="font-mono text-xs">cadd_pherd &rarr; cadd_phred</span>.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
              trace: abc-123 &middot; 3 tool calls &middot; 1 auto-correction &middot; 4.2s total
            </p>
          </div>
        </div>
      </section>

      {/* Session persistence */}
      <section>
        <Prose>
          <h2>Session persistence</h2>
          <p>
            Sessions, messages, tool calls, and artifacts persisted in
            PostgreSQL with optimistic concurrency. Large tool outputs compacted
            to artifact references. Semantic memories use pgvector for
            cosine-similarity retrieval across sessions. SSE delivers
            token-by-token updates while artifacts accumulate server-side.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="Session lifecycle"
            steps={[
              { label: "Load state", detail: "Workspace + system prompt" },
              { label: "Execute tools", detail: "Pipeline, collect state deltas" },
              { label: "Apply deltas", detail: "Optimistic PATCH with version check" },
              { label: "Compact artifacts", detail: "Large outputs → lightweight refs" },
              { label: "Persist", detail: "Messages, traces, feedback to PostgreSQL" },
            ]}
          />
        </div>
      </section>

      {/* Visualization engine */}
      <section>
        <Prose>
          <h2>Visualization engine</h2>
          <p>
            Every chart is produced by a deterministic mapper: same tool output
            always makes the same chart. If the data is insufficient, the mapper
            returns nothing instead of a broken graphic. Every chart links back
            to the exact tool call that produced it.
          </p>
        </Prose>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Bar charts", desc: "Ranked scores, counts, GWAS p-values. Auto-sorted, auto-labeled." },
            { title: "Scatter plots", desc: "X/Y with optional regression line. PCA projections with explained variance." },
            { title: "Enrichment plots", desc: "-log₁₀(adjusted p) with fold enrichment and overlap counts per pathway." },
            { title: "QQ plots", desc: "Expected vs observed -log₁₀(p). Standard diagnostic for GWAS quality control." },
            { title: "Heatmaps", desc: "Correlation matrices, clustering dendrograms. Color scale auto-fitted to value range." },
            { title: "Distribution plots", desc: "Histograms and category breakdowns from groupby output. Bin count auto-selected." },
            { title: "Network diagrams", desc: "Mini subgraphs from path queries. Top 5 shortest paths with scored edges." },
            { title: "Stat cards", desc: "Correlation coefficient, sample size, means, standard deviations. Compact summary format." },
            { title: "Comparison tables", desc: "Side-by-side entity comparison. Shared vs unique connections at a glance." },
            { title: "Protein architecture", desc: "Domain structure diagrams with AlphaFold confidence overlay." },
            { title: "Analytics charts", desc: "PCA scatter, regression QQ, cluster centers, feature importance. One chart per analysis type." },
            { title: "Provenance", desc: "Every visualization carries a trace ID linking it to the tool call, parameters, and data that produced it." },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Design philosophy */}
      <section>
        <Prose>
          <h2>Design philosophy</h2>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Principle</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Implementation</th>
              </tr>
            </thead>
            <tbody>
              {[
                { princ: "Small tool surface", impl: "Ship a small set of non-overlapping tools tied to high-impact workflows; add tools only when evaluations show repeatable need." },
                { princ: "Tools do deterministic work", impl: "Prefer tools that complete an entire workflow (and return the context needed for the next step) over chains of brittle micro-tools." },
                { princ: "Meaningful, usable outputs", impl: "Return human-readable summaries by default; provide IDs/structured fields when downstream calls need them (concise vs detailed modes)." },
                { princ: "Token-efficient by default", impl: "Pagination, filtering, truncation, and sensible defaults to keep tool outputs within context budgets." },
                { princ: "Unambiguous tool specs", impl: "Clear parameter names, examples, and model-friendly output formats; treat tool definitions like part of the prompt." },
                { princ: "Actionable failures", impl: "Errors return a concrete recovery action (arguments + confidence), not a traceback, so the agent can retry correctly." },
              ].map((row) => (
                <tr key={row.princ} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.princ}</td>
                  <td className="py-3 text-muted-foreground">{row.impl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Disclaimer */}
      <section>
        <Callout variant="warning" title="Research tool, not a diagnostic system">
          FAVOR&rsquo;s AI agent accelerates hypothesis generation and data
          analysis. Validate findings through standard scientific methods.
          Treat agent outputs as leads to investigate, not conclusions to cite.
        </Callout>
      </section>
    </div>
  );
}
