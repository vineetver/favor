import type { EntityType } from '../types/api';

/**
 * Generate URL for an entity based on its type and ID
 */
export function getEntityUrl(
  type: EntityType,
  id: string,
  options?: {
    genome?: 'hg38' | 'hg19';
    category?: string;
    subcategory?: string;
  }
): string {
  const { genome = 'hg38', category, subcategory } = options || {};

  switch (type) {
    case 'genes':
      // Gene pages: /gene/[ensembl_id]
      return `/gene/${id}`;

    case 'variants':
      // Variant pages: /hg38/variant/[vcf]/[category]/[subcategory]
      const variantCategory = category || 'global-annotation';
      const variantSubcategory = subcategory || 'llm-summary';
      return `/${genome}/variant/${id}/${variantCategory}/${variantSubcategory}`;

    case 'diseases':
      // Disease pages: /disease/[id]
      return `/disease/${id}`;

    case 'drugs':
      // Drug pages: /drug/[id]
      return `/drug/${id}`;

    case 'pathways':
      // Pathway pages: /pathway/[id]
      return `/pathway/${id}`;

    default:
      return '/';
  }
}

/**
 * Check if an entity type has a dedicated page
 */
export function hasEntityPage(type: EntityType): boolean {
  // Variants, genes, and diseases have dedicated pages
  // Drugs and pathways use pivot explorer
  return type === 'variants' || type === 'genes' || type === 'diseases';
}

/**
 * Get entity type label (singular)
 */
export function getEntityLabel(type: EntityType, singular = false): string {
  const labels: Record<EntityType, { singular: string; plural: string }> = {
    genes: { singular: 'Gene', plural: 'Genes' },
    variants: { singular: 'Variant', plural: 'Variants' },
    diseases: { singular: 'Disease', plural: 'Diseases' },
    drugs: { singular: 'Drug', plural: 'Drugs' },
    pathways: { singular: 'Pathway', plural: 'Pathways' },
  };

  return singular ? labels[type].singular : labels[type].plural;
}
