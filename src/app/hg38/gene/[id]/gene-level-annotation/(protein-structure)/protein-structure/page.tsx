import { fetchGene } from "@features/gene/api";
import { ProteinStructureView } from "@features/gene/components/protein-structure";
import { assignDomainColors } from "@features/gene/components/protein-structure/colors";
import type { ProteinDomain } from "@features/gene/components/protein-structure/types";
import { fetchGraphQuery, parseTypeId } from "@features/graph/api";
import { notFound } from "next/navigation";

interface ProteinStructurePageProps {
  params: Promise<{ id: string }>;
}

export default async function GeneProteinStructurePage({
  params,
}: ProteinStructurePageProps) {
  const { id } = await params;

  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;
  if (!gene) notFound();

  const uniprotId = gene.uniprot_id;
  const geneSymbol = gene.gene_symbol ?? id;
  const geneId = gene.gene_id_versioned?.split(".")[0] || id;

  // Fetch protein domains via graph
  const domains: ProteinDomain[] = [];
  let proteinLength = 0;

  const graphResponse = await fetchGraphQuery({
    seeds: [{ type: "Gene", id: geneId }],
    steps: [
      {
        edgeTypes: ["GENE_HAS_PROTEIN_DOMAIN"],
        direction: "out",
        limit: 50,
      },
    ],
    select: {
      nodeFields: ["domain_name", "description", "interpro_type"],
      edgeFields: ["start_residue", "end_residue", "mean_plddt"],
    },
    limits: { maxNodes: 100, maxEdges: 200 },
  });

  if (graphResponse?.data) {
    const { nodes, edges } = graphResponse.data;

    // First pass: collect domain names for collision-free color assignment
    const domainNames: string[] = [];
    const rawDomains: Array<{
      id: string;
      name: string;
      start: number;
      end: number;
      type?: string;
    }> = [];

    for (const edge of edges) {
      const start = Number(edge.fields?.start_residue);
      const end = Number(edge.fields?.end_residue);
      if (!start || !end) continue;

      const targetKey = edge.to;
      const node = nodes[targetKey];
      const { id: domainId } = parseTypeId(targetKey);
      const name =
        (node?.fields?.domain_name as string) ??
        node?.entity?.label ??
        domainId;

      domainNames.push(name);
      rawDomains.push({
        id: domainId,
        name,
        start,
        end,
        type: (node?.fields?.interpro_type as string) ?? undefined,
      });

      if (end > proteinLength) proteinLength = end;
    }

    // Assign colors ensuring no two domain names share a color
    const colorMap = assignDomainColors(domainNames);
    for (const d of rawDomains) {
      domains.push({ ...d, color: colorMap.get(d.name) ?? "#2563eb" });
    }
  }

  // Add ~5% padding beyond last domain for protein length estimate
  if (proteinLength > 0) {
    proteinLength = Math.ceil(proteinLength * 1.05);
  }

  return (
    <ProteinStructureView
      uniprotId={uniprotId}
      geneSymbol={geneSymbol}
      domains={domains}
      proteinLength={proteinLength}
    />
  );
}
