import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@infra/utils";
import { Prose, Callout } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";

const TOC_ITEMS: TocItem[] = [
  { id: "start-here", label: "Start here" },
  { id: "typeahead", label: "Typeahead results" },
  { id: "anchor-expand", label: "Anchor + expand" },
  { id: "incremental", label: "Incremental expansion" },
  { id: "relevance", label: "Why this is relevant" },
  { id: "batch-resolve", label: "Batch resolve" },
];

export const metadata: Metadata = {
  title: "Search & Explore | FAVOR Docs",
  description:
    "How to search and explore variants, genes, diseases, and drugs in FAVOR.",
};

/* ------------------------------------------------------------------ */
/*  Storyboard primitives                                              */
/* ------------------------------------------------------------------ */

function Marker({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shrink-0">
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
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b border-border">
          <div className="w-2 h-2 rounded-full bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
        </div>
        <div className="bg-background">{children}</div>
      </div>
      <figcaption className="text-sm text-muted-foreground text-center px-4">
        {caption}
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SearchDocsPage() {
  return (
    <div className="space-y-14">
      <DocsToc items={TOC_ITEMS} />

      <Prose>
        <h1>Search & Explore</h1>
        <p>
          Unified search across <strong>variants</strong>,{" "}
          <strong>genes</strong>, <strong>diseases</strong>, and{" "}
          <strong>drugs</strong>. Start typing from the homepage or any entity
          page to pivot into related data.
        </p>
      </Prose>

      {/* 1 — Start here */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={1} />
          <h2 id="start-here" className="text-lg font-semibold text-foreground">
            Start here
          </h2>
        </div>
        <Frame caption="Type anything — gene symbol, rsID, disease name, drug, or VCF coordinate.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/s1.jpeg"
            alt="FAVOR search bar with HG38/HG19 toggle, placeholder text, and example queries: BRCA1, rs7412, Alzheimer, Metformin"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 2 — Typeahead results */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={2} />
          <h2 id="typeahead" className="text-lg font-semibold text-foreground">
            Typeahead results
          </h2>
        </div>
        <Frame caption="Best match on top with function summary and link counts. Related genes grouped below.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/s2.png"
            alt="LDLR typeahead: best match with function description, variant/disease/drug counts, and related genes grouped below"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 3 — Anchor + expand */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={3} />
          <h2 id="anchor-expand" className="text-lg font-semibold text-foreground">
            Anchor + expand
          </h2>
        </div>
        <Frame caption="Click any result to anchor on it — related entities appear grouped by type.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/s3.png"
            alt="LDLR entity page showing Related to LDLR section with diseases (5 of 42): hypercholesterolemia, Alzheimer disease, coronary artery disorder"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 4 — Incremental expansion */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={4} />
          <h2 id="incremental" className="text-lg font-semibold text-foreground">
            Incremental expansion
          </h2>
        </div>
        <Frame caption="Start with 5 results per type — click to expand on demand, merged and deduplicated.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/s4.png"
            alt="Show more diseases button (37 more) for expanding the related entities list"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 5 — Why this is relevant */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={5} />
          <h2 id="relevance" className="text-lg font-semibold text-foreground">
            Why this is relevant
          </h2>
        </div>
        <Frame caption="Link counts show how connected an entity is — the more edges, the richer the pivot.">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/static/s5.png"
            alt="Entity link counts showing connection density across variants, diseases, drugs, and other types"
            className="w-full"
          />
        </Frame>
      </section>

      {/* 6 — Batch resolve */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={6} />
          <h2 id="batch-resolve" className="text-lg font-semibold text-foreground">
            Batch resolve
          </h2>
        </div>
        <Frame caption="POST /graph/resolve — 8 mixed queries (typed IDs, gene symbols, rsIDs, diseases, drugs) resolved in one call.">
          <div className="p-5 overflow-x-auto">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              API only &mdash; used by the agent and external integrations
            </p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Input
                  </th>
                  <th className="text-left py-2 pr-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Resolved to
                  </th>
                  <th className="text-left py-2 pr-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="text-left py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Tier
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { input: "Gene:ENSG00000141510", resolved: "Gene · ENSG00000141510", conf: "1.0", tier: "IdExact" },
                  { input: "BRCA1", resolved: "Gene · ENSG00000012048", conf: "0.95", tier: "NameExact" },
                  { input: "rs7412", resolved: "Variant · 19-44908822-C-T", conf: "0.95", tier: "NameExact" },
                  { input: "breast cancer", resolved: "Disease · MONDO_0005070", conf: "0.95", tier: "NameExact" },
                  { input: "Trastuzumab", resolved: "Drug · CHEMBL1201585", conf: "0.95", tier: "NameExact" },
                  { input: "APOE", resolved: "Gene · ENSG00000130203", conf: "0.95", tier: "NameExact" },
                  { input: "Disease:MONDO_0005070", resolved: "Disease · MONDO_0005070", conf: "1.0", tier: "IdExact" },
                  { input: "PCSK9", resolved: "Gene · ENSG00000169174", conf: "0.95", tier: "NameExact" },
                ].map((row) => (
                  <tr
                    key={row.input}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs text-foreground whitespace-nowrap">
                      {row.input}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                      {row.resolved}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground tabular-nums">
                      {row.conf}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap",
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

      {/* Tips */}
      <section>
        <Callout variant="tip" title="Get better results">
          Use official gene symbols (HGNC) for best match quality.{" "}
          <code>chr:pos:ref:alt</code> is most precise for variants. For
          complex queries, use{" "}
          <Link href="/agent" className="text-primary hover:underline">
            FAVOR-GPT
          </Link>{" "}
          &mdash; it resolves entities automatically and chains them with graph
          queries.
        </Callout>
      </section>

      {/* Engineering link */}
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
