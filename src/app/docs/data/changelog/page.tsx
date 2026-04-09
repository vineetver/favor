import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DocsToc, type TocItem } from "../../_components/docs-toc";
import { ChangelogTimeline } from "./_components/changelog-timeline";
import { RELEASES } from "./releases";

const TOC_ITEMS: TocItem[] = RELEASES.map((r) => ({
  id: `v${r.version}`,
  label: r.version,
}));

export const metadata: Metadata = {
  title: "Changelog | FAVOR Docs",
  description:
    "Release notes for the FAVOR annotation database. Source version bumps, new annotation layers, and pipeline changes across releases.",
};

export default function DataChangelogPage() {
  return (
    <div>
      <DocsToc items={TOC_ITEMS} />

      <Link
        href="/docs/data"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Data &amp; Annotations
      </Link>

      <div className="mt-6 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Changelog
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Updates to the FAVOR annotation database. Each release covers source
          version bumps, new annotation layers, and pipeline changes.
        </p>
      </div>

      <div className="mt-16">
        <ChangelogTimeline releases={RELEASES} />
      </div>
    </div>
  );
}
