import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, UploadCloud, Bot } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { Prose, Callout, Step } from "./_components/doc-primitives";

export const metadata: Metadata = {
  title: "Documentation | FAVOR",
  description:
    "FAVOR documentation: an AI-powered scientific intelligence platform for whole genome variant functional annotation.",
};

const guides = [
  {
    title: "Search & Explore",
    description: "Find variants, genes, diseases, and drugs across the knowledge graph.",
    href: "/docs/search",
    icon: Search,
  },
  {
    title: "Batch Annotation",
    description: "Upload files for large-scale variant annotation and cohort analysis.",
    href: "/docs/batch-annotation",
    icon: UploadCloud,
  },
  {
    title: "AI Agent",
    description: "Use FAVOR-GPT for natural-language analysis and exploration.",
    href: "/docs/agent",
    icon: Bot,
  },
];

export default function DocsPage() {
  return (
    <div>
      <Prose>
        <h1>FAVOR Documentation</h1>
        <p>
          FAVOR annotates all <strong>8.9 billion</strong> variants in the human
          genome (GRCh38) with 232 dimensions from 30+ sources. It combines
          functional annotation, a 14.8M-entity knowledge graph, and an AI agent
          into a single research platform.
        </p>

        <h2>What FAVOR covers</h2>
      </Prose>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Entity</th>
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Scale</th>
              <th className="text-left py-2.5 font-semibold text-foreground">Sources</th>
            </tr>
          </thead>
          <tbody>
            {[
              { entity: "Variants", scale: "8.8B SNVs + 80M indels", sources: "232 annotations from gnomAD, ClinVar, CADD, LINSIGHT, and 26 more" },
              { entity: "Genes", scale: "Gene-level annotations", sources: "Functional summaries, cross-entity relationships" },
              { entity: "Diseases", scale: "Disease-variant-gene links", sources: "ClinVar, GWAS Catalog, curated sources" },
              { entity: "Drugs", scale: "Drug-target-gene-disease", sources: "PharmGKB, ChEMBL, OpenTargets" },
              { entity: "Knowledge graph", scale: "14.8M entities, 191M+ edges", sources: "66 edge types across 40+ authoritative sources" },
            ].map((row) => (
              <tr key={row.entity} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.entity}</td>
                <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap align-top">{row.scale}</td>
                <td className="py-3 text-muted-foreground">{row.sources}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Prose>
        <h2>Getting started</h2>
      </Prose>

      <div className="mt-2 mb-8">
        <Step number={1} title="Discover">
          Search for a gene, variant, disease, or drug from the homepage.
          Results update as you type.
        </Step>
        <Step number={2} title="Inspect">
          Review annotations and linked entities on detail pages. Pivot to
          related entities.
        </Step>
        <Step number={3} title="Ask FAVOR-GPT">
          Open the{" "}
          <Link href="/agent" className="text-primary hover:underline">
            AI Agent
          </Link>{" "}
          for natural-language variant ranking, graph traversal, and statistical
          tests.
        </Step>
        <Step number={4} title="Scale">
          Use{" "}
          <Link href="/batch-annotation" className="text-primary hover:underline">
            Batch Annotation
          </Link>{" "}
          to upload files for cohort-level annotation, filtering, analytics, and
          export.
        </Step>
      </div>

      <Prose>
        <Callout variant="warning" title="Interpretation guidance">
          FAVOR is a decision-support and exploration layer. Confirm high-impact
          findings with primary sources and domain expertise. Treat absent data
          as unknown coverage, not negative evidence.
        </Callout>

        <h2>Portal guides</h2>
      </Prose>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Link key={guide.href} href={guide.href} className="block group">
              <Card className="h-full border border-border transition-colors group-hover:border-primary/40">
                <CardHeader className="space-y-2 pb-2">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <CardTitle className="text-sm">{guide.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {guide.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Read guide <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
