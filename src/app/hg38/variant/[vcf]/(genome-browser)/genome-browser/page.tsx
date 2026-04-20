import { BrowserPage } from "@features/genome-browser";
import { fetchVariantWithCookie } from "@features/variant/utils/fetch-with-cookie";
import { notFound } from "next/navigation";

interface GenomeBrowserPageProps {
  params: Promise<{ vcf: string }>;
}

const WINDOW_BP = 5000;

export default async function GenomeBrowserPage({
  params,
}: GenomeBrowserPageProps) {
  const { vcf } = await params;

  const result = await fetchVariantWithCookie(vcf);
  if (!result) notFound();

  const v = result.selected;
  const start = Math.max(0, v.position - WINDOW_BP);
  const end = v.position + WINDOW_BP;

  return (
    <BrowserPage
      chromosome={`chr${v.chromosome}`}
      start={start}
      end={end}
    />
  );
}

export const metadata = {
  title: "Genome Browser",
  description: "Interactive genome browser with customizable tracks",
};
