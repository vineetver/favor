import type { Metadata } from "next";
import Link from "next/link";
import { Prose } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";
import { StatBanner } from "../_components/stat-banner";

const TOC_ITEMS: TocItem[] = [
  { id: "mission", label: "What we are building" },
  { id: "access-patterns", label: "Access patterns" },
  { id: "components", label: "Components" },
  { id: "why", label: "Why this shape" },
  { id: "stability", label: "Stability" },
];

export const metadata: Metadata = {
  title: "Architecture | FAVOR Docs",
  description:
    "How FAVOR is built. The access patterns, the components, and the stack behind 8.9 billion variants, 232 dimensions, and half a million genomes.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "8.9B", label: "DNA variants", detail: "SNVs and indels across GRCh38" },
  { value: "232", label: "Annotations per variant" },
  { value: "~100ms", label: "API P99", detail: "Over the wire" },
  { value: "120", label: "API endpoints" },
];

const patterns = [
  {
    name: "Point lookups at billion scale",
    body: "Any variant, any annotation, answered in milliseconds. Bloom and ribbon filters skip misses without touching disk.",
  },
  {
    name: "Batch multi-get at streaming throughput",
    body: "Pipelined, pre-sorted point lookups at around 10,000 variants per second per instance. Random reads become sequential reads, and batch uploads scale horizontally from there.",
  },
  {
    name: "Range scans over sorted coordinates",
    body: "A region query like chr17:43,000,000-43,200,000 is a single sequential read, because everything is sorted by chromosome and position. Powers the genome browser, gene pages, and the region explorer.",
  },
  {
    name: "Interval overlap queries",
    body: "Which regulatory elements overlap a variant. Which credible sets contain a position. Which genes a region falls inside. A variant resolves against thousands of intervals in one indexed step.",
  },
  {
    name: "Columnar scans with predicate pushdown",
    body: "Aggregate a few columns across the full genome without reading the rest. Filters and bounds get pushed to the storage layer, so it only touches the fields and row groups the query needs.",
  },
  {
    name: "Top-K ranked retrieval",
    body: "Rank a variant list by any numeric annotation and return the top ten, without sorting every row. Powers variant prioritization, search ranking, and the most-relevant views on gene and region pages.",
  },
  {
    name: "Materialized aggregates",
    body: "Gene-level variant density, per-tissue signal averages, regional constraint scores. Precomputed at release time, so a gene page never scans billions of rows at request time. Storage traded for latency.",
  },
  {
    name: "Full-text, fuzzy, and vector search",
    body: "Three layers over the same entity index. Exact and alias matches first, then typo-tolerant fuzzy matching, then vector similarity on entity embeddings for meaning matches a string search cannot catch. Every result carries a confidence tier.",
  },
  {
    name: "Graph traversal and pattern matching",
    body: "BFS, shortest path, Jaccard similarity, centrality, enrichment, and subgraph pattern matching against a biomedical network. Runs in the same process as the API, so multi-hop queries do not pay a network round-trip per hop.",
  },
  {
    name: "Scatter-gather and pub-sub",
    body: "A single variant page fans out across several databases at once. RocksDB returns the 232 annotations. Kuzu walks the surrounding genes, diseases, and drugs. ClickHouse pulls overlapping cCREs, enhancer-gene links, chromatin states, tissue signals. Others join when the page needs them. All run in parallel; the API waits for the slowest and merges the results.",
  },
];

