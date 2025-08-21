import type { BiogridInteraction } from "@/lib/gene/ppi/constants";
import type { BiogridProcessedInteraction } from "@/components/features/gene/ppi/biogrid/biogrid-types";

export function transformBiogridData(
  data: BiogridInteraction[],
): BiogridProcessedInteraction[] {
  return data.map((item) => ({
    id: item.interaction_id || `${item.protein_a_gene}-${item.protein_b_gene}`,
    gene_a: item.protein_a_gene || "",
    gene_b: item.protein_b_gene || "",
    method: item.interaction_detection_method || "",
    degree: item.degree || "",
    confidence:
      item.confidence_numeric != null
        ? typeof item.confidence_numeric === "string"
          ? parseFloat(item.confidence_numeric)
          : item.confidence_numeric
        : 0,
    source: "BioGRID",
    publication: item.publication_first_author || "",
    publication_identifiers: item.publication_identifiers || "",
    interaction_type: item.interaction_types || "",
  }));
}

export function getBiogridUniqueValues<T>(
  data: T[],
  accessor: (item: T) => string | undefined,
): string[] {
  return Array.from(
    new Set(data.map(accessor).filter(Boolean) as string[]),
  ).sort();
}
