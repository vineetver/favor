// src/features/genome-browser/types/tissue.ts
// Tissue-related types for dynamic track creation

// ─────────────────────────────────────────────────────────────────────────────
// BRANDED TYPES
// ─────────────────────────────────────────────────────────────────────────────

declare const __brand: unique symbol
type Brand<T, B> = T & { [__brand]: B }

export type TissueId = Brand<string, 'TissueId'>
export type SubtissueId = Brand<string, 'SubtissueId'>
export type AssayType = Brand<string, 'AssayType'>

// ─────────────────────────────────────────────────────────────────────────────
// ASSAY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const ASSAY_TYPES = [
  'h3k27ac',
  'h3k4me3',
  'h3k4me1',
  'h3k27me3',
  'h3k9me3',
  'h3k36me3',
  'atac-seq',
  'dnase-seq',
  'ctcf',
  'pol2',
] as const

export type ValidAssayType = typeof ASSAY_TYPES[number]

export function isValidAssayType(value: string): value is ValidAssayType {
  return ASSAY_TYPES.includes(value as ValidAssayType)
}

export const ASSAY_LABELS: Record<ValidAssayType, string> = {
  'h3k27ac': 'H3K27ac',
  'h3k4me3': 'H3K4me3',
  'h3k4me1': 'H3K4me1',
  'h3k27me3': 'H3K27me3',
  'h3k9me3': 'H3K9me3',
  'h3k36me3': 'H3K36me3',
  'atac-seq': 'ATAC-seq',
  'dnase-seq': 'DNase-seq',
  'ctcf': 'CTCF',
  'pol2': 'Pol II',
}

export const ASSAY_DESCRIPTIONS: Record<ValidAssayType, string> = {
  'h3k27ac': 'Active enhancers and promoters',
  'h3k4me3': 'Active promoters',
  'h3k4me1': 'Enhancers (poised and active)',
  'h3k27me3': 'Polycomb repression',
  'h3k9me3': 'Heterochromatin',
  'h3k36me3': 'Transcribed gene bodies',
  'atac-seq': 'Open chromatin accessibility',
  'dnase-seq': 'DNase hypersensitive sites',
  'ctcf': 'CTCF binding / insulators',
  'pol2': 'RNA Polymerase II binding',
}

// ─────────────────────────────────────────────────────────────────────────────
// TISSUE SOURCE - For dynamic track creation
// ─────────────────────────────────────────────────────────────────────────────

export type TissueSource = {
  tissue: TissueId
  subtissue: SubtissueId
  assay: AssayType
}

