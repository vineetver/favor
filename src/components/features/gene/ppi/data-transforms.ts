import type {
  BiogridInteraction,
  IntactInteraction,
  HuriInteraction,
} from "@/lib/gene/ppi/constants";
import type {
  UnifiedPPIInteraction,
  PPINetworkInteraction,
} from "@/lib/gene/ppi/types";

export function transformBiogridToUnified(
  interactions: BiogridInteraction[],
  sourceKey: string,
): UnifiedPPIInteraction[] {
  return interactions.map((interaction, index) => ({
    id: `${sourceKey}-${index}`,
    gene_a: interaction.protein_a_gene || "",
    gene_b: interaction.protein_b_gene || "",
    method: interaction.interaction_detection_method || "",
    degree: interaction.degree || "",
    confidence:
      typeof interaction.confidence_numeric === "number"
        ? interaction.confidence_numeric
        : undefined,
    source: sourceKey,
    publication: interaction.publication_first_author || "",
    publication_identifiers: interaction.publication_identifiers || "",
    interaction_type: interaction.interaction_types || "",
  }));
}

export function transformIntactToUnified(
  interactions: IntactInteraction[],
  sourceKey: string,
): UnifiedPPIInteraction[] {
  return interactions.map((interaction, index) => ({
    id: `${sourceKey}-${index}`,
    gene_a: interaction.gene_a_name || "",
    gene_b: interaction.gene_b_name || "",
    method: interaction.interaction_detection_method || "",
    degree: interaction.degree || "",
    confidence:
      typeof interaction.confidence_numeric === "number"
        ? interaction.confidence_numeric
        : undefined,
    source: sourceKey,
    publication: interaction.publication_first_author || "",
    interaction_type: interaction.interaction_type || "",
  }));
}

export function transformHuriToUnified(
  interactions: HuriInteraction[],
  sourceKey: string,
): UnifiedPPIInteraction[] {
  return interactions.map((interaction, index) => ({
    id: `${sourceKey}-${index}`,
    gene_a: interaction.gene_a || "",
    gene_b: interaction.gene_b || "",
    method: "Y2H",
    degree: interaction.degree || "",
    confidence: undefined,
    source: sourceKey,
    publication: undefined,
    interaction_type: "physical association",
  }));
}

export function transformToNetworkData(
  data: UnifiedPPIInteraction[],
): PPINetworkInteraction[] {
  return data.map((item) => ({
    gene_interactor_a: item.gene_a,
    gene_interactor_b: item.gene_b,
    method: item.method,
    degree: item.degree,
    source: item.source,
    interaction_type: item.interaction_type,
    confidence: item.confidence,
    publication: item.publication,
  }));
}

export function getTransformerForSource(
  sourceKey: "BioGRID" | "IntAct" | "HuRI",
) {
  switch (sourceKey) {
    case "BioGRID":
      return transformBiogridToUnified;
    case "IntAct":
      return transformIntactToUnified;
    case "HuRI":
      return transformHuriToUnified;
    default:
      throw new Error(`Unknown source: ${sourceKey}`);
  }
}

export function getUniqueValues<T>(
  data: T[],
  accessor: (item: T) => string | undefined,
): string[] {
  return Array.from(
    new Set(
      data
        .map(accessor)
        .filter(
          (value): value is string => Boolean(value) && value?.trim() !== "",
        ),
    ),
  ).sort();
}

export function filterInteractionsByMethod(
  data: UnifiedPPIInteraction[],
  method: string,
): UnifiedPPIInteraction[] {
  if (method === "all") return data;
  return data.filter((item) => item.method === method);
}

export function filterInteractionsByType(
  data: UnifiedPPIInteraction[],
  type: string,
): UnifiedPPIInteraction[] {
  if (type === "all") return data;
  return data.filter((item) => item.interaction_type === type);
}
