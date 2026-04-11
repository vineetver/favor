import { BrowserPage } from "@features/genome-browser";
import { parseRegion } from "@features/region/utils/parse-region";
import { notFound } from "next/navigation";

interface GenomeBrowserPageProps {
  params: Promise<{ loc: string }>;
}

export default async function GenomeBrowserPage({
  params,
}: GenomeBrowserPageProps) {
  const loc = decodeURIComponent((await params).loc);
  const region = parseRegion(loc);
  if (!region) notFound();

  const chromosome = `chr${region.chromosome}`;
  // Add 10% padding on each side
  const span = region.end - region.start;
  const paddedStart = Math.max(0, region.start - Math.floor(span * 0.1));
  const paddedEnd = region.end + Math.floor(span * 0.1);

  return (
    <BrowserPage chromosome={chromosome} start={paddedStart} end={paddedEnd} />
  );
}

export const metadata = {
  title: "Genome Browser",
  description: "Interactive genome browser for a genomic region",
};