// Helper to create a tissue source
export function createTissueSource(
  tissue: string,
  subtissue: string,
  assay: string
): TissueSource | null {
  if (!isValidAssayType(assay)) return null
  return {
    tissue: tissue as TissueId,
    subtissue: subtissue as SubtissueId,
    assay: assay as AssayType,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TISSUE GROUPS (Aligned with existing GTEx tissue groups)
// ─────────────────────────────────────────────────────────────────────────────

export type TissueGroup = {
  id: string
  name: string
  tissues: TissueMetadata[]
}

export type TissueMetadata = {
  id: string
  label: string
  subtissues: SubtissueMetadata[]
}

export type SubtissueMetadata = {
  id: string
  label: string
  availableAssays: ValidAssayType[]
}

// Tissue groups configuration (subset based on ENCODE/Roadmap data availability)
export const TISSUE_GROUPS: TissueGroup[] = [
  {
    id: 'nervous-system',
    name: 'Nervous System',
    tissues: [
      {
        id: 'brain',
        label: 'Brain',
        subtissues: [
          { id: 'neuron', label: 'Neuron', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'astrocyte', label: 'Astrocyte', availableAssays: ['h3k27ac', 'h3k4me3'] },
          { id: 'microglia', label: 'Microglia', availableAssays: ['h3k27ac', 'atac-seq'] },
          { id: 'oligodendrocyte', label: 'Oligodendrocyte', availableAssays: ['h3k27ac'] },
        ],
      },
    ],
  },
  {
    id: 'cardiovascular',
    name: 'Cardiovascular',
    tissues: [
      {
        id: 'heart',
        label: 'Heart',
        subtissues: [
          { id: 'cardiomyocyte', label: 'Cardiomyocyte', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'cardiac-fibroblast', label: 'Cardiac Fibroblast', availableAssays: ['h3k27ac'] },
        ],
      },
      {
        id: 'blood-vessel',
        label: 'Blood Vessel',
        subtissues: [
          { id: 'endothelial', label: 'Endothelial', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'smooth-muscle', label: 'Smooth Muscle', availableAssays: ['h3k27ac'] },
        ],
      },
    ],
  },
  {
    id: 'digestive',
    name: 'Digestive',
    tissues: [
      {
        id: 'liver',
        label: 'Liver',
        subtissues: [
          { id: 'hepatocyte', label: 'Hepatocyte', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq', 'dnase-seq'] },
        ],
      },
      {
        id: 'colon',
        label: 'Colon',
        subtissues: [
          { id: 'epithelial', label: 'Epithelial', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
        ],
      },
      {
        id: 'pancreas',
        label: 'Pancreas',
        subtissues: [
          { id: 'islet', label: 'Islet', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'acinar', label: 'Acinar', availableAssays: ['h3k27ac'] },
        ],
      },
    ],
  },
  {
    id: 'immune-hematologic',
    name: 'Immune & Hematologic',
    tissues: [
      {
        id: 'blood',
        label: 'Blood',
        subtissues: [
          { id: 't-cell', label: 'T Cell', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'b-cell', label: 'B Cell', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'monocyte', label: 'Monocyte', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'nk-cell', label: 'NK Cell', availableAssays: ['h3k27ac', 'atac-seq'] },
        ],
      },
      {
        id: 'spleen',
        label: 'Spleen',
        subtissues: [
          { id: 'splenic', label: 'Splenic', availableAssays: ['h3k27ac'] },
        ],
      },
    ],
  },
  {
    id: 'reproductive',
    name: 'Reproductive',
    tissues: [
      {
        id: 'breast',
        label: 'Breast',
        subtissues: [
          { id: 'epithelial', label: 'Epithelial', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'myoepithelial', label: 'Myoepithelial', availableAssays: ['h3k27ac'] },
        ],
      },
      {
        id: 'ovary',
        label: 'Ovary',
        subtissues: [
          { id: 'ovarian', label: 'Ovarian', availableAssays: ['h3k27ac', 'atac-seq'] },
        ],
      },
      {
        id: 'prostate',
        label: 'Prostate',
        subtissues: [
          { id: 'epithelial', label: 'Epithelial', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
        ],
      },
    ],
  },
  {
    id: 'respiratory',
    name: 'Respiratory',
    tissues: [
      {
        id: 'lung',
        label: 'Lung',
        subtissues: [
          { id: 'alveolar', label: 'Alveolar', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'bronchial', label: 'Bronchial', availableAssays: ['h3k27ac'] },
        ],
      },
    ],
  },
  {
    id: 'integumentary',
    name: 'Integumentary',
    tissues: [
      {
        id: 'skin',
        label: 'Skin',
        subtissues: [
          { id: 'keratinocyte', label: 'Keratinocyte', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
          { id: 'melanocyte', label: 'Melanocyte', availableAssays: ['h3k27ac'] },
          { id: 'fibroblast', label: 'Fibroblast', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
        ],
      },
    ],
  },
  {
    id: 'musculoskeletal',
    name: 'Musculoskeletal',
    tissues: [
      {
        id: 'muscle',
        label: 'Muscle',
        subtissues: [
          { id: 'skeletal', label: 'Skeletal', availableAssays: ['h3k27ac', 'h3k4me3', 'atac-seq'] },
        ],
      },
      {
        id: 'bone',
        label: 'Bone',
        subtissues: [
          { id: 'osteoblast', label: 'Osteoblast', availableAssays: ['h3k27ac'] },
        ],
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function getTissueById(tissueId: string): TissueMetadata | undefined {
  for (const group of TISSUE_GROUPS) {
    const tissue = group.tissues.find(t => t.id === tissueId)
    if (tissue) return tissue
  }
  return undefined
}

export function getSubtissueById(tissueId: string, subtissueId: string): SubtissueMetadata | undefined {
  const tissue = getTissueById(tissueId)
  if (!tissue) return undefined
  return tissue.subtissues.find(st => st.id === subtissueId)
}

export function getAvailableAssays(tissueId: string, subtissueId: string): ValidAssayType[] {
  const subtissue = getSubtissueById(tissueId, subtissueId)
  return subtissue?.availableAssays ?? []
}

export function formatTissue(tissueId: string): string {
  const tissue = getTissueById(tissueId)
  return tissue?.label ?? tissueId
}

export function formatSubtissue(subtissueId: string): string {
  // Simple capitalization since we don't have context of which tissue
  return subtissueId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatTissueSource(source: TissueSource): string {
  const tissue = formatTissue(source.tissue as string)
  const subtissue = formatSubtissue(source.subtissue as string)
  const assay = ASSAY_LABELS[source.assay as ValidAssayType] ?? source.assay
  return `${assay} (${tissue} - ${subtissue})`
}
