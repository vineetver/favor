import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { MediaSlot } from "../_components/media-slot";

export const metadata: Metadata = {
  title: "Getting Started | FAVOR Docs",
  description: "Get started with FAVOR in minutes.",
};

export default function GettingStartedDocsPage() {
  return (
    <div className="max-w-4xl">
      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Getting Started
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Use this page for a fast onboarding pass: where to click first, how to
          run a productive first analysis session, and how to transition into AI
          and batch workflows.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Step 1 — Discover</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Start from homepage search. Look up one known gene, variant, disease,
            or drug to orient your session.
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Step 2 — Inspect</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Review evidence, annotation summaries, and linked entities on detail
            pages.
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Step 3 — Ask FAVOR-GPT</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Open <Link className="text-primary hover:underline" href="/agent">AI Agent</Link>{" "}
            to run comparisons, summaries, and workflow-oriented analysis prompts.
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-lg">Step 4 — Scale</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            Use{" "}
            <Link className="text-primary hover:underline" href="/batch-annotation">
              Batch Annotation
            </Link>{" "}
            for larger files and cohort-level processing.
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">First-session checklist</h2>
        <ol className="mt-4 list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Search one seed entity and verify you are in the right context.</li>
          <li>Open 1-2 related pages to map available evidence and fields.</li>
          <li>Ask FAVOR-GPT for a concise summary and next analysis options.</li>
          <li>If using files, run a small batch first before full-scale upload.</li>
          <li>Document assumptions and confirm high-impact findings externally.</li>
        </ol>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Screenshot slot: homepage search"
          description="Add a UI screenshot to show first-click onboarding."
        />
        <MediaSlot
          type="video"
          title="Video slot: 2-minute quick start"
          description="Add a short quick-start video for new users."
        />
      </section>
    </div>
  );
}

