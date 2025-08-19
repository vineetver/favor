"use client";

import dynamic from "next/dynamic";
import { GenomeBrowserErrorBoundary } from "@/components/features/genome-browser/error-boundary";

const DynamicGenomeBrowser = dynamic(
  () =>
    import("@/components/features/genome-browser/genome-browser").then(
      (mod) => ({ default: mod.GenomeBrowser }),
    ),
  {
    ssr: false,
  },
);

export default function GenomeBrowserPage({
  params,
}: {
  params: { vcf: string };
}) {
  return (
    <GenomeBrowserErrorBoundary>
      <DynamicGenomeBrowser vcfParam={params.vcf} initialTracks={[]} />
    </GenomeBrowserErrorBoundary>
  );
}
