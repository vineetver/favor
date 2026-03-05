import type { Metadata } from "next";
import Link from "next/link";
import { ApiEndpoint } from "../_components/api-doc-blocks";
import { MediaSlot } from "../_components/media-slot";

export const metadata: Metadata = {
  title: "AI Agent | FAVOR Docs",
  description:
    "How to use FAVOR-GPT effectively, including common tasks and practical prompt examples.",
};

export default function AIAgentDocsPage() {
  return (
    <div className="max-w-5xl">
      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          FAVOR-GPT Documentation
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          AI Agent: Runtime + Backend Contract
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          This page maps the in-app runtime to authenticated <code>/agent/*</code>{" "}
          routes in <code>../new-api</code>, including session, state, memory,
          artifact, and job-event packets.
        </p>
      </header>

      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          On this page
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["start", "How to start"],
            ["architecture", "Architecture"],
            ["data-flow", "Data flow"],
            ["api-surface", "API surface"],
            ["tool-surface", "Tool surface"],
            ["guardrails", "Guardrails"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      <section id="start" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-foreground">How users should start</h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
          <li>
            Open <Link href="/agent" className="text-primary hover:underline">/agent</Link> and provide a concrete output target.
          </li>
          <li>Set or create cohort context first for cohort analytics requests.</li>
          <li>Request explicit operations (rows, groupby, prioritize, graph traversal, export).</li>
          <li>Keep the same session to preserve state, memory, and artifacts.</li>
        </ol>
      </section>

      <section id="architecture" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-foreground">Full architecture</h2>
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 overflow-x-auto">
          <pre className="text-xs sm:text-sm text-foreground leading-relaxed">
{`┌────────────────────────────────────────────────────────────────────────────┐
│ Presentation Layer                                                        │
│  /agent page -> chat UI (timeline, tool rendering, viz panel)            │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Transport & Route Layer                                                   │
│  POST /api/chat                                                           │
│  - Executes tool loop                                                     │
│  - Persists messages/state/artifacts via backend routes                   │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Protected API Surface                                                     │
│  /agent/* + /cohorts/* + graph endpoints                                 │
└─────────────────────────────┬──────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Persistence Layer                                                         │
│  PostgreSQL agent tables + artifact store + S3 + cohort query services   │
└────────────────────────────────────────────────────────────────────────────┘`}
          </pre>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Architecture diagram image slot"
          description="Recommended file: /public/docs/agent/architecture-overview.png"
        />
        <MediaSlot
          type="video"
          title="Architecture walkthrough video slot"
          description="Recommended file: /public/docs/agent/architecture-walkthrough.mp4"
        />
      </section>

      <section id="data-flow" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-foreground">End-to-end data flow</h2>
        <div className="mt-4 rounded-2xl border border-border bg-card p-6">
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Session created/read through <code>/agent/sessions*</code> routes.</li>
            <li>Message append writes to <code>agent_messages</code> and triggers async embedding attempt.</li>
            <li>State mutations use <code>expected_version</code> for optimistic concurrency.</li>
            <li>Runtime tools invoke cohorts/graph APIs for analysis tasks.</li>
            <li>Artifacts and job metadata persist under session scope.</li>
            <li>Job progress can stream over SSE via <code>/agent/jobs/{`{id}`}/events</code>.</li>
          </ol>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Data flow diagram image slot"
          description="Recommended file: /public/docs/agent/data-flow.png"
        />
        <MediaSlot
          type="video"
          title="Data flow replay video slot"
          description="Recommended file: /public/docs/agent/data-flow-replay.mp4"
        />
      </section>

      <section id="api-surface" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-foreground">Agent backend API surface</h2>
        <div className="mt-4 space-y-5">
          <ApiEndpoint
            method="POST"
            path="/agent/sessions"
            auth="Authenticated"
            summary="Create session with optional title and metadata."
            requestFields={[
              { name: "title", type: "string" },
              { name: "metadata", type: "json" },
            ]}
            responseFields={[
              { name: "session_id", type: "uuid" },
              { name: "tenant_id", type: "string" },
              { name: "state_json/state_version", type: "json + int" },
              { name: "created_at/last_activity_at", type: "timestamp" },
            ]}
          />
          <ApiEndpoint
            method="POST"
            path="/agent/sessions/{id}/messages"
            auth="Authenticated"
            summary="Append message and return persisted AgentMessage."
            requestFields={[
              { name: "role", type: "string", required: true },
              { name: "content", type: "string", required: true },
              { name: "metadata", type: "json" },
            ]}
            responseFields={[
              { name: "id", type: "int64" },
              { name: "session_id", type: "uuid" },
              { name: "role/content/metadata", type: "payload" },
              { name: "created_at", type: "timestamp" },
            ]}
            notes={["Embedding write is fire-and-forget when OpenAI is configured."]}
          />
          <ApiEndpoint
            method="PATCH"
            path="/agent/sessions/{id}/state"
            auth="Authenticated"
            summary="JSON merge patch state update with optimistic version check."
            requestFields={[
              { name: "delta", type: "json", required: true },
              { name: "expected_version", type: "int", required: true },
            ]}
            responseFields={[
              { name: "state", type: "json" },
              { name: "version", type: "int" },
            ]}
            notes={["Conflict returned when expected_version is stale."]}
          />
          <ApiEndpoint
            method="POST"
            path="/agent/memories/search"
            auth="Authenticated"
            summary="Embedding-based nearest-neighbor memory retrieval."
            requestFields={[
              { name: "query", type: "string", required: true },
              { name: "limit", type: "int", notes: "default 10, max 100" },
            ]}
            responseFields={[{ name: "[]", type: "AgentMemory[]" }]}
          />
          <ApiEndpoint
            method="GET"
            path="/agent/jobs/{id}/events"
            auth="Authenticated"
            summary="SSE stream for job step telemetry."
            responseFields={[
              { name: "step event", type: "{step_index,name,status,output}" },
              { name: "complete event", type: "{status}" },
              { name: "timeout event", type: "{error}" },
            ]}
            notes={["Poll interval 500ms, timeout ~2 minutes in handler."]}
          />
        </div>
      </section>

      <section id="tool-surface" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold text-foreground">Tool surface (runtime)</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li><strong>state</strong>: workspace/session context snapshot.</li>
          <li><strong>read</strong>: deterministic resource retrieval by path.</li>
          <li><strong>search</strong>: scoped retrieval for entities/columns/methods.</li>
          <li><strong>run</strong>: cohort + analytics + graph execution commands.</li>
          <li><strong>askUser</strong>: explicit clarification branch.</li>
        </ul>
      </section>

      <section id="guardrails" className="mt-10 scroll-mt-24 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold text-foreground">Reliability and guardrails</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>API client uses deterministic idempotency key per path+body.</li>
          <li>Retries are bounded to 429/5xx/timeout classes.</li>
          <li>State writes are concurrency-safe via expected_version checks.</li>
          <li>SSE job stream has terminal events and hard timeout behavior.</li>
          <li>Cohort poll helper applies server poll hints and max wait ceiling.</li>
        </ul>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Tool-call timeline image slot"
          description="Recommended file: /public/docs/agent/tool-timeline.png"
        />
        <MediaSlot
          type="video"
          title="Live execution trace video slot"
          description="Recommended file: /public/docs/agent/live-trace.mp4"
        />
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl font-semibold text-foreground">Practical prompt patterns</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>"Set cohort &lt;id&gt; and show top 10 variants by CADD."</li>
          <li>"Give me a QC summary and flag potential data-quality issues."</li>
          <li>"Compare BRCA1 and TP53 for shared disease neighbors."</li>
          <li>"Find paths from BRCA1 to breast cancer and summarize shortest links."</li>
          <li>"Run PCA and explain principal components in plain language."</li>
        </ul>
      </section>
    </div>
  );
}
