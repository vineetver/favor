import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@infra/utils";
import { Prose, Callout } from "../_components/doc-primitives";

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

function TierBadge({ tier, reason }: { tier: number; reason: string }) {
  const colors =
    tier <= 1
      ? "bg-emerald-100 text-emerald-700"
      : tier <= 3
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap",
        colors,
      )}
    >
      Tier {tier} · {reason}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      className="w-4 h-4 text-muted-foreground shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SearchDocsPage() {
  return (
    <div className="space-y-14">
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
          <h2 className="text-lg font-semibold text-foreground">Start here</h2>
        </div>
        <Frame caption="Type anything — gene symbol, rsID, disease name, drug, or VCF coordinate.">
          <div className="px-6 py-10 flex flex-col items-center gap-5">
            <div className="w-full max-w-md">
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-primary/30 bg-background">
                <SearchIcon />
                <span className="text-muted-foreground text-sm">
                  Search variants, genes, diseases, drugs&hellip;
                </span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "BRCA1",
                "rs12345",
                "breast cancer",
                "chr1:123456:A:G",
                "Trastuzumab",
              ].map((ex) => (
                <span
                  key={ex}
                  className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>
        </Frame>
      </section>

      {/* 2 — Typo-tolerant */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={2} />
          <h2 className="text-lg font-semibold text-foreground">
            Typo-tolerant
          </h2>
        </div>
        <Frame caption={'"BRAC1" resolves to BRCA1 — edit-distance matching catches misspellings.'}>
          <div className="p-6">
            <div className="max-w-md mx-auto">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg border border-border bg-background">
                <SearchIcon />
                <span className="text-foreground text-sm">BRAC1</span>
                <span className="ml-auto text-[10px] text-muted-foreground/60">
                  2 results
                </span>
              </div>
              <div className="border border-t-0 border-border rounded-b-lg divide-y divide-border overflow-hidden shadow-md">
                <div className="px-4 py-3 bg-primary/5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      BRCA1
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gene &middot; BRCA1 DNA repair associated
                    </p>
                  </div>
                  <TierBadge tier={4} reason="fuzzy" />
                </div>
                <div className="px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">BRCA1-AS1</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    Gene &middot; antisense RNA 1
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Frame>
      </section>

      {/* 3 — Batch resolve */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={3} />
          <h2 className="text-lg font-semibold text-foreground">
            Batch resolve
          </h2>
        </div>
        <Frame caption="Mixed identifier formats — rsIDs, disease names, drugs — resolved in one call.">
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Input
                  </th>
                  <th className="text-left py-2 pr-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Resolved to
                  </th>
                  <th className="text-left py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { input: "rs12345", resolved: "Variant · chr1:12345:A:G", tier: 0, reason: "id_exact" },
                  { input: "breast cancer", resolved: "Disease · MONDO:0007254", tier: 1, reason: "name_exact" },
                  { input: "Trastuzumab", resolved: "Drug · CHEMBL1201585", tier: 1, reason: "name_exact" },
                  { input: "APOE", resolved: "Gene · ENSG00000130203", tier: 0, reason: "id_exact" },
                ].map((row) => (
                  <tr
                    key={row.input}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs text-foreground">
                      {row.input}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                      {row.resolved}
                    </td>
                    <td className="py-2.5">
                      <TierBadge tier={row.tier} reason={row.reason} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Frame>
      </section>

      {/* 4 — Anchor + expand */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={4} />
          <h2 className="text-lg font-semibold text-foreground">
            Anchor + expand
          </h2>
        </div>
        <Frame caption="Click any result to anchor on it — related entities appear grouped by type.">
          <div className="p-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-[10px]">
                  Gene
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">BRCA1</p>
                <p className="text-xs text-muted-foreground">
                  BRCA1 DNA repair associated
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { type: "Diseases", items: ["Breast cancer", "Ovarian cancer", "Fanconi anemia", "Pancreatic cancer", "Prostate cancer"], total: 24 },
                { type: "Drugs", items: ["Olaparib", "Talazoparib", "Rucaparib", "Niraparib", "Cisplatin"], total: 8 },
                { type: "Pathways", items: ["DNA damage response", "Homologous recombination", "Cell cycle checkpoint", "BRCA1 pathway", "p53 signaling"], total: 15 },
              ].map((g) => (
                <div key={g.type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-foreground">
                      {g.type}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {g.total} total
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((item) => (
                      <span
                        key={item}
                        className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Frame>
      </section>

      {/* 5 — Incremental expansion */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={5} />
          <h2 className="text-lg font-semibold text-foreground">
            Incremental expansion
          </h2>
        </div>
        <Frame caption="Start with 5 results per type — expand to 50 on demand, merged and deduplicated.">
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Diseases</p>
              <span className="text-[10px] text-muted-foreground">
                5 of 24
              </span>
            </div>
            <div className="space-y-1">
              {[
                "Breast cancer",
                "Ovarian cancer",
                "Fanconi anemia",
                "Pancreatic cancer",
                "Prostate cancer",
              ].map((d, i) => (
                <div
                  key={d}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 text-sm"
                >
                  <span className="text-muted-foreground text-xs tabular-nums w-4">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{d}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                Show 19 more
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          </div>
        </Frame>
      </section>

      {/* 6 — How to trust results */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={6} />
          <h2 className="text-lg font-semibold text-foreground">
            How to trust results
          </h2>
        </div>
        <Frame caption="Every result carries a confidence tier (0-5) and a match reason explaining how it was found.">
          <div className="p-5 space-y-2">
            {[
              { name: "BRCA1", sub: "Gene · BRCA1 DNA repair associated", tier: 0, reason: "id_exact" },
              { name: "Breast cancer", sub: "Disease · MONDO:0007254", tier: 1, reason: "name_exact" },
              { name: "BRAF pathway", sub: "Pathway · R-HSA-6802957", tier: 2, reason: "prefix" },
              { name: "BRCA1", sub: "Gene · via BRAC1 (typo corrected)", tier: 4, reason: "fuzzy" },
            ].map((r, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg border border-border"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {r.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{r.sub}</p>
                </div>
                <TierBadge tier={r.tier} reason={r.reason} />
              </div>
            ))}
          </div>
        </Frame>
      </section>

      {/* 7 — Why this is relevant */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Marker n={7} />
          <h2 className="text-lg font-semibold text-foreground">
            Why this is relevant
          </h2>
        </div>
        <Frame caption="Link counts show how connected an entity is — the more edges, the richer the pivot.">
          <div className="p-5">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div>
                <p className="text-sm font-semibold text-foreground">BRCA1</p>
                <p className="text-xs text-muted-foreground">
                  Gene · BRCA1 DNA repair associated
                </p>
              </div>
              <TierBadge tier={0} reason="id_exact" />
            </div>
            <div className="mt-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Connections
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: "Diseases", count: 24 },
                  { type: "Drugs", count: 8 },
                  { type: "Pathways", count: 15 },
                  { type: "Interactions", count: 127 },
                  { type: "Phenotypes", count: 42 },
                  { type: "Variants", count: 1247 },
                  { type: "GO terms", count: 89 },
                  { type: "Publications", count: 312 },
                ].map((lc) => (
                  <div
                    key={lc.type}
                    className="rounded-md bg-muted px-3 py-2 text-center"
                  >
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {lc.count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {lc.type}
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
