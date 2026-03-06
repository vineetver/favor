import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Prose } from "../_components/doc-primitives";
import { SystemArchDiagram } from "../_components/system-arch-diagram";
import { StatBanner } from "../_components/stat-banner";

export const metadata: Metadata = {
  title: "Architecture | FAVOR Docs",
  description:
    "System architecture: six specialized databases, AI-native API design, and the engineering behind annotating 8.9 billion genetic variants — served at <10ms lookups, <50ms search, sub-1s analytics.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const engines = [
  {
    name: "RocksDB",
    purpose: "Point lookups",
    details: [
      "Bloom + ribbon filters reject 99.9% of misses without touching disk",
      "Custom binary format lets you jump to any of 232 fields by byte offset",
      "Batched multi-get hits 50k+ lookups/sec on NVMe with zero heap allocations",
    ],
  },
  {
    name: "ClickHouse",
    purpose: "Columnar analytics",
    details: [
      "MergeTree with LZ4 + delta encoding, 232 columns at ~6 bytes/row",
      "A query touching 3 columns reads just 1.3% of the data",
      "Materialized views at gene/region level eliminate re-scans",
    ],
  },
  {
    name: "PostgreSQL",
    purpose: "Transactions & auth",
    details: [
      "System of record for accounts, sessions, cohorts, API keys, and audit log",
      "Argon2id hashing, RBAC with admin/researcher/viewer roles",
      "pgvector for cosine-similarity over entity embeddings",
    ],
  },
  {
    name: "Kuzu",
    purpose: "Graph traversal",
    details: [
      "Embedded, so zero network hops and zero serialization overhead",
      "BFS fan-out, shortest paths, Jaccard similarity, Fisher's enrichment",
      "3-hop expansion across 2k nodes in <15ms, shipped as ~40KB",
    ],
  },
  {
    name: "Elasticsearch",
    purpose: "Full-text search",
    details: [
      "5-tier scoring cascade: exact > prefix > n-gram > fuzzy > synonym",
      "Cross-type anchor + pivot for ambiguous queries",
      "Batch resolution: 50 free-text inputs linked in one call",
    ],
  },
  {
    name: "S3 Data Lake",
    purpose: "Source of truth",
    details: [
      "Parquet columnar encoding, 25x compression ratio",
      "Every engine is a materialized view, rebuildable from the lake",
      "Versioned manifests track partitions, row counts, and checksums",
    ],
  },
];

const decisions = [
  {
    q: "Why six databases instead of one?",
    claim: "No single database handles all five access patterns well.",
    mechanism: "Each engine owns one pattern: RocksDB for sub-ms lookups, ClickHouse for columnar scans, Kuzu for graph traversal. S3 Parquet is the canonical source.",
    tradeoff: "Operational surface area of six engines, offset by each being a rebuildable materialized view.",
  },
  {
    q: "30TB to 1.2TB: how?",
    claim: "Parquet columnar encoding collapses sparse, categorical data.",
    mechanism: "~60% null columns collapse to 1-bit. Run-length encoding crushes categoricals with <50 distinct values. A 3-column query reads 1.3% of data.",
    tradeoff: "Encoding overhead on write; amortized by weekly batch ingest.",
  },
  {
    q: "How do six databases stay in sync?",
    claim: "They don't talk to each other.",
    mechanism: "Each engine runs idempotent ETL against the same S3 manifest — a versioned file listing every partition and checksum.",
    tradeoff: "Eventual consistency (minutes), acceptable for weekly-refresh scientific data.",
  },
  {
    q: "Why NATS over Kafka?",
    claim: "Three worker types and hours of retention. Kafka is overkill.",
    mechanism: "NATS gives at-least-once delivery with idempotent processing, consumer groups, replay, and dead-letter queues in a ~30MB binary.",
    tradeoff: "No infinite log replay; fine for ephemeral job coordination.",
  },
  {
    q: "What if a worker crashes?",
    claim: "30s ack timeout, then the job gets reassigned.",
    mechanism: "Output paths are deterministic — reprocessing produces identical results. Long jobs checkpoint every 10M rows.",
    tradeoff: "Up to 30s wasted work on crash; checkpointing caps replay cost.",
  },
  {
    q: "Why embedded Kuzu over Neo4j?",
    claim: "20M nodes, 152M edges fit in-process. No network hop.",
    mechanism: "Traversal drops from ~50ms/hop to sub-150ms end-to-end. Read-heavy with weekly batch ingest — no write-scaling needed.",
    tradeoff: "Single-machine ceiling; current graph size is well within it.",
  },
  {
    q: "Why RocksDB over Redis?",
    claim: "8.9B × 232 annotations won't fit in RAM.",
    mechanism: "Disk-backed with bloom + ribbon filters rejecting 99.9% of misses. Custom binary encoding makes any field accessible by byte offset.",
    tradeoff: "Slightly higher tail latency than RAM; bloom + ribbon filters keep p99 under 10ms.",
  },
];

