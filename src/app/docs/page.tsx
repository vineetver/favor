import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
  {
    value: "232",
    label: "Annotations",
    detail: "Per variant, from 30+ sources",
  },
  {
    value: "14.8M",
    label: "Knowledge graph entities",
    detail: "Genes, diseases, drugs, and more",
  },
  { value: "191M+", label: "Graph edges", detail: "66 relationship types" },
];

const guides = [
  {
    title: "Data & Annotations",
    description:
      "232 annotation dimensions across 18 categories. Full catalog of scores, frequencies, and regulatory data.",
    href: "/docs/data",
  },
  {
    title: "Search & Explore",
    description:
      "Query by variant, gene, region, or rsID across the knowledge graph.",
    href: "/docs/search",
  },
  {
    title: "Batch Annotation",
    description:
      "Upload variant lists for large-scale annotation and analysis.",
    href: "/docs/batch-annotation",
  },
  {
    title: "FAVOR CLI",
    description:
      "Command-line tool for whole-genome functional analysis at scale.",
    href: "/cli",
  },
  {
    title: "FAVOR-GPT",
    description:
      "Ask questions in natural language. Search, filter, run statistics, build visualizations.",
    href: "/docs/agent",
  },
  {
    title: "Release notes",
    description:
      "Every user-visible change across the portal, data, CLI, agent, and API. Newest first.",
    href: "/docs/release-notes",
  },
];

const TOC_ITEMS: TocItem[] = [
  { id: "portal-guide", label: "Portal guide" },
  { id: "reference", label: "Reference" },
];

const deepDives = [
  {
    title: "Architecture",
    href: "/docs/architecture",
    description:
      "The access patterns, the components, and the rules between them",
  },
  {
    title: "Knowledge Graph",
    href: "/docs/knowledge-graph",
    description: "What lives in the graph, how queries work, what it powers",
  },
  {
    title: "Agent System",
    href: "/docs/agent-system",
    description: "How the agent plans, runs tools, and self-corrects",
  },
  {
    title: "Batch Pipeline",
    href: "/docs/batch-pipeline",
    description:
      "How a variant upload becomes a queryable annotated variant list",
  },
  {
    title: "Search Engine",
    href: "/docs/search-engine",
    description: "How messy human queries become entities with confidence",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  return (
    <div>
      <DocsToc items={TOC_ITEMS} />

      <Prose>
        <h1>FAVOR documentation</h1>
        <p>
          <strong>FAVOR</strong> is a portal for functional variant annotation,
          variant list analysis, search across biomedical entities, and
          graph-assisted exploration. This documentation is split into two
          parts: guides for using the product, and reference pages for how the
          system is built.
        </p>
        <p>
          If you are using the web app, start with the portal guide below. If
          you need implementation details, data model notes, or system design,
          use the engineering reference pages under <em>Under the hood</em>.
        </p>
      </Prose>

      <div className="mt-6">
        <StatBanner stats={stats} />
      </div>

      <div className="mt-10">
        <Prose>
          <h2 id="portal-guide">Portal guide</h2>
          <p>
            These pages explain the user-facing parts of FAVOR: how to inspect
            annotation data, search and pivot between entities, upload a variant
            list, and work with the AI agent. Read them in any order.
          </p>
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

      <details className="mt-12 group" id="reference">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-0 -rotate-90" />
          Under the hood
          <span className="text-xs font-normal text-muted-foreground/70">
            how it&apos;s built
          </span>
        </summary>

        <p className="mt-3 ml-6 max-w-2xl text-xs text-muted-foreground leading-relaxed">
          Reference notes for the current implementation: architecture, graph
          structure, search internals, and batch processing. These pages are
          useful if you are integrating with FAVOR or working on the system
          itself. For user-visible changes, read the{" "}
          <a
            href="/docs/release-notes"
            className="text-primary hover:underline"
          >
            release notes
          </a>
          .
        </p>

        <div className="mt-4 ml-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deepDives.map((dd) => (
            <Link key={dd.href} href={dd.href} className="block group/card">
              <Card className="h-full transition-colors group-hover/card:border-primary/40">
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
      </details>
    </div>
  );
}
