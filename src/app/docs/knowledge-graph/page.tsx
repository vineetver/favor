import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Prose, Callout } from "../_components/doc-primitives";
import { StatBanner } from "../_components/stat-banner";
import { DataFlowDiagram } from "../_components/data-flow-diagram";
import {
  FlowDiagram,
  FlowNode,
  FlowConnector,
} from "../_components/flow-diagram";
import { SchemaNetworkGraph } from "../_components/schema-network-graph";

export const metadata: Metadata = {
  title: "Knowledge Graph | FAVOR Docs",
  description:
    "191M-edge biological knowledge graph: multi-hop traversal, AI context retrieval, drug repurposing, target identification, and structural analytics across 14.8M entities.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const domains = [
  { title: "Pharmacogenomics", description: "Drug targets, gene-drug responses, variant-drug associations, disposition pathways. Up to 58 evidence properties per edge." },
  { title: "Disease genetics", description: "Gene-disease associations, variant-trait links, phenotype mappings with association scores and confidence levels." },
  { title: "Functional biology", description: "Gene Ontology, protein domains, tissue expression, pathway membership, regulatory element links." },
  { title: "GWAS provenance", description: "Full chain from published study to trait to signal to variant. P-values, betas, and sample sizes preserved at every link." },
  { title: "Molecular interactions", description: "Protein-protein interactions, paralog relationships, gene-gene functional associations." },
  { title: "Ontology hierarchies", description: "Disease, phenotype, pathway, and GO trees with precomputed transitive closures for instant subsumption queries." },
];

