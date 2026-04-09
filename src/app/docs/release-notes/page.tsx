import type { Metadata } from "next";
import { DocsToc, type TocItem } from "../_components/docs-toc";
import { ReleaseTimeline } from "./_components/release-timeline";
import { RELEASES } from "./releases";

const TOC_ITEMS: TocItem[] = RELEASES.map((r) => ({
  id: `v${r.version}`,
  label: r.version,
}));

export const metadata: Metadata = {
  title: "Release notes | FAVOR Docs",
  description:
    "Release notes for the FAVOR platform. Covers the portal, data, CLI, agent, batch pipeline, search, and API across every release.",
};

export default function ReleaseNotesPage() {
  return (
    <div>
      <DocsToc items={TOC_ITEMS} />

      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Release notes
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          A single log of every user-visible change across FAVOR. Each release
          covers the web portal, the annotation database, the CLI, the
          research agent, the batch pipeline, search, and the public API.
          Newest first.
        </p>
      </div>

      <div className="mt-16">
        <ReleaseTimeline releases={RELEASES} />
      </div>
    </div>
  );
}
