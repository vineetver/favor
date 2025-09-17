import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchGeneAnnotation } from "@/lib/gene/annotation/api";
import { GenomeBrowserErrorBoundary } from "@/components/features/browser/genome-browser/error-boundary";

const DynamicGenomeBrowser = dynamic(
  () =>
    import("@/components/features/browser/genome-browser/genome-browser").then(
      (mod) => ({ default: mod.GenomeBrowser }),
    ),
  {
    ssr: false,
  },
);

export default async function GeneGenomeBrowserPage({
  params,
}: {
  params: { geneName: string };
}) {
  const { geneName } = params;

  const geneData = await fetchGeneAnnotation(geneName);

  if (!geneData) {
    notFound();
  }

  if (
    !geneData.genomic_position_start ||
    !geneData.genomic_position_end ||
    !geneData.chromosome
  ) {
    return <div>No genomic position data available for this gene.</div>;
  }

  const region = `${geneData.chromosome}-${geneData.genomic_position_start}-${geneData.genomic_position_end}`;

  return (
    <GenomeBrowserErrorBoundary>
      <DynamicGenomeBrowser regionParam={region} initialTracks={[]} />
    </GenomeBrowserErrorBoundary>
  );
}
