import { notFound } from "next/navigation";
import { fetchGene } from "@features/gene/api";
import { BrowserPage } from "@features/genome-browser";

interface GenomeBrowserPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    region?: string;
    tracks?: string;
  }>;
}

export default async function GenomeBrowserPage({
  params,
  searchParams,
}: GenomeBrowserPageProps) {
  const { id } = await params;
  const { region, tracks } = await searchParams;

  // Fetch gene data to get genomic coordinates
  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  // Extract genomic coordinates from gene
  const chromosome = gene.chromosome ? `chr${gene.chromosome}` : undefined;
  const start = gene.start0;
  const end = gene.end0_excl;

  // Add some padding around the gene region (10% on each side)
  const paddedStart = start !== undefined && end !== undefined
    ? Math.max(0, start - Math.floor((end - start) * 0.1))
    : undefined;
  const paddedEnd = start !== undefined && end !== undefined
    ? end + Math.floor((end - start) * 0.1)
    : undefined;

  return (
    <BrowserPage
      geneId={gene.id}
      geneSymbol={gene.gene_symbol}
      chromosome={chromosome}
      start={paddedStart}
      end={paddedEnd}
    />
  );
}

export const metadata = {
  title: "Genome Browser",
  description: "Interactive genome browser with customizable tracks",
};
