import { cn } from "@infra/utils";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Callout, Prose } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "what-search-accepts", label: "What search accepts" },
  { id: "basic-workflow", label: "Basic workflow" },
  { id: "understanding-results", label: "Understanding results" },
  { id: "when-to-use-agent", label: "When to use agent" },
  { id: "batch-resolve", label: "Batch resolve" },
];

export const metadata: Metadata = {
  title: "Search & Explore | FAVOR Docs",
  description:
    "How to search and explore variants, genes, diseases, and drugs in FAVOR.",
};

function Marker({ n }: { n: number }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
      {n}
    </span>
  );
}

function Frame({
  children,
  caption,
}: {
  children: ReactNode;
  caption: string;
}) {
  return (
    <figure className="space-y-2.5">
      <div className="overflow-hidden rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-border" />
          <div className="h-2 w-2 rounded-full bg-border" />
          <div className="h-2 w-2 rounded-full bg-border" />
        </div>
        <div className="bg-background">{children}</div>
      </div>
      <figcaption className="px-4 text-center text-sm text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}

export default function SearchDocsPage() {
  return (
    <div className="space-y-14">
      <DocsToc items={TOC_ITEMS} />

      <Prose>
        <h1>Search & Explore</h1>
        <p>
          Use search when you already have a starting point such as a gene
          symbol, rsID, disease name, drug, or genomic coordinate. Search is the
          fastest way to land on an entity page and pivot into related biology.
        </p>
      </Prose>

      <section className="space-y-4">
        <h2
          id="what-search-accepts"
          className="text-lg font-semibold text-foreground"
        >
          What search accepts
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Genes",
              body: "Official symbols such as BRCA1, APOE, or LDLR usually resolve directly.",
            },
            {
              title: "Variants",
              body: "Use an rsID or a genomic coordinate. Exact coordinates are the most precise.",
            },
            {
              title: "Diseases and phenotypes",
              body: "Common names work well when they map cleanly to the underlying ontology.",
            },
            {
              title: "Drugs",
              body: "Drug names resolve to the matching compound when FAVOR has it in the graph.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <Frame caption="Enter a gene symbol, rsID, disease name, drug, or genomic coordinate from the homepage or any entity page.">
          <Image
            src="/static/s1.jpeg"
            alt="FAVOR search bar with HG38/HG19 toggle, placeholder text, and example queries: BRCA1, rs7412, Alzheimer, Metformin"
            width={2618}
            height={474}
            sizes="100vw"
            className="h-auto w-full"
          />
        </Frame>
      </section>

      <section className="space-y-4">
        <h2
          id="basic-workflow"
          className="text-lg font-semibold text-foreground"
        >
          Basic workflow
        </h2>
        <div className="space-y-3">
          {[
            {
              n: 1,
              title: "Enter the strongest identifier you have",
              body: "Official gene symbols and exact variant identifiers reduce ambiguity and usually put the right entity at the top.",
            },
            {
              n: 2,
              title: "Choose the best match from typeahead",
              body: "Results are grouped and ranked. Check the entity type and summary before you open the match.",
            },
            {
              n: 3,
              title: "Open the entity and expand outward",
              body: "Once you are on an entity page, use the related-entity groups to pivot into nearby genes, diseases, drugs, or variants.",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
            >
              <Marker n={step.n} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Frame caption="Typeahead shows the strongest candidate first, with enough context to confirm that you are opening the right entity.">
            <Image
              src="/static/s2.png"
              alt="LDLR typeahead: best match with function description, variant/disease/drug counts, and related genes grouped below"
              width={2174}
              height={1228}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full"
            />
          </Frame>
          <Frame caption="Entity pages are the main hub for exploration. Open one result, then pivot through the related-entity groups.">
            <Image
              src="/static/s3.png"
              alt="LDLR entity page showing Related to LDLR section with diseases (5 of 42): hypercholesterolemia, Alzheimer disease, coronary artery disorder"
              width={2118}
              height={1218}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full"
            />
          </Frame>
        </div>
      </section>

      <section className="space-y-4">
        <h2
          id="understanding-results"
          className="text-lg font-semibold text-foreground"
        >
          Understanding results
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Best match",
              body: "The top result is the resolver's strongest candidate for your query. Confirm the entity type before you open it.",
            },
            {
              title: "Grouped neighbours",
              body: "Related entities are grouped by type so you can walk from one anchor entity into nearby biology without starting over.",
            },
            {
              title: "Incremental expansion",
              body: "Lists start small and expand on demand, which keeps pages readable while still letting you walk outward when needed.",
            },
            {
              title: "Link counts",
              body: "Counts give a quick sense of how connected an entity is and where the richest pivots are likely to be.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="text-sm font-semibold text-foreground">
                {item.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Frame caption="Expand a related-entity group when you want to walk further from the current anchor.">
            <Image
              src="/static/s4.png"
              alt="Show more diseases button (37 more) for expanding the related entities list"
              width={2048}
              height={1194}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full"
            />
          </Frame>
          <Frame caption="Link counts help you judge how much connected context is available behind a result.">
            <Image
              src="/static/s5.png"
              alt="Entity link counts showing connection density across variants, diseases, drugs, and other types"
              width={1790}
              height={286}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-auto w-full"
            />
          </Frame>
        </div>
      </section>

      <section className="space-y-3">
        <h2
          id="when-to-use-agent"
          className="text-lg font-semibold text-foreground"
        >
          When to use the AI agent instead
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Use search when you know roughly what entity you want. Use the{" "}
          <Link href="/docs/agent" className="text-primary hover:underline">
            AI agent
          </Link>{" "}
          when the question is multi-step, needs comparison across several
          entities, or mixes variant list analysis with graph exploration.
        </p>
      </section>

      <section className="space-y-3">
        <h2
          id="batch-resolve"
          className="text-lg font-semibold text-foreground"
        >
          Batch resolve
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The portal uses the same resolver that powers agent workflows and
          external integrations. If you need to resolve many mixed queries at
          once, use <code>POST /graph/resolve</code>.
        </p>
        <Frame caption="POST /graph/resolve resolves typed IDs, gene symbols, rsIDs, diseases, and drugs in one call.">
          <div className="overflow-x-auto p-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              API only &mdash; used by the agent and external integrations
            </p>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Input
                  </th>
                  <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Resolved to
                  </th>
                  <th className="py-2 pr-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Confidence
                  </th>
                  <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tier
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    input: "Gene:ENSG00000141510",
                    resolved: "Gene · ENSG00000141510",
                    conf: "1.0",
                    tier: "IdExact",
                  },
                  {
                    input: "BRCA1",
                    resolved: "Gene · ENSG00000012048",
                    conf: "0.95",
                    tier: "NameExact",
                  },
                  {
                    input: "rs7412",
                    resolved: "Variant · 19-44908822-C-T",
                    conf: "0.95",
                    tier: "NameExact",
                  },
                  {
                    input: "breast cancer",
                    resolved: "Disease · MONDO_0005070",
                    conf: "0.95",
                    tier: "NameExact",
                  },
                  {
                    input: "Trastuzumab",
                    resolved: "Drug · CHEMBL1201585",
                    conf: "0.95",
                    tier: "NameExact",
                  },
                  {
                    input: "APOE",
                    resolved: "Gene · ENSG00000130203",
                    conf: "0.95",
                    tier: "NameExact",
                  },
                  {
                    input: "Disease:MONDO_0005070",
                    resolved: "Disease · MONDO_0005070",
                    conf: "1.0",
                    tier: "IdExact",
                  },
                  {
                    input: "PCSK9",
                    resolved: "Gene · ENSG00000169174",
                    conf: "0.95",
                    tier: "NameExact",
                  },
                ].map((row) => (
                  <tr
                    key={row.input}
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs text-foreground">
                      {row.input}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-muted-foreground">
                      {row.resolved}
                    </td>
                    <td className="py-2.5 pr-3 text-xs tabular-nums text-muted-foreground">
                      {row.conf}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium",
                          row.tier === "IdExact"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700",
                        )}
                      >
                        {row.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Frame>
      </section>

      <section>
        <Callout variant="tip" title="Get better results">
          Use official gene symbols (HGNC) for best-match quality.{" "}
          <code>chr:pos:ref:alt</code> is the most precise variant form. For
          multi-step questions, use{" "}
          <Link href="/docs/agent" className="text-primary hover:underline">
            FAVOR-GPT
          </Link>{" "}
          so entity resolution, graph traversal, and analysis happen in one
          session.
        </Callout>
      </section>

      <section>
        <Callout variant="info" title="Engineering deep-dive">
          For the matching cascade, confidence tiers, and performance
          engineering behind search, see the{" "}
          <Link
            href="/docs/search-engine"
            className="text-primary hover:underline font-medium"
          >
            Search Engine
          </Link>{" "}
          page.
        </Callout>
      </section>
    </div>
  );
}