const components = [
  {
    name: "Web frontend",
    body: "Renders the portal: entity pages, region views, the batch annotation workspace, and the agent chat. Owns no data. Every read goes through the API.",
    built: "Next.js, React, TypeScript, D3, WebGL",
  },
  {
    name: "API layer",
    body: "The only thing that talks to storage. Handles routing, auth, request parsing, and the scatter-gather across serving engines described above. Web, CLI, and agent all go through here. This is also where cross-engine joins happen.",
    built: "Rust, Tokio, Arrow, gRPC, REST, SSE, NATS",
  },
  {
    name: "Storage layer",
    body: "A Parquet lake on object storage is the source of truth. Several serving engines sit in front of it as materialized views, each tuned for one access pattern: point lookup, columnar scan, full-text, vector similarity, graph traversal, and a transactional path for user data.",
    built: "RocksDB, ClickHouse, Kuzu, PostgreSQL, Elasticsearch, Parquet, Roaring bitmaps",
  },
  {
    name: "Batch workers",
    body: "Long-running jobs do not run inside the API process. They run in a worker pool that pulls from a message bus, processes in parallel, and writes results back. Batch annotation, enrichment, and analytics runs all land here.",
    built: "Rust, NATS, DataFusion, Arrow, Parquet",
  },
  {
    name: "CLI",
    body: "A second path into the platform for users who need to run analyses on their own hardware, on HPC, or inside protected hospital infrastructure where the web portal is not an option. Reads the same Parquet data the web path reads.",
    built: "Rust, DataFusion, Arrow, Parquet, Nextflow",
  },
  {
    name: "Agent runtime",
    body: "Sits between a user question and the rest of the platform. Plans a step, calls a tool through the API, checks the result, and either continues, retries with a fix, or asks a precise question.",
    built: "Python, TypeScript",
  },
];

const rationale = [
  {
    title: "No single database handles every access pattern well",
    body: "Point lookup, columnar scan, full-text search, and graph traversal are four different storage problems. Each engine owns the one it is good at. Running several engines is the price we pay for keeping each one simple.",
  },
  {
    title: "Rust where latency matters, Python and TypeScript where iteration matters",
    body: "The API and the CLI are Rust. The web platform is TypeScript. The agents are Python and TypeScript. Each language is used where it earns its keep.",
  },
  {
    title: "The AI agent is a real user of the API, not a wrapper around it",
    body: "Errors come back with a fix the agent can run directly. Column-name typos get corrected. Ambiguous requests get a precise question back instead of a guess. Improvements to the API benefit both humans and agents.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ArchitectureDocsPage() {
  return (
    <div className="space-y-12">
      <DocsToc items={TOC_ITEMS} />

      {/* Hero */}
      <div>
        <Prose>
          <h1>Architecture</h1>
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
          <h2 id="access-patterns">Access patterns</h2>
          <p>
            FAVOR is not one system with one shape of query. It is a small
            collection of engines, each built for one access pattern.
            These are the patterns the platform has to serve.
          </p>
        </Prose>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {patterns.map((p) => (
            <div
              key={p.name}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">{p.name}</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Components */}
      <section>
        <Prose>
          <h2 id="components">Components and boundaries</h2>
          <p>
            The platform is a handful of components with strict rules about
            what each one is allowed to talk to. The rules matter more than
            any single component: they are what keep failures local and what
            let any one part be rewritten without touching the others.
          </p>
        </Prose>
        <div className="mt-4 space-y-3">
          {components.map((c) => (
            <div
              key={c.name}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">{c.name}</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {c.body}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                <span className="font-medium">Built with</span>{" "}
                <span className="font-mono">{c.built}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why this shape */}
      <section>
        <Prose>
          <h2 id="why">Why this shape</h2>
        </Prose>
        <div className="mt-4 space-y-3">
          {rationale.map((r) => (
            <div
              key={r.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">{r.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {r.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stability */}
      <section>
        <Prose>
          <h2 id="stability">Stability</h2>
          <p>
            The public API, portal URLs, documented annotation columns,
            and the release notes are the stability contract. Everything
            on this page describes current internals. Components can be
            renamed, merged, split, or replaced as the platform grows. For
            user-visible changes, read the{" "}
            <Link
              href="/docs/release-notes"
              className="text-primary hover:underline"
            >
              release notes
            </Link>
            .
          </p>
        </Prose>
      </section>
    </div>
  );
}
