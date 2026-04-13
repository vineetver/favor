import type { Metadata } from "next";
import Link from "next/link";
import { Callout, Prose } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "what-it-does", label: "What it does" },
  { id: "kinds-of-queries", label: "Kinds of queries" },
  { id: "confidence", label: "Why confidence matters" },
  { id: "modes", label: "Three ways it is used" },
  { id: "agent", label: "How the agent uses it" },
];

export const metadata: Metadata = {
  title: "Search Engine | FAVOR Docs",
  description:
    "How FAVOR resolves human queries to entities across the knowledge graph. A short description of the design, not a stability contract.",
};

export default function SearchEngineDocsPage() {
  return (
    <div className="space-y-12">
      <DocsToc items={TOC_ITEMS} />

      <div>
        <Prose>
          <h1>Search Engine</h1>
          <p>
            Search turns what a human typed into a specific thing in the graph.
            A gene, a variant, a disease, a drug. It is the layer every
            typeahead, entity explorer, and{" "}
            <Link href="/docs/agent">AI agent</Link> disambiguation runs
            through.
          </p>
        </Prose>

        <Callout variant="info" title="Engineering notes, not a contract">
          This page describes how search is designed. The exact match strategies
          and ranking can change. For the user facing guide, see{" "}
          <Link href="/docs/search">Search and Explore</Link>.
        </Callout>
      </div>

      <section>
        <Prose>
          <h2 id="what-it-does">What it does</h2>
          <p>
            Search has one job: take messy input and hand back the right entity,
            or a short list of candidates, with enough context for the caller to
            decide what to do next. A caller here is a typeahead in the portal,
            a graph explorer, or the AI agent resolving a name before it
            traverses.
          </p>
          <p>
            The hard part is not speed. The hard part is that the same input can
            mean different things. &ldquo;BRCA1&rdquo; is a gene.
            &ldquo;Metformin&rdquo; is a drug. &ldquo;Alzheimer&rdquo; is a
            disease with several close relatives. Search has to return something
            useful for all of these without guessing.
          </p>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="kinds-of-queries">Kinds of queries</h2>
          <p>
            Most of the design comes down to recognising what kind of input a
            caller gave you, because different inputs need different strategies.
          </p>
        </Prose>
        <div className="mt-4 space-y-3">
          {[
            {
              title: "Structured identifiers",
              body: "VCF coordinates, rsIDs, ChEMBL identifiers, ontology codes. These have exactly one correct answer. Search recognises them by shape and resolves directly without going through fuzzy matching.",
            },
            {
              title: "Short symbolic tokens",
              body: "Uppercase strings that look like gene symbols. Search prefers symbol matches first, because that is what a scientist almost always means when they type six uppercase letters.",
            },
            {
              title: "Free text",
              body: "Everything else. Names, partial names, typos, common misspellings. This is where fuzzy matching earns its place, but always after the cleaner strategies have been tried.",
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
        <p className="mt-4 text-xs text-muted-foreground">
          The rule is simple: cheaper and more certain strategies run first.
          Fuzzy matching is a fallback, not the default.
        </p>
      </section>

      <section>
        <Prose>
          <h2 id="confidence">Why confidence matters</h2>
          <p>
            Every result comes back with a confidence level and a short reason
            for why the match happened. &ldquo;Exact identifier match&rdquo; is
            not the same as &ldquo;edit distance two from your input&rdquo;.
          </p>
          <p>
            The reason this matters is that downstream code needs to make
            different decisions based on how sure we are. A typeahead can show
            low confidence matches as suggestions. An AI agent resolving a name
            before running an expensive traversal should stop and ask if the
            match is weak. By returning the reason alongside the result, search
            lets each caller decide for itself where to draw the line.
          </p>
        </Prose>
      </section>

      <section>
        <Prose>
          <h2 id="modes">Three ways it is used</h2>
        </Prose>
        <div className="mt-4 space-y-3">
          {[
            {
              title: "Typeahead",
              body: "The search bar in the portal. Fires on every keystroke, has to feel instant, and returns a handful of top candidates grouped by type.",
            },
            {
              title: "Entity explorer",
              body: "Used when a result has been selected and the caller wants to see the entity in its neighbourhood. Returns more results per type and is cacheable, because the same entity view is often reloaded.",
            },
            {
              title: "Batch resolution",
              body: "Used by the AI agent and by bulk imports. Several names in, several resolved entities out, all in a single round trip with confidence on each.",
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
          <h2 id="agent">How the agent uses it</h2>
          <p>
            The <Link href="/docs/agent">AI agent</Link> does not roll its own
            entity resolution. When it sees a name in your question, it calls
            batch resolution and gets back the candidates with confidence. If
            confidence is high it moves on. If confidence is low it asks you
            which one you meant. This keeps the agent from silently walking down
            the wrong branch of the graph.
          </p>
          <p>
            Improvements to search therefore improve the agent at the same time.
            The two are not separate systems.
          </p>
        </Prose>
      </section>
    </div>
  );
}
