import type { IntactInteraction } from "@/lib/gene/ppi/constants";
import type { IntactProcessedInteraction } from "@/components/features/gene/ppi/intact/intact-types";

export function transformIntactData(
  data: IntactInteraction[],
): IntactProcessedInteraction[] {
  return data.map((item) => ({
    id: item.interaction_id || `${item.gene_a_name}-${item.gene_b_name}`,
    gene_a: item.gene_a_name || "",
    gene_b: item.gene_b_name || "",
    method: item.interaction_detection_method || "",
    interaction_type: item.interaction_type || "",
    confidence:
      item.confidence_numeric != null
        ? typeof item.confidence_numeric === "string"
          ? parseFloat(item.confidence_numeric)
          : item.confidence_numeric
        : 0,
    source: "IntAct",
    publication:
      item.publication_first_author ||
      item.aggregated_publication_first_author ||
      "",
    publication_identifier: item.publication_identifier || "",
    expansion_method: item.expansion_method || "",
    biological_role_a: item.biological_role_a || "",
    biological_role_b: item.biological_role_b || "",
    experimental_role_a: item.experimental_role_a || "",
    experimental_role_b: item.experimental_role_b || "",
    host_organism: item.host_organism || "",
    negative: item.negative || false,
    degree: item.degree || "",
    gene_a_id: item.gene_a_id || "",
    gene_b_id: item.gene_b_id || "",
    type_interactor_a: item.type_interactor_a || "",
    type_interactor_b: item.type_interactor_b || "",
    interaction_annotation: item.interaction_annotation || "",
    detection_method_count: item.detection_method_count || 1,
  }));
}

export function getIntactUniqueValues<T>(
  data: T[],
  accessor: (item: T) => string | undefined,
): string[] {
  return Array.from(
    new Set(data.map(accessor).filter(Boolean) as string[]),
  ).sort();
}

export function getIntactUniqueExpansionMethods(
  data: IntactProcessedInteraction[],
): string[] {
  return getIntactUniqueValues(data, (item) => item.expansion_method);
}

export function getIntactUniqueBiologicalRoles(
  data: IntactProcessedInteraction[],
): string[] {
  const roles = new Set<string>();
  data.forEach((item) => {
    if (item.biological_role_a) roles.add(item.biological_role_a);
    if (item.biological_role_b) roles.add(item.biological_role_b);
  });
  return Array.from(roles).sort();
}

export function getIntactUniqueExperimentalRoles(
  data: IntactProcessedInteraction[],
): string[] {
  const roles = new Set<string>();
  data.forEach((item) => {
    if (item.experimental_role_a) roles.add(item.experimental_role_a);
    if (item.experimental_role_b) roles.add(item.experimental_role_b);
  });
  return Array.from(roles).sort();
}

export function getIntactUniqueHostOrganisms(
  data: IntactProcessedInteraction[],
): string[] {
  return getIntactUniqueValues(data, (item) => item.host_organism);
}

export function getIntactUniqueInteractorTypes(
  data: IntactProcessedInteraction[],
): string[] {
  const types = new Set<string>();
  data.forEach((item) => {
    if (item.type_interactor_a) types.add(item.type_interactor_a);
    if (item.type_interactor_b) types.add(item.type_interactor_b);
  });
  return Array.from(types).sort();
}

export function filterIntactByExpansionMethod(
  data: IntactProcessedInteraction[],
  method: string,
): IntactProcessedInteraction[] {
  if (method === "all") return data;
  return data.filter((item) => item.expansion_method === method);
}

export function filterIntactByBiologicalRole(
  data: IntactProcessedInteraction[],
  role: string,
): IntactProcessedInteraction[] {
  if (role === "all") return data;
  return data.filter(
    (item) =>
      item.biological_role_a === role || item.biological_role_b === role,
  );
}

export function filterIntactByHostOrganism(
  data: IntactProcessedInteraction[],
  organism: string,
): IntactProcessedInteraction[] {
  if (organism === "all") return data;
  return data.filter((item) => item.host_organism === organism);
}

export function filterIntactByNegativeInteraction(
  data: IntactProcessedInteraction[],
  showNegative: boolean,
): IntactProcessedInteraction[] {
  if (showNegative) return data;
  return data.filter((item) => !item.negative);
}

export function getIntactInteractionStats(data: IntactProcessedInteraction[]) {
  const stats = {
    total: data.length,
    withConfidence: data.filter((item) => item.confidence > 0).length,
    negative: data.filter((item) => item.negative).length,
    uniqueExpansionMethods: getIntactUniqueExpansionMethods(data).length,
    uniqueBiologicalRoles: getIntactUniqueBiologicalRoles(data).length,
    uniqueHostOrganisms: getIntactUniqueHostOrganisms(data).length,
    averageDetectionMethods:
      data.reduce((sum, item) => sum + item.detection_method_count, 0) /
      data.length,
  };

  return stats;
}
