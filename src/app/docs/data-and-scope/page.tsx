import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { MediaSlot } from "../_components/media-slot";

export const metadata: Metadata = {
  title: "Data & Scope | FAVOR Docs",
  description:
    "Coverage and scope of data available in FAVOR.",
};

export default function DataAndScopeDocsPage() {
  return (
    <div className="max-w-4xl">
      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Data & Scope
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          This page clarifies what FAVOR is designed to cover and how to
          interpret platform outputs responsibly in research workflows.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="border border-border">
          <CardHeader><CardTitle className="text-lg">Coverage</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Variant-, gene-, disease-, drug-, and pathway-centered annotation and
            exploration patterns.
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardHeader><CardTitle className="text-lg">Modalities</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Single-entity lookup, cohort analysis, graph traversal, and AI-guided
            synthesis.
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardHeader><CardTitle className="text-lg">Strength</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Fast integrated exploration across linked evidence and relationships.
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardHeader><CardTitle className="text-lg">Boundary</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Coverage depends on source availability and backend refresh cadence.
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">Interpretation guidance</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          <li>Use FAVOR as a decision-support and exploration layer.</li>
          <li>Confirm high-impact findings with source references and domain QC.</li>
          <li>Log assumptions, filters, and model/tool settings for reproducibility.</li>
          <li>Treat absent data as unknown coverage, not necessarily negative evidence.</li>
        </ul>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Image slot: data source coverage map"
          description="Add a visual map of integrated data domains and linkages."
        />
        <MediaSlot
          type="video"
          title="Video slot: interpreting evidence"
          description="Add a short walkthrough on reading annotation evidence responsibly."
        />
      </section>
    </div>
  );
}

