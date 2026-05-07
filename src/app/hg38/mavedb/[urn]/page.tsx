import { fetchScoresetDetail } from "@features/mavedb/api";
import { notFound, redirect } from "next/navigation";

interface AliasPageProps {
  params: Promise<{ urn: string }>;
}

/**
 * Flat alias for a MaveDB scoreset URL. Resolves the target gene from the
 * scoreset detail and redirects into the gene-scoped detail route.
 *
 * Used as the link target from the variant gateway (which doesn't carry
 * a gene id alongside each band) so the variant page can stay decoupled
 * from gene-resolution logic.
 */
export default async function MavedbAliasPage({ params }: AliasPageProps) {
  const { urn } = await params;

  const detail = await fetchScoresetDetail(urn).catch(() => null);
  if (!detail) notFound();

  // target_genes always contains at least one entry; the gene name is
  // sometimes a sub-region label ("BRCA1 RING domain") so we strip the
  // first whitespace-separated token to land on the gene page.
  const targetName = detail.target_genes[0]?.target_gene_name ?? "";
  const symbol = targetName.split(/\s+/)[0];
  if (!symbol) notFound();

  redirect(
    `/hg38/gene/${encodeURIComponent(symbol)}/gene-level-annotation/mave/${encodeURIComponent(urn)}`,
  );
}
