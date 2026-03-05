import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Database,
  Search,
  UploadCloud,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { MediaSlot } from "./_components/media-slot";

export const metadata: Metadata = {
  title: "Documentation | FAVOR",
  description:
    "FAVOR product documentation: getting started, AI Agent usage, search and exploration, and batch annotation workflows.",
};

const sections = [
  {
    title: "Getting Started",
    description:
      "Quick orientation to FAVOR, core workflows, and where to begin.",
    href: "/docs/getting-started",
    icon: BookOpen,
  },
  {
    title: "AI Agent",
    description:
      "How to use FAVOR-GPT effectively, supported capabilities, and prompt patterns.",
    href: "/docs/ai-agent",
    icon: Bot,
  },
  {
    title: "Search & Explore",
    description:
      "Find variants, genes, diseases, and drugs, and navigate results with confidence.",
    href: "/docs/search-and-explore",
    icon: Search,
  },
  {
    title: "Batch Annotation",
    description:
      "Upload formats, processing flow, and interpreting batch annotation results.",
    href: "/docs/batch-annotation",
    icon: UploadCloud,
  },
  {
    title: "Data & Scope",
    description:
      "Understand what data FAVOR covers, what is included, and practical limitations.",
    href: "/docs/data-and-scope",
    icon: Database,
  },
];

export default function DocsPage() {
  return (
    <div className="max-w-5xl">
      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          FAVOR Knowledge Base
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Documentation
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
          Browse practical guides for FAVOR and FAVOR-GPT. This documentation
          is designed for users who want quick onboarding, clear workflows, and
          implementation-level detail when needed.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="block">
              <Card className="h-full border border-border transition-colors hover:border-primary/40">
                <CardHeader className="space-y-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {section.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open guide <ArrowRight className="w-4 h-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Docs Hero Image"
          description="Place a branded documentation hero visual here."
        />
        <MediaSlot
          type="video"
          title="Platform Walkthrough"
          description="Place a short onboarding product walkthrough video here."
        />
      </section>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Suggested learning path
        </h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Read Getting Started.</li>
          <li>Use Search & Explore for entity-level orientation.</li>
          <li>Use AI Agent docs for natural-language workflows.</li>
          <li>Use Batch Annotation docs for file-driven analysis.</li>
          <li>Review Data & Scope for interpretation boundaries.</li>
        </ol>
      </section>
    </div>
  );
}
