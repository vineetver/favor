import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Prose } from "./_components/doc-primitives";
import { DocsToc, type TocItem } from "./_components/docs-toc";
import { StatBanner } from "./_components/stat-banner";

export const metadata: Metadata = {
  title: "Documentation | FAVOR",
  description:
    "FAVOR (Functional Annotation of Variants Online Resource). Open-access platform for whole-genome variant functional annotation and knowledge graph exploration.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "8.9B", label: "Variants", detail: "SNVs + indels across GRCh38" },
  { value: "232", label: "Annotations", detail: "Per variant, from 30+ sources" },
  { value: "14.8M", label: "Knowledge graph entities", detail: "Genes, diseases, drugs, and more" },
  { value: "191M+", label: "Graph edges", detail: "66 relationship types" },
];

const guides = [
  { title: "Data & Annotations", description: "232 annotation dimensions across 18 categories. Full catalog of scores, frequencies, and regulatory data.", href: "/docs/data" },
  { title: "Search & Explore", description: "Query by variant, gene, region, or rsID across the knowledge graph.", href: "/docs/search" },
  { title: "Batch Annotation", description: "Upload variant lists for large-scale annotation and cohort analysis.", href: "/docs/batch-annotation" },
  { title: "FAVOR CLI", description: "Command-line tool for whole-genome functional analysis at scale.", href: "/cli" },
  { title: "FAVOR-GPT", description: "Ask questions in natural language. Search, filter, run statistics, build visualizations.", href: "/docs/agent" },
];

const TOC_ITEMS: TocItem[] = [
  { id: "get-started", label: "Get started" },
  { id: "deep-dives", label: "Engineering deep dives" },
];

const deepDives = [
  { title: "Architecture", href: "/docs/architecture", description: "Six databases, sub-10ms lookups" },
  { title: "Knowledge Graph", href: "/docs/knowledge-graph", description: "14.8M entities, 66 edge types, graph traversal engine" },
  { title: "Agent System", href: "/docs/agent-system", description: "Tool surface, reliability pipeline, self-correction" },
  { title: "Batch Pipeline", href: "/docs/batch-pipeline", description: "Upload-to-insight in minutes, key resolution, enrichment" },
  { title: "Search Engine", href: "/docs/search-engine", description: "5-tier scoring cascade, cross-type resolution" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  return (
    <div>
      <DocsToc items={TOC_ITEMS} />

      {/* ── Hero ── */}
      <Prose>
        <h1>What is FAVOR?</h1>
        <p>
          <strong>Functional Annotation of Variants Online Resource (FAVOR)</strong> is
          an open-access web portal that assembles functional annotation data for
          every variant in the human genome from a variety of sources and displays
          the information through a web interface, command-line tool, and research
          agent.
        </p>
        <p>
          FAVOR provides functional annotations for all <strong>8.9 billion</strong>{" "}
          possible single-nucleotide variants plus <strong>~80 million</strong>{" "}
          observed indels across the GRCh38 reference, covering{" "}
          <strong>232 annotation dimensions</strong> from{" "}
          <strong>30+ sources</strong> including allele frequencies, pathogenicity
          predictions, conservation, epigenetics, and regulatory elements. The
          platform also includes a <strong>14.8-million-entity knowledge
          graph</strong> linking variants, genes, diseases, and drugs.
        </p>
      </Prose>

      <div className="mt-6">
        <StatBanner stats={stats} />
      </div>

      {/* ── Guides ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="get-started">Get started</h2>
        </Prose>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Link key={guide.href} href={guide.href} className="block group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-sm">{guide.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {guide.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Read guide <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* ── Deep dives ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="deep-dives">Engineering deep dives</h2>
        </Prose>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deepDives.map((dd) => (
          <Link key={dd.href} href={dd.href} className="block group">
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-sm">{dd.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {dd.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Deep dive <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
