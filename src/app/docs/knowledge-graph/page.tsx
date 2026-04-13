import type { Metadata } from "next";
import { Callout, Prose } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "what-it-is", label: "What it is" },
  { id: "what-lives-in-it", label: "What lives in it" },
  { id: "edges-have-evidence", label: "Edges carry evidence" },
  { id: "how-to-query", label: "How queries work" },
  { id: "what-it-powers", label: "What it powers" },
];

export const metadata: Metadata = {
  title: "Knowledge Graph | FAVOR Docs",
  description:
    "A tour of the biomedical knowledge graph behind FAVOR. What is in it, how it is queried, how edges carry evidence, and what it is not meant for.",
};

export default function KnowledgeGraphDocsPage() {
  return (
    <div className="space-y-12">
      <DocsToc items={TOC_ITEMS} />

      <div>
        <Prose>
          <h1>Knowledge Graph</h1>
          <p>
            A biomedical network of genes, diseases, drugs, variants, and the
            relationships that connect them, assembled from published databases.
          </p>
        </Prose>

        <Callout variant="info" title="Engineering notes, not a contract">
          This page describes the current shape of the graph. Entity types,
          relationship types, and exact counts change with each data release.
          For stable contracts, use the documented graph API and follow the{" "}
          <a href="/docs/release-notes">release notes</a>.
        </Callout>
      </div>

      <section>
        <Prose>
          <h2 id="what-it-is">What it is</h2>
          <p>
            A single connected structure where every node is a real biological
            entity and every edge is a claim from a published source. The point
            of the graph is that you can take a question that normally needs
            three databases, a spreadsheet, and a careful read of five papers,
            and answer it with one query.
          </p>
          <p>
            Everything in the graph is read only. The graph is rebuilt from
            source on a release schedule.
          </p>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="what-lives-in-it">What lives in it</h2>
          <p>
            The exact set of entity and relationship types depends on the
            current data release. The shape you can count on is a graph covering
            these domains.
          </p>
        </Prose>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Genes and proteins",
              body: "Canonical gene and protein entities, their aliases, their domains, and their expression patterns.",
            },
            {
              title: "Diseases and phenotypes",
              body: "Ontology-backed diseases and phenotypes with hierarchy, so a query for a broad disease can include more specific forms.",
            },
            {
              title: "Variants and regions",
              body: "Common and disease-associated variants, plus regulatory regions that link to genes.",
            },
            {
              title: "Drugs and targets",
              body: "Drugs, their targets, known indications, and pharmacogenomic associations with variants.",
            },
            {
              title: "Pathways and functions",
              body: "Biological pathways, molecular functions, and cellular components, with membership links to genes.",
            },
            {
              title: "Studies and evidence",
              body: "GWAS studies, credible sets, and other provenance that keeps an edge traceable to where it came from.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">{c.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Prose>
          <h2 id="edges-have-evidence">Edges carry evidence</h2>
          <p>
            A relationship in this graph is not a flat boolean. Each edge
            carries as much of the following as its source provides.
          </p>
          <ul>
            <li>
              <strong>Where it came from.</strong> The source database and the
              version of that database.
            </li>
            <li>
              <strong>How strong it is.</strong> A score, a p value, an effect
              size, or a curated confidence label, whichever the source
              publishes.
            </li>
            <li>
              <strong>What kind of claim it is.</strong> The edge type tells you
              whether the link is an association, a causal claim, a
              co-membership, or a simple containment.
            </li>
          </ul>
          <p>
            Because every edge is scored and traceable, two callers can walk the
            same path and still disagree on whether to trust it, and both are
            right to do so. The graph gives you the evidence.
          </p>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="how-to-query">How queries work</h2>
          <p>There are three kinds of queries you can run against the graph.</p>
        </Prose>
        <div className="mt-4 space-y-3">
          {[
            {
              title: "Lookup",
              body: "Give it an entity and get back a profile: the entity, its immediate neighbours, and the kinds of links that exist. This is what the web portal uses to render entity pages.",
            },
            {
              title: "Traversal",
              body: "Start from one or more seeds and walk outward, optionally filtering by edge type, direction, or score. Useful when a question looks like 'from this gene, find everything connected by a specific kind of evidence'.",
            },
            {
              title: "Analysis",
              body: "Ask a question about shape rather than about a specific entity. Enrichment, similarity, shortest path, or overlap between two sets. These queries use the graph as a substrate for statistics.",
            },
          ].map((q) => (
            <div
              key={q.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">{q.title}</p>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {q.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          The AI agent uses all three kinds of queries under the hood. When you
          ask a research question in natural language, it picks the shape of
          query that fits.
        </p>
      </section>

      <section>
        <Prose>
          <h2 id="what-it-powers">What it powers</h2>
          <p>The same graph sits behind several surfaces of the platform.</p>
          <ul>
            <li>
              <strong>Entity pages.</strong> Every gene, disease, drug, and
              variant page is a rendered slice of the graph or some part of it.
            </li>
            <li>
              <strong>Search.</strong> Search uses the graph to return matches
              and their context.
            </li>
            <li>
              <strong>AI agent.</strong> The agent runs scored traversals, so it
              reasons over structured evidence.
            </li>
            <li>
              <strong>Variant lists.</strong> When you run enrichment on a
              variant list, the graph is what tells you which genes, diseases,
              and drugs are connected to the variants in your list.
            </li>
          </ul>
        </Prose>
      </section>
    </div>
  );
}