const traversalOps = [
  {
    op: "BFS fan-out",
    returns: "Scored subgraph from any seed",
    constraint: "≤5 hops, 1K-node ceiling per step",
    proof: "<100ms for 2K nodes",
  },
  {
    op: "Shortest path",
    returns: "All equal-length paths with evidence",
    constraint: "Bidirectional BFS, stops when frontiers meet",
    proof: "~670 nodes vs ~450K nodes explored",
  },
  {
    op: "Fisher's enrichment",
    returns: "Ranked pathways, diseases, GO terms",
    constraint: "BH-corrected, precomputed universe sizes",
    proof: "Precomputed universes (no scan)",
  },
  {
    op: "Jaccard similarity",
    returns: "Neighbor-overlap across entity types",
    constraint: "Pre-sorted lists, single linear pass",
    proof: "Single linear pass (no hash tables)",
  },
  {
    op: "Branching traversal",
    returns: "Multi-direction fan-out from one seed",
    constraint: "≤5 sub-steps per branch, union or intersection merge",
    proof: "Independent filters per branch",
  },
  {
    op: "Overlay expansion",
    returns: "Hidden edges between existing nodes",
    constraint: "No new nodes, no frontier growth",
    proof: "40–200 edges in <3ms",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KnowledgeGraphDocsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div>
        <Prose>
          <h1>Knowledge Graph</h1>
          <p>
            14.8 million biological entities connected through 191 million
            scored relationships. Genes to diseases, drugs to targets, variants
            to phenotypes. The shared substrate behind search, context
            retrieval, and traversal. Built from 40+ authoritative databases,
            traversable in real time.
          </p>
        </Prose>
        <div className="mt-6">
          <StatBanner
            stats={[
              { value: "14.8M", label: "Entities", detail: "16 types" },
              { value: "191M+", label: "Relationships", detail: "52 edge types" },
              { value: "<100ms", label: "3-hop traversal" },
              { value: "40+", label: "Data sources" },
            ]}
          />
        </div>
      </div>

      {/* Schema network graph */}
      <section>
        <Prose>
          <h2>Entity network</h2>
          <p>
            16 entity types connected by 52 relationship types across 6 domains.
            Hover any node to see its data sources. Hover an edge to see the
            specific databases behind that relationship.
          </p>
        </Prose>
        <div className="mt-4">
          <SchemaNetworkGraph />
        </div>
      </section>

      {/* Platform backbone */}
      <section>
        <Prose>
          <h2>Platform backbone</h2>
          <p>
            Every major capability draws from the graph.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Capability</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Mechanism</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cap: "AI context retrieval", mech: "The agent pulls structured, scored traversals (diseases, drugs, pathways), so it reasons over evidence, not raw text." },
                { cap: "Semantic search", mech: 'Search "BRCA1" and get the entity plus its key relationships, so results come with context, not just string matches.' },
                { cap: "Structural analytics", mech: "Centrality, Jaccard, enrichment, degree stats over the full graph, so you can compute real metrics without sampling by default." },
                { cap: "Entity resolution", mech: "Resolve up to 50 messy inputs (typos, synonyms, IDs) to canonical nodes in one call, with confidence scores." },
                { cap: "Evidence provenance", mech: "Every edge carries source + score + clinical confidence, so each claim is traceable back to its source." },
                { cap: "Reproducibility", mech: "Graph builds are versioned and swapped atomically, so results are consistent across runs." },
              ].map((row) => (
                <tr key={row.cap} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.cap}</td>
                  <td className="py-3 text-muted-foreground">{row.mech}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Use cases */}
      <section>
        <Prose>
          <h2>What researchers do with it</h2>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Use case</th>
                <th className="text-left py-2.5 font-semibold text-foreground">How it works</th>
              </tr>
            </thead>
            <tbody>
              {[
                { uc: "AI context retrieval", how: '"What do we know about PCSK9?" → 847 scored relationships across 6 domains in one traversal' },
                { uc: "Drug repurposing", how: "Disease → genes → pathways → other genes → drug targets. Four hops, one API call." },
                { uc: "Target identification", how: "Rank GWAS candidates by graph centrality, pathway enrichment, druggability, interaction degree" },
                { uc: "Pharmacogenomic profiling", how: "Map drug-gene-variant relationships with evidence levels, effect sizes, mechanism of action" },
                { uc: "Regulatory variant interpretation", how: "Non-coding variant → regulatory element → target gene → disease associations" },
                { uc: "Biomarker discovery", how: "Graph neighborhoods, pathway overlap, and interaction density across candidate biomarkers" },
              ].map((row) => (
                <tr key={row.uc} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.uc}</td>
                  <td className="py-3 text-muted-foreground">{row.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout variant="tip" title="These workflows compose">
          Start with drug repurposing, pivot into target identification on the
          candidates, run enrichment on top targets. Each step builds on graph
          context from the previous one.
        </Callout>
      </section>

      {/* Traversal engine */}
      <section>
        <Prose>
          <h2>Traversal engine</h2>
          <p>
            Compressed Sparse Row (CSR): two flat arrays (edge targets +
            offsets). Neighbors live in one contiguous block, so traversal is
            a sequential memory read. Properties stored column-oriented and
            separate from topology, so a traversal filtering on edge type
            never touches score data.
          </p>
        </Prose>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Query type</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Returns</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Constraint</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Proof</th>
              </tr>
            </thead>
            <tbody>
              {traversalOps.map((row) => (
                <tr key={row.op} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.op}</td>
                  <td className="py-3 pr-4 text-muted-foreground align-top">{row.returns}</td>
                  <td className="py-3 pr-4 text-muted-foreground align-top">{row.constraint}</td>
                  <td className="py-3 text-muted-foreground whitespace-nowrap align-top">{row.proof}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout variant="tip" title="Why 191M edges traverses like a small graph">
          Every hop is a sequential read through cache-aligned memory. No
          pointer chasing, no network round-trips. The engine runs embedded in
          the API process. Sub-100ms for straightforward queries. Full metadata hydration (many columns returned) takes longer.
        </Callout>
      </section>

      {/* Query pipeline */}
      <section>
        <Prose>
          <h2>Query anatomy</h2>
          <p>
            Every graph query follows the same five-stage execution path,
            entirely in-process with zero network hops.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="Graph query pipeline"
            steps={[
              { label: "Resolve seeds", detail: "IDs or search terms" },
              { label: "Compile plan", detail: "Steps, branches, filters" },
              { label: "Expand", detail: "Sequential scan + inline filters" },
              { label: "Deduplicate", detail: "Merge overlapping subgraphs" },
              { label: "Encode", detail: "Node dedup + positional arrays" },
            ]}
          />
        </div>
        <Prose className="mt-4">
          <p>
            Wire format uses node deduplication and positional edge arrays.
            A 2,000-node response is ~40KB versus ~800KB with naive JSON.
          </p>
        </Prose>
      </section>

      {/* Domain coverage */}
      <section>
        <Prose>
          <h2>52 relationship types across 6 domains</h2>
          <p>
            Every edge carries typed evidence: association scores, statistical
            measures, source attribution, and clinical confidence levels.
            This is why the graph is safe to trust: every relationship is
            scored and traceable.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Domain</th>
                <th className="text-left py-2.5 font-semibold text-foreground">What it covers</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.title} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{d.title}</td>
                  <td className="py-3 text-muted-foreground">{d.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edge evidence model */}
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Edge evidence record
            </p>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Fields vary by edge type
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              Gene
            </span>
            <div className="flex-1 relative border-t-2 border-dashed border-primary/30">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] text-primary font-medium bg-card px-1.5 whitespace-nowrap">
                associated_with
              </span>
            </div>
            <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              Disease
            </span>
          </div>
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Required</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                "source: OpenTargets",
                "score: 0.82",
                "confidence: high",
              ].map((kv) => (
                <div key={kv} className="rounded-md bg-muted px-2.5 py-1.5">
                  <code className="text-[11px] text-muted-foreground font-mono">{kv}</code>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">Optional (varies by type)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                "p_value: 3.2e-12",
                "cohort: UKB",
                "evidence_items: 17",
              ].map((kv) => (
                <div key={kv} className="rounded-md bg-muted/60 px-2.5 py-1.5">
                  <code className="text-[11px] text-muted-foreground/70 font-mono">{kv}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Graph engineering */}
      <section>
        <Prose>
          <h2>How it&apos;s built</h2>
        </Prose>
        <div className="mt-4">
          <FlowDiagram>
            <FlowNode
              icon="database"
              title="40+ source databases"
              subtitle="Ingested monthly. Deterministic ETL with checksum validation at every partition."
              items={[
                "Sources include OpenTargets, ClinVar, UniProt, STRING, Reactome, GO, and others",
                "Source-specific parsers normalize identifiers, scores, evidence types",
                "Conflict resolution: highest-evidence wins for the primary edge; provenance preserved",
              ]}
              guarantee="Checksum-verified ingest (no silent corruption)"
              index={0}
            />
            <FlowConnector label="Normalize + deduplicate" artifact="canonical IDs" />
            <FlowNode
              icon="layers"
              title="Unified graph model"
              subtitle="16 entity types. 52 edge types. Every edge carries typed evidence. Builds are versioned and reproducible."
              items={[
                "Gene symbols, Ensembl IDs, UniProt accessions resolve to one canonical node",
                "Edge evidence properties vary by type (up to 58 per pharmacogenomic edge)",
                "Precomputed transitive closures on ontology hierarchies",
              ]}
              guarantee="One canonical ID per entity (no duplicate BRCA1s)"
              index={1}
            />
            <FlowConnector label="Load into Kuzu" artifact="CSR + evidence columns" />
            <FlowNode
              icon="zap"
              title="Embedded graph engine"
              subtitle="In-process Kuzu. Read-optimized, column-oriented layout."
              items={[
                "Column-oriented storage with adjacency-list compression",
                "BFS, shortest path, Jaccard, Fisher's enrichment as native operations",
                "Atomic snapshot swap on ingest: zero-downtime updates",
              ]}
              guarantee="Snapshot reads (never half-updated)"
              index={2}
            />
          </FlowDiagram>
        </div>
      </section>

      {/* Explore more */}
      <section>
        <Prose>
          <h2>Explore more</h2>
        </Prose>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Search Engine",
              href: "/docs/search-engine",
              description: "5-tier matching cascade, anchor + pivot, batch resolution. Graph-powered search.",
            },
            {
              title: "Agent System",
              href: "/docs/agent-system",
              description: "How the AI agent plans and executes graph queries. Tool reliability, command domains.",
            },
            {
              title: "Architecture",
              href: "/docs/architecture",
              description: "Six engines, AI-native API, and the full system topology the graph sits within.",
            },
            {
              title: "Batch Pipeline",
              href: "/docs/batch-pipeline",
              description: "100k variants/sec annotation pipeline. Entity resolution against graph nodes at ingest.",
            },
          ].map((d) => (
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
