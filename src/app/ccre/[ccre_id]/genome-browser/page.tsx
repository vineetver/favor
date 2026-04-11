import { fetchCcreEntity } from "@features/ccre/api/ccre";
import { BrowserPage } from "@features/genome-browser";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface CcreBrowserPageProps {
  params: Promise<{ ccre_id: string }>;
}

export default async function CcreBrowserPage({
  params,
}: CcreBrowserPageProps) {
  const { ccre_id } = await params;

  const response = await fetchCcreEntity(ccre_id);
  const ccre = response?.data;

  if (!ccre) notFound();

  const chromosome = `chr${ccre.chromosome}`;
  const span = ccre.end_position - ccre.start_position;
  // cCREs are typically 150–350 bp — pad generously (5kb each side) to show genomic context
  const padding = Math.max(5000, Math.floor(span * 10));
  const start = Math.max(0, ccre.start_position - padding);
  const end = ccre.end_position + padding;

  return <BrowserPage chromosome={chromosome} start={start} end={end} />;
}

export const metadata: Metadata = {
  title: "Genome Browser | cCRE",
  description:
    "Interactive genome browser centered on a candidate cis-regulatory element",
};
