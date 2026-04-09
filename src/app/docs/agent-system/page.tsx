import type { Metadata } from "next";
import { Callout, Prose } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "what-it-is", label: "What it is" },
  { id: "the-loop", label: "The loop" },
  { id: "tools", label: "Tool surface" },
  { id: "self-correction", label: "Self correction" },
  { id: "ambiguity", label: "When it asks" },
  { id: "memory", label: "Memory and sessions" },
  { id: "charts", label: "Charts" },
];

export const metadata: Metadata = {
  title: "AI Agent | FAVOR Docs",
  description:
    "How the FAVOR research agent plans, runs, and self corrects over genomic data. Engineering notes on the design, not a contract.",
};

export default function AgentSystemDocsPage() {
  return (
    <div className="space-y-12">
      <DocsToc items={TOC_ITEMS} />

      <div>
        <Prose>
          <h1>AI Agent</h1>
          <p>
            A research agent that plans multi step work, runs it against live
            data, and synthesises a result.
          </p>
        </Prose>

        <Callout variant="info" title="Engineering notes, not a contract">
          This page describes how the agent is put together today. Specific
          tools, prompts, and counts change as we learn what works. For a user
          guide to the agent, see the <a href="/docs/agent">Portal Guide</a>.
        </Callout>
      </div>

      <section>
        <Prose>
          <h2 id="what-it-is">What it is for</h2>
          <p>
            Research workflows on FAVOR tend to look the same. You start with a
            question, pick a variant list or a gene, filter, rank, run a
            statistic, make a chart, and write it up. Most of those steps are
            mechanical once you know what you are trying to do. The agent exists
            to take a plain language question and walk that whole path for you,
            so you can read the result and decide what to do next.
          </p>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="the-loop">The loop</h2>
          <p>
            Every turn follows the same shape. Think, do, check, repeat, or
            answer.
          </p>
          <ol>
            <li>
              <strong>Read the workspace.</strong> What variant list is loaded,
              what fields are available, what did previous turns save. The agent
              starts every turn with a fresh snapshot of the session state, so
              it can make decisions based on the most up to date information.
            </li>
            <li>
              <strong>Think.</strong> Based on the question and the workspace,
              the agent thinks of a few possible next steps it could take.
            </li>
            <li>
              <strong>Pick a tool.</strong> Based on the question, the agent
              picks one action to take next.
            </li>
            <li>
              <strong>Run it.</strong> The tool executes against real data. The
              result comes back as structured output.
            </li>
            <li>
              <strong>Check.</strong> Did it work. Did it return nothing. Is
              something obviously wrong. If so, try a safer approach. If not,
              decide whether to stop or continue.
            </li>
            <li>
              <strong>Synthesise.</strong> When enough steps have run, the agent
              writes a short answer grounded in the tool outputs and points at
              the artifacts (charts, tables, saved variant lists).
            </li>
          </ol>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="tools">Tool surface</h2>
          <p>
            The agent can only do what its tools let it do. The tools are kept
            deliberately small, and each one has a single job.
          </p>
        </Prose>
        <div className="mt-4 space-y-3">
          {[
            {
              name: "See the workspace",
              body: "Look at what is currently loaded: active variant list, available fields, pinned entities, running jobs. Never guesses context.",
            },
            {
              name: "Read one thing",
              body: "Pull a single variant, gene, variant list, or result with enough context to reason about it.",
            },
            {
              name: "Find something by name",
              body: "Resolve a human phrase into the right entity, field, or method. Handles typos and returns ranked options when it is ambiguous.",
            },
            {
              name: "Do work",
              body: "Run a filter, a ranking, an analysis, or a graph traversal. Goes through a validation layer that fixes common mistakes before anything runs.",
            },
            {
              name: "Ask the user",
              body: "When there is more than one reasonable thing to do, the agent asks one precise question with choices instead of guessing.",
            },
          ].map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {t.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Tool names and parameters are internal and will change.
        </p>
      </section>

      <section>
        <Prose>
          <h2 id="self-correction">Self correction</h2>
          <p>
            Most agent failures fall into a few categories. The system tries to
            handle each one before asking the user.
          </p>
          <ul>
            <li>
              <strong>Typos in field names.</strong> If the agent asks for
              <code>cadd</code> on a variant list that has{" "}
              <code>cadd_phred</code>, it gets automatically corrected silently.
            </li>
            <li>
              <strong>Empty results.</strong> When a query returns nothing, the
              pipeline probes the filters one at a time to figure out which one
              was the culprit, and suggests relaxing it.
            </li>
            <li>
              <strong>Degenerate results.</strong> If the agent runs something
              that returns a result but it is not useful (a chart with one bar,
              a gene list with one gene), it tries again with a more
              conservative approach.
            </li>
            <li>
              <strong>Method that cannot run.</strong> If the requested analysis
              cannot converge, the system falls back to a safer method and
              explains why.
            </li>
            <li>
              <strong>Repeated failures.</strong> If the same thing fails twice,
              the agent stops retrying and asks the user one clear question. It
              never loops forever.
            </li>
          </ul>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="ambiguity">When it asks</h2>
          <p>The agent asks the user in three situations.</p>
          <ol>
            <li>
              <strong>Two good interpretations.</strong> You asked for something
              that could mean more than one thing, and both answers are valid.
            </li>
            <li>
              <strong>The data cannot answer the question.</strong> The target
              has no variation, the variant list is too small, or the required
              columns are not present.
            </li>
            <li>
              <strong>It is about to do something expensive.</strong> A query
              that would cost real resources is surfaced before it runs, so you
              can say yes or narrow it down.
            </li>
          </ol>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="memory">Memory and sessions</h2>
          <p>The agent keeps three kinds of state.</p>
          <ul>
            <li>
              <strong>Session state.</strong> The current conversation, the
              active variant list, running jobs. Fresh at the start of every
              session.
            </li>
            <li>
              <strong>Pinned items.</strong> Entities you asked it to remember
              within a session. Used to avoid re resolving things you just
              talked about.
            </li>
            <li>
              <strong>Saved findings.</strong> Notes saved across sessions. The
              agent can look these up when a new question touches something you
              worked on before.
            </li>
          </ul>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="charts">Charts</h2>
          <p>
            Charts are produced by deterministic mappers over tool outputs. The
            same output always makes the same chart.
          </p>
          <p>Every chart is traceable to the tool call that produced it.</p>
        </Prose>
      </section>

      <section>
        <Callout
          variant="warning"
          title="Research tool, not a diagnostic system"
        >
          FAVOR&rsquo;s agent accelerates hypothesis generation and data
          analysis. Validate findings through standard scientific methods.
        </Callout>
      </section>
    </div>
  );
}
