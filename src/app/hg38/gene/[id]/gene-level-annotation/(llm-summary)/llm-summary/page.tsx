import {
  fetchAccessibilityByTissueGroup,
  fetchCcreLinksByTissueGroup,
  fetchChromatinByTissueGroup,
  fetchEnhancersByTissueGroup,
  fetchLoopsByTissueGroup,
  fetchRegionSummary,
  fetchSignalsByTissueGroup,
} from "@features/enrichment/api/region";
import { fetchGene } from "@features/gene/api";
import { GeneLLMSummary } from "@features/gene/components/gene-llm-summary";
import { buildGeneContext } from "@features/gene/utils/build-gene-context";
import { fetchCrisprByTissueGroup } from "@features/perturbation/api";

interface GeneLLMSummaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function GeneLLMSummaryPage({
  params,
}: GeneLLMSummaryPageProps) {
  const { id } = await params;

  const response = await fetchGene(id).catch(() => null);
  const gene = response?.data ?? null;

  // Build loc from gene coordinates for region-based queries
  const loc = gene
    ? `${gene.chromosome}-${gene.start_position}-${gene.end_position}`
    : null;

  const [
    regionSummary,
    signals,
    chromatin,
    enhancers,
    accessibility,
    loops,
    ccreLinks,
    crispr,
  ] = loc
    ? await Promise.all([
        fetchRegionSummary(loc).catch(() => null),
        fetchSignalsByTissueGroup(loc).catch(() => []),
        fetchChromatinByTissueGroup(loc).catch(() => []),
        fetchEnhancersByTissueGroup(loc).catch(() => []),
        fetchAccessibilityByTissueGroup(loc).catch(() => []),
        fetchLoopsByTissueGroup(loc).catch(() => []),
        fetchCcreLinksByTissueGroup(gene?.gene_symbol).catch(() => []),
        fetchCrisprByTissueGroup(loc).catch(() => []),
      ])
    : [null, [], [], [], [], [], [], []];

  const context = buildGeneContext({
    regionSummary,
    signals,
    chromatin,
    enhancers,
    accessibility,
    loops,
    ccreLinks,
    crispr,
  });

  return (
    <div className="space-y-6">
      <GeneLLMSummary geneId={id} gene={gene} context={context} />
    </div>
  );
}