const deepDives = [
  {
    title: "Knowledge Graph",
    href: "/docs/knowledge-graph",
    description:
      "20M nodes, 152M edges. BFS traversal, shortest paths, Jaccard similarity, enrichment analysis.",
  },
  {
    title: "Agent System",
    href: "/docs/agent-system",
    description:
      "5 tools, 20+ commands. Schema validation, stuck-loop detection, token budgeting.",
  },
  {
    title: "Batch Pipeline",
    href: "/docs/batch-pipeline",
    description:
      "100k variants/sec. Zero-alloc decoding, checkpointing, dual-format output.",
  },
  {
    title: "Search Engine",
    href: "/docs/search-engine",
    description:
      "5-tier scoring cascade. Anchor + pivot, batch resolution, sub-50ms p99.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ArchitectureDocsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div>
        <Prose>
          <h1>Architecture</h1>
          <p>
            One API to annotate, search, analyze, and traverse every known
            human genetic variant. 8.9 billion records across 232 scientific
            dimensions, served through six specialized database engines at
            interactive speed.
          </p>
        </Prose>
        <div className="mt-6">
          <StatBanner
            stats={[
              { value: "8.9B", label: "Genetic variants" },
              { value: "232", label: "Annotations each" },
              { value: "<10ms", label: "Lookup latency" },
              { value: "25x", label: "Data compression", detail: "30TB to 1.2TB" },
            ]}
          />
        </div>
      </div>

      {/* System overview */}
      <section>
        <Prose>
          <h2>How it all connects</h2>
        </Prose>
        <ul className="mt-3 space-y-1.5">
          {[
            "Frontend never touches databases.",
            "Workers never serve HTTP.",
            "API layer owns all routing and business logic.",
            "Services coordinate via message subjects and S3 manifests.",
            "No shared mutable state. Data flows one direction.",
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {rule}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <SystemArchDiagram />
        </div>
      </section>

      {/* Storage engines */}
      <section>
        <Prose>
          <h2>Six engines. One job each.</h2>
          <p>
            Each engine handles exactly one access pattern it&apos;s best at.
            S3 Parquet is the canonical source. Every engine is a materialized
            view rebuildable from the data lake.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">
                  Engine
                </th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">
                  Pattern
                </th>
                <th className="text-left py-2.5 font-semibold text-foreground">
                  How &amp; why
                </th>
              </tr>
            </thead>
            <tbody>
              {engines.map((e) => (
                <tr
                  key={e.name}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">
                    {e.name}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap align-top">
                    {e.purpose}
                  </td>
                  <td className="py-3 text-muted-foreground leading-relaxed">
                    <ul className="space-y-0.5 list-none p-0 m-0">
                      {e.details.map((d) => (
                        <li key={d} className="flex items-start gap-1.5">
                          <span className="mt-[7px] block h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Design decisions */}
      <section>
        <Prose>
          <h2>Why it&apos;s built this way</h2>
        </Prose>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {decisions.map((d) => (
            <div
              key={d.q}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground mb-3">{d.q}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {d.claim}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
                {d.mechanism}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-2 italic">
                Tradeoff: {d.tradeoff}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* AI-native API (summary — detail lives in /docs/agent-system) */}
      <section>
        <Prose>
          <h2>AI-native API</h2>
          <p>
            99 endpoints designed so AI agents can act on data, not just read
            it. Every error includes a recovery plan as a ready-to-execute API
            call. Column names auto-correct. Graph directions auto-infer. Wire
            format is columnar (20x smaller than naive JSON). See the full
            breakdown in the{" "}
            <a href="/docs/agent-system">Agent System deep dive</a>.
          </p>
        </Prose>
      </section>

      {/* Proof */}
      <section>
        <Prose>
          <h2>Production numbers</h2>
        </Prose>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { metric: "<10ms", label: "Point lookup p99", detail: "RocksDB + bloom/ribbon filters" },
            { metric: "<50ms", label: "Search p95", detail: "Elasticsearch 5-tier cascade" },
            { metric: "<1s", label: "Analytics typical", detail: "ClickHouse columnar scan" },
            { metric: "<150ms", label: "Graph traversal", detail: "Kuzu in-process BFS" },
            { metric: "100%", label: "Rebuildable", detail: "Every engine from S3 manifest" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-lg font-bold text-foreground tabular-nums">{s.metric}</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{s.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section>
        <Prose>
          <h2>Security model</h2>
        </Prose>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              title: "Identity",
              body: "API keys (Argon2id-hashed, shown once at creation) or signed session cookies (HttpOnly, Secure, 24h sliding window). Both resolve to the same internal identity.",
            },
            {
              title: "Authorization",
              body: "Three roles: admin, researcher, viewer. Enforced at middleware before any database query. Researchers create cohorts and run agents. Admins manage keys and audit logs.",
            },
            {
              title: "Data isolation",
              body: "User data scoped by mandatory tenant filters. Scientific data (8.9B variants, knowledge graph) is shared, immutable, and has no write API.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Deep dives */}
      <section>
        <Prose>
          <h2>Deep dives</h2>
          <p>
            If you only read one next:{" "}
            <strong>
              <a href="/docs/knowledge-graph">Knowledge Graph</a>
            </strong>
            .
          </p>
        </Prose>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {deepDives.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {d.title}
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {d.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
