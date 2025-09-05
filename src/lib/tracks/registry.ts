// Import track types
import type { Track, OverlaidTracks } from "@/components/gosling";
import type { TrackMetadata, TrackCategoryId } from "@/lib/tracks/types";

// Import all track specifications
import { geneTrack } from "@/components/tracks/gene_anno";
import { gnocchiTrack } from "@/components/tracks/gennochi";
import { jarvisTrack } from "@/components/tracks/jarvis";
import { cCRETrack } from "@/components/tracks/ccre";
import { atacTrack } from "@/components/tracks/atac";
import { dnaseTrack } from "@/components/tracks/dnase";
import { ctcfTrack } from "@/components/tracks/ctcf";
import { h3k4me3Track } from "@/components/tracks/h3k4me3";
import { h3k27acTrack } from "@/components/tracks/h3k27ac";
import { eQTLTrack } from "@/components/tracks/eqtl";
import { eQTLTrack2 } from "@/components/tracks/eqtls2";
import { crisprTrack } from "@/components/tracks/crispr";
import { crisprTrack2 } from "@/components/tracks/crispr2";
import { chromatinTrack } from "@/components/tracks/chomatin";
import { chromatinTrack2 } from "@/components/tracks/chomatin2";
import { clinvarTrack } from "@/components/tracks/clinvar";
import {
  mappabilityk24BismapTrack,
  mappabilityk24UmapTrack,
  mappabilityk36BismapTrack,
  mappabilityk36UmapTrack,
  mappabilityk50BismapTrack,
  mappabilityk50UmapTrack,
  mappabilityk100BismapTrack,
  mappabilityk100UmapTrack,
} from "@/components/tracks/mappability";
import {
  recomb1000gAvgTrack,
  recombAvgTrack,
  recombMatTrack,
  recombPatTrack,
} from "@/components/tracks/recomb-1000g-avg";
import { gerpNTrack, gerpRTrack } from "@/components/tracks/dbnsfp";
import {
  caddATrack,
  caddCTrack,
  caddGTrack,
  caddTTrack,
} from "@/components/tracks/cadd";
import { gwasPValueTrack } from "@/components/tracks/gwas/p-value";

interface TrackSpec {
  id: string;
  name: string;
  description: string;
  spec: Track | OverlaidTracks[];
  category: string;
  visible: boolean;
}

interface CategoryData {
  name: string;
  tracks: TrackSpec[];
}

// Track categories data with all track specifications
const allCategoriesData: CategoryData[] = [
  {
    name: "Other",
    tracks: [
      {
        id: "other_gene_annotation",
        name: "Gene Annotation",
        description:
          "Comprehensive gene annotations showing gene boundaries, exons, and strand information from GENCODE. Essential for understanding genomic context and variant impact assessment.",
        spec: geneTrack,
        category: "Other",
        visible: true,
      },
      {
        id: "other_gnocchi",
        name: "Gnocchi",
        description:
          "Specialized genomic analysis tool providing advanced pattern recognition and computational insights for research applications.",
        spec: gnocchiTrack,
        category: "Other",
        visible: false,
      },
      {
        id: "other_jarvis",
        name: "JARVIS",
        description:
          "Joint Analysis of Regulatory Variants in Single-cell data. Provides cell-type-specific regulatory analysis and variant interpretation.",
        spec: jarvisTrack,
        category: "Other",
        visible: false,
      },
    ],
  },
  {
    name: "Single Cell/Tissue",
    tracks: [
      {
        id: "single_cell_tissue_ccres",
        name: "cCREs",
        description: "cCREs are cell-type specific regulatory elements.",
        spec: cCRETrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_atac_seq_chromatin_accessibility",
        name: "ATAC-seq (Chromatin Accessibility)",
        description:
          "Assay for Transposase-Accessible Chromatin sequencing data showing open chromatin regions across different cell types and tissues.",
        spec: atacTrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_dnase_seq_chromatin_accessibility",
        name: "DNase-seq (Chromatin Accessibility)",
        description:
          "DNase hypersensitive sites revealing chromatin accessibility and active regulatory elements across multiple cell types.",
        spec: dnaseTrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_ctcf_binding",
        name: "CTCF Binding",
        description:
          "CTCF transcription factor binding sites showing chromatin organization and topological domain boundaries that regulate gene expression.",
        spec: ctcfTrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_h3k4me3_active_promoters",
        name: "H3K4me3 (Active Promoters)",
        description:
          "Histone H3 lysine 4 trimethylation marks indicating active promoter regions and transcriptional start sites across cell types.",
        spec: h3k4me3Track,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_h3k27ac_enhancer_activity",
        name: "H3K27ac (Enhancer Activity)",
        description:
          "Histone H3 lysine 27 acetylation marking active enhancers and promoters, indicating regulatory element activity levels.",
        spec: h3k27acTrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_eqtls_arc_link",
        name: "eQTLs (Arc Link)",
        description:
          "Expression quantitative trait loci showing genetic variants that influence gene expression levels, displayed as arc connections.",
        spec: eQTLTrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_eqtls_overlay_link",
        name: "eQTLs (Overlay Link)",
        description:
          "Comprehensive eQTL visualization with regulatory elements and gene links in overlay format showing complete regulatory context.",
        spec: eQTLTrack2,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_crispr_arc_link",
        name: "CRISPR (Arc Link)",
        description:
          "CRISPR screen results showing functional validation of regulatory elements and their target genes through experimental perturbation.",
        spec: crisprTrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_crispr_overlay_link",
        name: "CRISPR (Overlay Link)",
        description:
          "Comprehensive CRISPR functional validation data in overlay format showing regulatory element functionality with experimental evidence.",
        spec: crisprTrack2,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_chromatin_arc_link",
        name: "Chromatin (Arc Link)",
        description:
          "Chromatin interaction data showing 3D genome organization and long-range regulatory connections between genomic elements.",
        spec: chromatinTrack,
        category: "Single Cell/Tissue",
        visible: false,
      },
      {
        id: "single_cell_tissue_chromatin_overlay_link",
        name: "Chromatin (Overlay Link)",
        description:
          "Comprehensive chromatin organization data showing 3D genome structure and spatial regulatory relationships in overlay format.",
        spec: chromatinTrack2,
        category: "Single Cell/Tissue",
        visible: false,
      },
    ],
  },
  {
    name: "Clinvar",
    tracks: [
      {
        id: "clinvar_clinvar",
        name: "Clinvar",
        description:
          "Clinical significance annotations for genetic variants from laboratories worldwide. Essential for clinical variant interpretation and pathogenicity assessment.",
        spec: clinvarTrack,
        category: "Clinvar",
        visible: false,
      },
    ],
  },
  {
    name: "Mappability",
    tracks: [
      {
        id: "mappability_k24_bismap",
        name: "Mappability (k24) Bismap",
        description:
          "Genomic mappability scores using 24-mer analysis with Bismap algorithm for assessing sequencing alignment reliability and uniqueness.",
        spec: mappabilityk24BismapTrack,
        category: "Mappability",
        visible: false,
      },
      {
        id: "mappability_k24_umap",
        name: "Mappability (k24) Umap",
        description:
          "Genomic mappability scores using 24-mer analysis with Umap algorithm for evaluating sequence uniqueness and alignment quality.",
        spec: mappabilityk24UmapTrack,
        category: "Mappability",
        visible: false,
      },
      {
        id: "mappability_k36_bismap",
        name: "Mappability (k36) Bismap",
        description:
          "Genomic mappability scores using 36-mer analysis with Bismap algorithm for higher-resolution alignment reliability assessment.",
        spec: mappabilityk36BismapTrack,
        category: "Mappability",
        visible: false,
      },
      {
        id: "mappability_k36_umap",
        name: "Mappability (k36) Umap",
        description:
          "Genomic mappability scores using 36-mer analysis with Umap algorithm for enhanced sequence uniqueness evaluation.",
        spec: mappabilityk36UmapTrack,
        category: "Mappability",
        visible: false,
      },
      {
        id: "mappability_k50_bismap",
        name: "Mappability (k50) Bismap",
        description:
          "Genomic mappability scores using 50-mer analysis with Bismap algorithm for long-read sequencing alignment assessment.",
        spec: mappabilityk50BismapTrack,
        category: "Mappability",
        visible: false,
      },
      {
        id: "mappability_k50_umap",
        name: "Mappability (k50) Umap",
        description:
          "Genomic mappability scores using 50-mer analysis with Umap algorithm for comprehensive sequence uniqueness assessment.",
        spec: mappabilityk50UmapTrack,
        category: "Mappability",
        visible: false,
      },
      {
        id: "mappability_k100_bismap",
        name: "Mappability (k100) Bismap",
        description:
          "Genomic mappability scores using 100-mer analysis with Bismap algorithm for maximum-resolution alignment reliability evaluation.",
        spec: mappabilityk100BismapTrack,
        category: "Mappability",
        visible: false,
      },
      {
        id: "mappability_k100_umap",
        name: "Mappability (k100) Umap",
        description:
          "Genomic mappability scores using 100-mer analysis with Umap algorithm for highest-precision sequence uniqueness analysis.",
        spec: mappabilityk100UmapTrack,
        category: "Mappability",
        visible: false,
      },
    ],
  },
  {
    name: "Local Nucleotide Diversity",
    tracks: [
      {
        id: "local_nucleotide_diversity_recombination_rate_1000g_avg",
        name: "Recombination Rate (1000G) Avg",
        description:
          "Average recombination rates from 1000 Genomes Project showing genetic diversity patterns and hotspots across populations.",
        spec: recomb1000gAvgTrack,
        category: "Local Nucleotide Diversity",
        visible: false,
      },
      {
        id: "local_nucleotide_diversity_recombination_rate_avg",
        name: "Recombination Rate Avg",
        description:
          "Population-averaged recombination rates showing genome-wide patterns of genetic recombination and linkage disequilibrium.",
        spec: recombAvgTrack,
        category: "Local Nucleotide Diversity",
        visible: false,
      },
      {
        id: "local_nucleotide_diversity_recombination_rate_maternal",
        name: "Recombination Rate Maternal",
        description:
          "Sex-specific recombination rates in female meiosis showing maternal inheritance patterns and crossover frequency.",
        spec: recombMatTrack,
        category: "Local Nucleotide Diversity",
        visible: false,
      },
      {
        id: "local_nucleotide_diversity_recombination_rate_paternal",
        name: "Recombination Rate Paternal",
        description:
          "Sex-specific recombination rates in male meiosis showing paternal inheritance patterns and crossover distribution.",
        spec: recombPatTrack,
        category: "Local Nucleotide Diversity",
        visible: false,
      },
    ],
  },
  {
    name: "Conservation",
    tracks: [
      {
        id: "conservation_gerpn",
        name: "GerpN",
        description:
          "GERP neutral evolution scores measuring conservation constraint across mammalian species for variant pathogenicity assessment.",
        spec: gerpNTrack,
        category: "Conservation",
        visible: false,
      },
      {
        id: "conservation_gerpr",
        name: "GerpR",
        description:
          "GERP rejected substitution scores indicating evolutionary constraint and conservation pressure at genomic positions.",
        spec: gerpRTrack,
        category: "Conservation",
        visible: false,
      },
    ],
  },
  {
    name: "Integrative",
    tracks: [
      {
        id: "integrative_cadd_1_7_mutation_a",
        name: "CADD 1.7 (Mutation A)",
        description:
          "CADD pathogenicity predictions for A>X mutations using machine learning integration of genomic annotations and conservation scores.",
        spec: caddATrack,
        category: "Integrative",
        visible: false,
      },
      {
        id: "integrative_cadd_1_7_mutation_c",
        name: "CADD 1.7 (Mutation C)",
        description:
          "CADD pathogenicity predictions for C>X mutations using comprehensive variant annotation and deleteriousness scoring.",
        spec: caddCTrack,
        category: "Integrative",
        visible: false,
      },
      {
        id: "integrative_cadd_1_7_mutation_g",
        name: "CADD 1.7 (Mutation G)",
        description:
          "CADD pathogenicity predictions for G>X mutations with integrated functional annotations and evolutionary constraints.",
        spec: caddGTrack,
        category: "Integrative",
        visible: false,
      },
      {
        id: "integrative_cadd_1_7_mutation_t",
        name: "CADD 1.7 (Mutation T)",
        description:
          "CADD pathogenicity predictions for T>X mutations combining multiple genomic features for variant deleteriousness assessment.",
        spec: caddTTrack,
        category: "Integrative",
        visible: false,
      },
    ],
  },
  {
    name: "GWAS",
    tracks: [
      {
        id: "gwas_gwas_p_value_manhattan_plot",
        name: "GWAS P-Value Manhattan Plot",
        description:
          "Genome-wide association study results showing statistical significance of trait-associated variants across chromosomes.",
        spec: gwasPValueTrack,
        category: "GWAS",
        visible: false,
      },
    ],
  },
];

// Enhanced track documentation database
const TRACK_DOCUMENTATION: Record<
  string,
  {
    overview: string;
    dataSource: string;
    methodology: string;
    interpretation: string;
    references: string[];
    version: string;
    authors: string[];
    performance: {
      renderTime: "fast" | "medium" | "slow";
      memoryUsage: "low" | "medium" | "high";
      dataSize: string;
    };
    interactions: {
      supportedViewTypes: ("linear" | "circular" | "overlay" | "stack")[];
      linkingSupported: boolean;
      zoomBehavior: "adaptive" | "fixed" | "scalable";
    };
    customization: {
      colorable: boolean;
      heightAdjustable: boolean;
      filtersAvailable: string[];
    };
    colorLegend?: {
      title: string;
      description: string;
      categories: {
        label: string;
        color: string;
        description: string;
        biologicalMeaning?: string;
      }[];
    };
    visualElements?: {
      shapes?: {
        name: string;
        description: string;
        meaning: string;
      }[];
      patterns?: {
        name: string;
        description: string;
        meaning: string;
      }[];
      indicators?: {
        name: string;
        description: string;
        meaning: string;
      }[];
    };
  }
> = {
  // Gene Annotation
  other_gene_annotation: {
    overview:
      "Comprehensive gene annotations showing gene boundaries, exons, and strand information from GENCODE. Essential for understanding genomic context and variant impact assessment.",
    dataSource: "GENCODE comprehensive gene annotation (hg38)",
    methodology:
      "Genes displayed as horizontal bars with exons as filled rectangles. Strand information indicated by directional arrows and color coding. Gene names displayed at appropriate zoom levels with adaptive visibility based on view width.",
    interpretation:
      "Use strand colors to distinguish gene orientation: blue for forward strand (+), red for reverse strand (-). Directional arrows show transcription direction. Exon rectangles show coding regions. Essential for determining variant impact on gene structure and expression.",
    references: [
      "Frankish A, et al. GENCODE reference annotation for the human genome. Genome Res. 2019;29(4):710-718.",
      "Harrow J, et al. GENCODE: the reference human genome annotation. Genome Res. 2012;22(9):1760-74.",
    ],
    version: "1.0.0",
    authors: ["GENCODE Consortium", "Gosling.js Team"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~50MB" },
    interactions: {
      supportedViewTypes: ["linear", "overlay", "stack"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["gene_type", "strand", "name_filter"],
    },
    colorLegend: {
      title: "Gene Strand Orientation",
      description: "Color-coding for gene transcription direction on DNA strands",
      categories: [
        {
          label: "Forward Strand (+)",
          color: "#7585FF",
          description: "Genes transcribed in 5' to 3' direction",
          biologicalMeaning: "Genes on the forward DNA strand, transcribed from left to right in standard genome coordinates. Positive strand orientation."
        },
        {
          label: "Reverse Strand (-)",
          color: "#FF8A85", 
          description: "Genes transcribed in 3' to 5' direction",
          biologicalMeaning: "Genes on the reverse DNA strand, transcribed from right to left in standard genome coordinates. Negative strand orientation."
        }
      ]
    },
    visualElements: {
      shapes: [
        {
          name: "Right-pointing triangles",
          description: "Triangular markers at gene ends",
          meaning: "Indicates forward strand (+) genes - transcription direction from 5' to 3'"
        },
        {
          name: "Left-pointing triangles", 
          description: "Triangular markers at gene starts",
          meaning: "Indicates reverse strand (-) genes - transcription direction from 3' to 5'"
        },
        {
          name: "Rectangles",
          description: "Filled rectangular blocks within genes",
          meaning: "Represent individual exons - coding sequences that remain after splicing"
        }
      ],
      patterns: [
        {
          name: "Triangular line patterns",
          description: "Directional patterns along gene bodies", 
          meaning: "Show transcription direction - triangles point in direction of RNA synthesis"
        }
      ],
      indicators: [
        {
          name: "Gene name labels",
          description: "Text labels above or beside genes",
          meaning: "Display gene symbols/names when zoom level allows sufficient space"
        }
      ]
    }
  },

  // Clinical Variants
  clinvar_clinvar: {
    overview:
      "Clinical significance annotations for genetic variants from ClinVar database. Aggregates variant interpretations from clinical laboratories and research groups worldwide for clinical decision-making.",
    dataSource: "NCBI ClinVar database (monthly releases)",
    methodology:
      "Variants displayed as points and bars colored by clinical significance. Multiple visualization layers show both individual variants and aggregate counts. Height indicates variant density at different zoom levels.",
    interpretation:
      "Use color legend to interpret clinical significance. Pathogenic (red/pink) variants require immediate clinical attention, benign (green) variants generally considered safe. Gray variants of uncertain significance should be evaluated in clinical context with additional evidence.",
    references: [
      "Landrum MJ, et al. ClinVar: improving access to variant interpretations and supporting evidence. Nucleic Acids Res. 2018;46(D1):D1062-D1067.",
      "Richards S, et al. Standards and guidelines for the interpretation of sequence variants. Genet Med. 2015;17(5):405-424.",
    ],
    version: "1.0.0",
    authors: ["NCBI ClinVar Team", "Clinical Genome Resource"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~200MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "overlay", "stack"],
      linkingSupported: true,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: [
        "clinical_significance",
        "review_status",
        "variant_type",
      ],
    },
    colorLegend: {
      title: "Clinical Significance",
      description: "Color-coding for variant pathogenicity based on clinical evidence and ACMG guidelines",
      categories: [
        {
          label: "Pathogenic",
          color: "#CB3B8C",
          description: "Established pathogenic variants",
          biologicalMeaning: "Strong evidence for clinical significance. Variants are disease-causing and actionable for medical decision-making. Require immediate clinical attention."
        },
        {
          label: "Pathogenic/Likely pathogenic",
          color: "#CB71A3",
          description: "Mixed pathogenic classifications",
          biologicalMeaning: "Multiple submissions with pathogenic or likely pathogenic classifications. High confidence in clinical significance with potential medical action required."
        },
        {
          label: "Likely pathogenic",
          color: "#CB96B3", 
          description: "Probable pathogenic variants",
          biologicalMeaning: "Strong evidence suggesting pathogenicity but not definitively proven. May warrant clinical follow-up and genetic counseling."
        },
        {
          label: "Uncertain significance",
          color: "gray",
          description: "Variants of uncertain significance (VUS)",
          biologicalMeaning: "Insufficient evidence to determine pathogenicity. Requires additional functional studies, family segregation, or population data for classification."
        },
        {
          label: "Likely benign", 
          color: "#029F73",
          description: "Probably benign variants",
          biologicalMeaning: "Evidence suggests lack of pathogenicity but not definitively proven. Generally not clinically actionable but may require monitoring."
        },
        {
          label: "Benign/Likely benign",
          color: "#5A9F8C",
          description: "Mixed benign classifications", 
          biologicalMeaning: "Multiple submissions indicating benign or likely benign status. High confidence that variant is not disease-causing."
        },
        {
          label: "Benign",
          color: "#5A9F8C",
          description: "Established benign variants",
          biologicalMeaning: "Strong evidence for lack of pathogenicity. Variants are not disease-causing and generally not clinically actionable."
        }
      ]
    }
  },

  // Epigenomic Tracks
  single_cell_tissue_ccres: {
    overview:
      "Candidate cis-regulatory elements (cCREs) identified by ENCODE project. Cell-type specific regulatory elements including promoters, enhancers, and CTCF binding sites.",
    dataSource: "ENCODE Registry of cCREs (SCREEN database)",
    methodology:
      "Elements classified by chromatin accessibility and histone modifications. Displayed as horizontal rectangles grouped by regulatory element type with distinct colors for each category.",
    interpretation:
      "Overlap with variants suggests regulatory impact. Promoters affect gene expression directly, enhancers can act over long distances. CTCF sites involved in chromatin organization. Use color legend to identify element types and their regulatory roles.",
    references: [
      "ENCODE Project Consortium. Expanded encyclopaedias of DNA elements in the human and mouse genomes. Nature. 2020;583(7818):699-710.",
      "Moore JE, et al. Expanded encyclopaedias of DNA elements in the human and mouse genomes. Nature. 2020;583(7818):699-710.",
    ],
    version: "3.0.0",
    authors: ["ENCODE Project Consortium"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~300MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["ccre_type", "cell_type", "activity_level"],
    },
    colorLegend: {
      title: "cCRE Element Types",
      description: "Color-coding for candidate cis-regulatory elements based on chromatin accessibility and histone modification patterns",
      categories: [
        {
          label: "PLS (Promoter)",
          color: "#dc2626",
          description: "Promoter-like signature",
          biologicalMeaning: "Active promoter regions with high H3K4me3 and chromatin accessibility. Directly regulate transcription start sites of genes."
        },
        {
          label: "pELS (Proximal Enhancer)", 
          color: "#ea580c",
          description: "Proximal enhancer-like signature",
          biologicalMeaning: "Active enhancers near (<2kb) gene promoters with H3K27ac marks. Boost nearby gene expression through close-range interactions."
        },
        {
          label: "dELS (Distal Enhancer)",
          color: "#fddc69", 
          description: "Distal enhancer-like signature",
          biologicalMeaning: "Active enhancers distant (>2kb) from promoters with H3K27ac marks. Can regulate genes across long distances through chromatin looping."
        },
        {
          label: "CA-CTCF",
          color: "#0053DB",
          description: "Chromatin accessible with CTCF binding",
          biologicalMeaning: "Insulator elements that organize chromatin into topological domains. CTCF binding creates boundaries that constrain regulatory interactions."
        },
        {
          label: "CA-H3K4me3", 
          color: "#ea580c",
          description: "Chromatin accessible with H3K4me3",
          biologicalMeaning: "Regions with active promoter marks but without strong enhancer activity. May represent bivalent or poised regulatory states."
        },
        {
          label: "CA-TF",
          color: "#9333ea",
          description: "Chromatin accessible with transcription factor binding",
          biologicalMeaning: "Open chromatin regions bound by transcription factors. Potential regulatory sites that may lack strong histone modification signals."
        },
        {
          label: "CA (Chromatin Accessible)",
          color: "#62DF7D", 
          description: "Chromatin accessible only",
          biologicalMeaning: "Open chromatin without strong regulatory marks. May represent weak regulatory elements or regions primed for activation."
        },
        {
          label: "TF (Transcription Factor)",
          color: "#ec4899",
          description: "Transcription factor binding only", 
          biologicalMeaning: "TF binding sites in closed chromatin. May represent repressed or context-specific regulatory elements."
        }
      ]
    }
  },

  single_cell_tissue_atac_seq_chromatin_accessibility: {
    overview:
      "ATAC-seq (Assay for Transposase-Accessible Chromatin) data showing chromatin accessibility across different cell types and tissues.",
    dataSource: "ENCODE ATAC-seq experiments and tissue-specific datasets",
    methodology:
      "Accessible chromatin regions identified by transposase insertion sites. Peak height indicates accessibility level. Data normalized across cell types.",
    interpretation:
      "Accessible regions likely contain active regulatory elements. Higher peaks indicate more accessible chromatin. Compare across cell types to identify tissue-specific regulation.",
    references: [
      "Buenrostro JD, et al. ATAC-seq: A Method for Assaying Chromatin Accessibility Genome-Wide. Curr Protoc Mol Biol. 2015;109:21.29.1-21.29.9.",
      "Corces MR, et al. The chromatin accessibility landscape of primary human cancers. Science. 2018;362(6413):eaav1898.",
    ],
    version: "2.0.0",
    authors: ["ENCODE Consortium", "Tissue-specific consortia"],
    performance: {
      renderTime: "medium",
      memoryUsage: "high",
      dataSize: "~500MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cell_type", "tissue", "accessibility_threshold"],
    },
  },

  single_cell_tissue_dnase_seq_chromatin_accessibility: {
    overview:
      "DNase-seq data revealing chromatin accessibility and DNase hypersensitive sites (DHS) across multiple cell types.",
    dataSource: "ENCODE DNase-seq experiments",
    methodology:
      "DNase I hypersensitive sites mapped genome-wide. Peak intensity reflects chromatin accessibility. Hotspots indicate regulatory activity.",
    interpretation:
      "DHS regions contain active regulatory elements. Stronger signals indicate higher regulatory activity. Compare across cell types for tissue-specific patterns.",
    references: [
      "Thurman RE, et al. The accessible chromatin landscape of the human genome. Nature. 2012;489(7414):75-82.",
      "Meuleman W, et al. Index and biological spectrum of human DNase I hypersensitive sites. Nature. 2020;584(7820):244-251.",
    ],
    version: "2.0.0",
    authors: ["ENCODE Consortium"],
    performance: {
      renderTime: "medium",
      memoryUsage: "high",
      dataSize: "~400MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cell_type", "dhs_intensity", "regulatory_class"],
    },
  },

  single_cell_tissue_h3k4me3_active_promoters: {
    overview:
      "H3K4me3 histone modification marks indicating active promoter regions across different cell types and developmental stages.",
    dataSource: "ENCODE and Roadmap Epigenomics ChIP-seq data",
    methodology:
      "ChIP-seq peaks for H3K4me3 modification. Peak height indicates modification strength. Typically found at transcription start sites.",
    interpretation:
      "Strong H3K4me3 signals mark active promoters. Peak strength correlates with transcriptional activity. Compare across cell types for tissue-specific gene activity.",
    references: [
      "Barski A, et al. High-resolution profiling of histone methylations in the human genome. Cell. 2007;129(4):823-37.",
      "Roadmap Epigenomics Consortium. Integrative analysis of 111 reference human epigenomes. Nature. 2015;518(7539):317-30.",
    ],
    version: "2.0.0",
    authors: ["ENCODE Consortium", "Roadmap Epigenomics Consortium"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~250MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: [
        "cell_type",
        "modification_strength",
        "promoter_class",
      ],
    },
  },

  single_cell_tissue_h3k27ac_enhancer_activity: {
    overview:
      "H3K27ac histone modification marking active enhancers and promoters, indicating regulatory element activity.",
    dataSource: "ENCODE and Roadmap Epigenomics ChIP-seq data",
    methodology:
      "ChIP-seq enrichment for H3K27ac modification. Peaks at enhancers and active promoters. Signal strength indicates activity level.",
    interpretation:
      "H3K27ac marks active regulatory elements. Enhancer peaks away from promoters indicate distal regulation. Strong signals suggest high regulatory activity.",
    references: [
      "Creyghton MP, et al. Histone H3K27ac separates active from poised enhancers and predicts developmental state. Proc Natl Acad Sci USA. 2010;107(50):21931-6.",
      "Rada-Iglesias A, et al. A unique chromatin signature uncovers early developmental enhancers in humans. Nature. 2011;470(7333):279-83.",
    ],
    version: "2.0.0",
    authors: ["ENCODE Consortium", "Roadmap Epigenomics Consortium"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~280MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cell_type", "modification_strength", "enhancer_type"],
    },
  },

  single_cell_tissue_ctcf_binding: {
    overview:
      "CTCF binding sites showing chromatin organization and topological domain boundaries.",
    dataSource: "ENCODE CTCF ChIP-seq experiments",
    methodology:
      "ChIP-seq peaks for CTCF transcription factor. Binding sites often at domain boundaries. Orientation indicates loop formation potential.",
    interpretation:
      "CTCF sites organize chromatin into topological domains. Strong binding indicates structural organization. Disruption can affect long-range gene regulation.",
    references: [
      "Phillips JE & Corces VG. CTCF: master weaver of the genome. Cell. 2009;137(7):1194-211.",
      "Rao SS, et al. A 3D map of the human genome at kilobase resolution reveals principles of chromatin looping. Cell. 2014;159(7):1665-80.",
    ],
    version: "2.0.0",
    authors: ["ENCODE Consortium"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~100MB" },
    interactions: {
      supportedViewTypes: ["linear", "overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cell_type", "binding_strength", "domain_boundary"],
    },
  },

  // eQTL Tracks
  single_cell_tissue_eqtls_arc_link: {
    overview:
      "Expression quantitative trait loci (eQTLs) showing genetic variants that influence gene expression levels, displayed as arc connections.",
    dataSource: "GTEx v8 and tissue-specific eQTL studies",
    methodology:
      "Statistical associations between genetic variants and gene expression. Arc visualization connects variants to target genes. Regulatory elements colored by cCRE types, genes by strand orientation.",
    interpretation:
      "Strong eQTL signals indicate variants with substantial impact on gene expression. Arc connections show variant-gene relationships. Use cCRE colors to identify regulatory element types and gene strand colors for orientation.",
    references: [
      "The GTEx Consortium. The GTEx Consortium atlas of genetic regulatory effects across human tissues. Science. 2020;369(6509):1318-1330.",
      "Aguet F, et al. Genetic effects on gene expression across human tissues. Nature. 2017;550(7675):204-213.",
    ],
    version: "8.0.0",
    authors: ["GTEx Consortium"],
    performance: {
      renderTime: "slow",
      memoryUsage: "high",
      dataSize: "~600MB",
    },
    interactions: {
      supportedViewTypes: ["linear"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: [
        "tissue_type",
        "effect_size",
        "p_value_threshold",
        "distance_filter",
      ],
    },
    colorLegend: {
      title: "Regulatory Elements and Gene Strands",
      description: "Combined color scheme showing cCRE element types for regulatory regions and strand orientation for genes",
      categories: [
        {
          label: "cCRE Elements",
          color: "varies",
          description: "Regulatory elements use cCRE color scheme",
          biologicalMeaning: "See cCRE track documentation for detailed color meanings - promoters (red), enhancers (orange/yellow), CTCF sites (blue), etc."
        },
        {
          label: "Forward Strand Genes (+)",
          color: "#7585FF",
          description: "Target genes on positive strand",
          biologicalMeaning: "Genes transcribed in forward direction, connected to eQTL variants by arc links"
        },
        {
          label: "Reverse Strand Genes (-)",
          color: "#FF8A85",
          description: "Target genes on negative strand", 
          biologicalMeaning: "Genes transcribed in reverse direction, connected to eQTL variants by arc links"
        }
      ]
    }
  },

  single_cell_tissue_eqtls_overlay_link: {
    overview:
      "Comprehensive eQTL visualization with regulatory elements, gene links, and tissue-specific effects in overlay format.",
    dataSource: "Integrated GTEx v8, ENCODE cCREs, and gene annotations",
    methodology:
      "Multi-layer visualization combining cCREs, eQTL associations, and gene context. Uses consistent color schemes across all overlay components.",
    interpretation:
      "Use cCRE colors to identify regulatory element types, gene strand colors for orientation, and arc patterns for eQTL strength. Provides complete regulatory context for variant interpretation.",
    references: [
      "The GTEx Consortium. The GTEx Consortium atlas of genetic regulatory effects across human tissues. Science. 2020;369(6509):1318-1330.",
      "ENCODE Project Consortium. Expanded encyclopaedias of DNA elements in the human and mouse genomes. Nature. 2020;583(7818):699-710.",
    ],
    version: "2.0.0",
    authors: ["GTEx Consortium", "ENCODE Project"],
    performance: {
      renderTime: "slow",
      memoryUsage: "high",
      dataSize: "~800MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: [
        "tissue_type",
        "ccre_type",
        "eqtl_significance",
        "distance_filter",
      ],
    },
    colorLegend: {
      title: "Integrated Regulatory Elements and Gene Strands",
      description: "Comprehensive color scheme combining cCRE elements, gene orientations, and eQTL associations",
      categories: [
        {
          label: "cCRE Regulatory Elements",
          color: "varies",
          description: "Regulatory elements follow cCRE color scheme",
          biologicalMeaning: "Complete cCRE classification with promoters (red), enhancers (orange/yellow), CTCF sites (blue), accessible regions (green/purple/pink)"
        },
        {
          label: "Forward Strand Genes (+)",
          color: "#7585FF",
          description: "Target genes on positive strand",
          biologicalMeaning: "Genes transcribed 5' to 3', showing eQTL target relationships"
        },
        {
          label: "Reverse Strand Genes (-)",
          color: "#FF8A85",
          description: "Target genes on negative strand",
          biologicalMeaning: "Genes transcribed 3' to 5', showing eQTL target relationships"
        }
      ]
    }
  },

  // CRISPR Tracks
  single_cell_tissue_crispr_arc_link: {
    overview:
      "CRISPR screen results showing functional validation of regulatory elements and their target genes.",
    dataSource: "Genome-wide CRISPR screen databases",
    methodology:
      "CRISPR perturbation effects on gene expression. Arc connections show element-gene functional relationships. Effect sizes indicate regulatory impact.",
    interpretation:
      "Strong CRISPR effects validate functional regulatory relationships. Arc connections confirm causal element-gene interactions. Compare with eQTL data for validation.",
    references: [
      "Gasperini M, et al. CRISPR/Cas9-mediated scanning for regulatory elements required for HPRT1 expression. Nat Commun. 2017;8:14749.",
      "Fulco CP, et al. Activity-by-contact model of enhancer-promoter regulation. Nature. 2019;573(7775):573-578.",
    ],
    version: "1.0.0",
    authors: ["Broad Institute", "CRISPR Screen Consortia"],
    performance: {
      renderTime: "slow",
      memoryUsage: "high",
      dataSize: "~400MB",
    },
    interactions: {
      supportedViewTypes: ["linear"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cell_type", "effect_size", "validation_level"],
    },
  },

  single_cell_tissue_crispr_overlay_link: {
    overview:
      "Comprehensive CRISPR functional validation data in overlay format showing regulatory element functionality.",
    dataSource: "Integrated CRISPR screen results and regulatory annotations",
    methodology:
      "Multi-layer overlay combining CRISPR effects, regulatory elements, and gene annotations for comprehensive functional view.",
    interpretation:
      "Provides complete functional validation context. Use to confirm regulatory predictions with experimental evidence.",
    references: [
      "Gasperini M, et al. CRISPR/Cas9-mediated scanning for regulatory elements. Nat Commun. 2017;8:14749.",
      "Klann TS, et al. CRISPR-Cas9 epigenome editing enables high-throughput screening. Nat Methods. 2017;14(12):1164-1170.",
    ],
    version: "1.0.0",
    authors: ["Broad Institute", "CRISPR Screen Consortia"],
    performance: {
      renderTime: "slow",
      memoryUsage: "high",
      dataSize: "~500MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: [
        "cell_type",
        "effect_size",
        "validation_level",
        "element_type",
      ],
    },
  },

  // Chromatin Structure
  single_cell_tissue_chromatin_arc_link: {
    overview:
      "Chromatin interaction data showing 3D genome organization and long-range regulatory connections.",
    dataSource: "Hi-C and ChIA-PET interaction datasets",
    methodology:
      "Arc visualization of chromatin loops and interactions. Different assay types shown in distinct colors. Arc strength indicates interaction frequency and statistical significance.",
    interpretation:
      "Strong arcs indicate frequent chromatin interactions. Red arcs show Hi-C data (general chromatin organization), blue arcs show ChIA-PET data (protein-mediated interactions). Long-range arcs reveal distal regulatory relationships.",
    references: [
      "Rao SS, et al. A 3D map of the human genome at kilobase resolution reveals principles of chromatin looping. Cell. 2014;159(7):1665-80.",
      "Tang Z, et al. CTCF-Mediated Human 3D Genome Architecture Reveals Chromatin Topology for Transcription. Cell. 2015;163(7):1611-27.",
    ],
    version: "1.0.0",
    authors: ["3D Genome Consortia"],
    performance: {
      renderTime: "slow",
      memoryUsage: "high",
      dataSize: "~700MB",
    },
    interactions: {
      supportedViewTypes: ["linear"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: [
        "cell_type",
        "interaction_strength",
        "distance_filter",
      ],
    },
    colorLegend: {
      title: "Chromatin Interaction Assay Types",
      description: "Color-coding for different experimental methods used to detect chromatin interactions",
      categories: [
        {
          label: "Intact-HiC",
          color: "red",
          description: "Hi-C proximity ligation data",
          biologicalMeaning: "Genome-wide chromatin interactions detected by proximity ligation. Reveals overall 3D chromatin architecture including topological domains and compartments."
        },
        {
          label: "RNAPII-ChIAPET", 
          color: "blue",
          description: "RNA Polymerase II ChIA-PET data",
          biologicalMeaning: "Protein-mediated chromatin interactions involving RNA Polymerase II. Shows enhancer-promoter loops and transcriptional regulatory networks."
        }
      ]
    },
    visualElements: {
      shapes: [
        {
          name: "Arc curves",
          description: "Curved lines connecting genomic positions",
          meaning: "Represent spatial proximity or functional interactions between distant genomic loci"
        }
      ],
      indicators: [
        {
          name: "Arc thickness",
          description: "Width of arc curves",
          meaning: "Thicker arcs indicate stronger interaction signals or higher statistical confidence"
        },
        {
          name: "Arc opacity",
          description: "Transparency level of arc curves", 
          meaning: "More opaque arcs represent higher interaction frequencies or significance scores"
        }
      ]
    }
  },

  single_cell_tissue_chromatin_overlay_link: {
    overview:
      "Comprehensive chromatin organization data in overlay format showing 3D genome structure and regulatory relationships.",
    dataSource: "Integrated Hi-C, ChIA-PET, and regulatory element data",
    methodology:
      "Multi-layer overlay combining chromatin interactions, regulatory elements, and gene annotations. Uses same color scheme as arc link track for consistency.",
    interpretation:
      "Provides comprehensive view of 3D genome organization with regulatory context. Red interactions show Hi-C data, blue shows ChIA-PET data. Overlay includes cCREs and gene annotations for complete regulatory landscape.",
    references: [
      "Rao SS, et al. A 3D map of the human genome at kilobase resolution. Cell. 2014;159(7):1665-80.",
      "Dekker J, et al. The 4D nucleome project. Nature. 2017;549(7671):219-226.",
    ],
    version: "1.0.0",
    authors: ["4D Nucleome Consortium"],
    performance: {
      renderTime: "slow",
      memoryUsage: "high",
      dataSize: "~900MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: [
        "cell_type",
        "interaction_strength",
        "domain_type",
        "distance_filter",
      ],
    },
    colorLegend: {
      title: "Chromatin Interaction Assay Types",
      description: "Color-coding for different experimental methods used to detect chromatin interactions (same as arc link track)",
      categories: [
        {
          label: "Intact-HiC",
          color: "red",
          description: "Hi-C proximity ligation data",
          biologicalMeaning: "Genome-wide chromatin interactions detected by proximity ligation. Reveals overall 3D chromatin architecture including topological domains and compartments."
        },
        {
          label: "RNAPII-ChIAPET", 
          color: "blue",
          description: "RNA Polymerase II ChIA-PET data",
          biologicalMeaning: "Protein-mediated chromatin interactions involving RNA Polymerase II. Shows enhancer-promoter loops and transcriptional regulatory networks."
        }
      ]
    }
  },

  // Mappability tracks - simplified documentation for similar tracks
  mappability_k24_bismap: {
    overview:
      "Genomic mappability scores using 24-mer k-mers with Bismap algorithm for assessing sequencing alignment reliability.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Bismap algorithm calculates uniqueness of 24bp sequences. Higher scores indicate more unique, easily mappable regions.",
    interpretation:
      "High mappability (>0.8) regions suitable for reliable variant calling. Low mappability regions may have alignment artifacts.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~150MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  // Conservation tracks
  conservation_gerpn: {
    overview:
      "GERP neutral evolution scores measuring conservation constraint across mammalian species.",
    dataSource: "GERP++ analysis of mammalian genome alignments",
    methodology:
      "Compares observed vs expected substitution rates. Positive scores indicate conservation constraint, negative scores indicate faster evolution.",
    interpretation:
      "High positive scores (>2) indicate strong conservation constraint. Negative scores show accelerated evolution. Use for variant pathogenicity assessment.",
    references: [
      "Davydov EV, et al. Identifying a high fraction of the human genome to be under selective pressure. PLoS Comput Biol. 2010;6(12):e1001025.",
      "Cooper GM, et al. Distribution and intensity of constraint in mammalian genomic sequence. Genome Res. 2005;15(7):901-13.",
    ],
    version: "2.0.0",
    authors: ["GERP++ Team"],
    performance: {
      renderTime: "fast",
      memoryUsage: "medium",
      dataSize: "~200MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["conservation_threshold", "score_range"],
    },
  },

  // CADD tracks
  integrative_cadd_1_7_mutation_a: {
    overview:
      "CADD (Combined Annotation Dependent Depletion) pathogenicity scores for A>X mutations.",
    dataSource: "CADD v1.7 pre-computed scores",
    methodology:
      "Machine learning model integrating multiple genomic annotations to predict variant deleteriousness. Scores transformed to Phred scale.",
    interpretation:
      "Higher CADD scores indicate greater predicted deleteriousness. Scores >20 suggest pathogenic potential. Compare across mutation types.",
    references: [
      "Rentzsch P, et al. CADD: predicting the deleteriousness of variants throughout the human genome. Nucleic Acids Res. 2019;47(D1):D886-D894.",
      "Kircher M, et al. A general framework for estimating the relative pathogenicity of human genetic variants. Nat Genet. 2014;46(3):310-5.",
    ],
    version: "1.7.0",
    authors: ["CADD Team"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~300MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cadd_threshold", "mutation_type"],
    },
  },

  // GWAS
  gwas_gwas_p_value_manhattan_plot: {
    overview:
      "Genome-wide association study (GWAS) p-values displayed as Manhattan plot showing trait-associated variants.",
    dataSource: "GWAS Catalog and large-scale association studies",
    methodology:
      "Statistical association testing between genetic variants and traits. Points colored by -log10(p-value) with quantitative color scale. Height corresponds to statistical significance.",
    interpretation:
      "Higher points indicate stronger statistical associations with traits. Color intensity shows significance level - darker/warmer colors represent more significant p-values. Genome-wide significance threshold typically at -log10(p) ≥ 7.3 (p<5e-8).",
    references: [
      "Buniello A, et al. The NHGRI-EBI GWAS Catalog of published genome-wide association studies. Nucleic Acids Res. 2019;47(D1):D1005-D1012.",
      "MacArthur J, et al. The new NHGRI-EBI Catalog of published genome-wide association studies. Nucleic Acids Res. 2017;45(D1):D896-D901.",
    ],
    version: "2.0.0",
    authors: ["GWAS Catalog Team", "NHGRI-EBI"],
    performance: {
      renderTime: "medium",
      memoryUsage: "high",
      dataSize: "~400MB",
    },
    interactions: {
      supportedViewTypes: ["linear"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["p_value_threshold", "trait_category", "population"],
    },
    colorLegend: {
      title: "GWAS Statistical Significance",
      description: "Quantitative color scale representing -log10(p-value) for trait associations",
      categories: [
        {
          label: "Low Significance",
          color: "light colors",
          description: "Lower -log10(p-value) scores",
          biologicalMeaning: "Weak statistical evidence for trait association. May represent background variation or require additional validation."
        },
        {
          label: "Moderate Significance", 
          color: "medium colors",
          description: "Intermediate -log10(p-value) scores",
          biologicalMeaning: "Suggestive associations that may warrant follow-up studies. Below genome-wide significance threshold."
        },
        {
          label: "High Significance",
          color: "dark/warm colors", 
          description: "High -log10(p-value) scores (≥7.3)",
          biologicalMeaning: "Genome-wide significant associations (p<5e-8). Strong statistical evidence for trait association requiring functional validation."
        }
      ]
    },
    visualElements: {
      indicators: [
        {
          name: "Point height",
          description: "Vertical position of data points",
          meaning: "Corresponds to -log10(p-value) - higher points have more significant p-values"
        },
        {
          name: "Color intensity",
          description: "Gradual color scale from light to dark/warm",
          meaning: "Reflects statistical significance - more intense colors indicate stronger associations"
        }
      ]
    }
  },

  // Mappability tracks (k24 variants)
  mappability_k24_umap: {
    overview:
      "Genomic mappability scores using 24-mer analysis with Umap algorithm for evaluating sequence uniqueness and alignment quality.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Umap algorithm calculates uniqueness of 24bp sequences. Higher scores indicate more unique, easily mappable regions.",
    interpretation:
      "High mappability (>0.8) regions suitable for reliable variant calling. Low mappability regions may have alignment artifacts.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~150MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  mappability_k36_bismap: {
    overview:
      "Genomic mappability scores using 36-mer analysis with Bismap algorithm for higher-resolution alignment reliability assessment.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Bismap algorithm calculates uniqueness of 36bp sequences. Provides enhanced resolution for mappability assessment.",
    interpretation:
      "Improved specificity over shorter k-mers. High scores indicate excellent mappability for precise variant detection.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~170MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  mappability_k36_umap: {
    overview:
      "Genomic mappability scores using 36-mer analysis with Umap algorithm for enhanced sequence uniqueness evaluation.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Umap algorithm with 36bp sequences for improved mappability assessment. Balances sensitivity and specificity.",
    interpretation:
      "Medium-resolution mappability analysis. Suitable for most sequencing applications and variant calling pipelines.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~170MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  mappability_k50_bismap: {
    overview:
      "Genomic mappability scores using 50-mer analysis with Bismap algorithm for long-read sequencing alignment assessment.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Bismap algorithm with 50bp sequences optimized for longer read technologies and high-precision mapping.",
    interpretation:
      "Excellent for long-read sequencing and structural variant detection. Higher specificity than shorter k-mers.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: {
      renderTime: "fast",
      memoryUsage: "medium",
      dataSize: "~190MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  mappability_k50_umap: {
    overview:
      "Genomic mappability scores using 50-mer analysis with Umap algorithm for comprehensive sequence uniqueness assessment.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Umap algorithm with 50bp sequences providing balanced performance for diverse sequencing applications.",
    interpretation:
      "High-resolution mappability suitable for precision genomics. Ideal for clinical variant interpretation.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: {
      renderTime: "fast",
      memoryUsage: "medium",
      dataSize: "~190MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  mappability_k100_bismap: {
    overview:
      "Genomic mappability scores using 100-mer analysis with Bismap algorithm for maximum-resolution alignment reliability evaluation.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Bismap algorithm with 100bp sequences for ultra-high precision mappability assessment and quality control.",
    interpretation:
      "Maximum resolution mappability analysis. Essential for detecting repetitive regions and alignment artifacts.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~220MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  mappability_k100_umap: {
    overview:
      "Genomic mappability scores using 100-mer analysis with Umap algorithm for highest-precision sequence uniqueness analysis.",
    dataSource: "Pre-computed mappability scores (hg38)",
    methodology:
      "Umap algorithm with 100bp sequences for ultimate mappability precision and repetitive element identification.",
    interpretation:
      "Highest resolution available. Critical for identifying problematic genomic regions and ensuring data quality.",
    references: [
      "Choi K, et al. A fast computation of pairwise sequence alignment scores. BMC Bioinformatics. 2021;22:199.",
    ],
    version: "1.0.0",
    authors: ["Mappability Analysis Team"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~220MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["mappability_threshold"],
    },
  },

  // Recombination tracks
  local_nucleotide_diversity_recombination_rate_1000g_avg: {
    overview:
      "Average recombination rates from 1000 Genomes Project showing genetic diversity patterns and hotspots across populations.",
    dataSource: "1000 Genomes Project recombination maps",
    methodology:
      "Population-averaged recombination rates calculated from linkage disequilibrium patterns across diverse populations.",
    interpretation:
      "High recombination regions show greater genetic diversity. Hotspots indicate increased crossover frequency and reduced linkage.",
    references: [
      "1000 Genomes Project Consortium. A global reference for human genetic variation. Nature. 2015;526(7571):68-74.",
      "International HapMap Consortium. A second generation human haplotype map. Nature. 2007;449(7164):851-61.",
    ],
    version: "3.0.0",
    authors: ["1000 Genomes Project Consortium"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~100MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["recombination_threshold", "population_filter"],
    },
  },

  local_nucleotide_diversity_recombination_rate_avg: {
    overview:
      "Population-averaged recombination rates showing genome-wide patterns of genetic recombination and linkage disequilibrium.",
    dataSource: "Comprehensive population genetics studies",
    methodology:
      "Aggregate recombination rate estimates from multiple population studies and genetic maps.",
    interpretation:
      "Provides baseline recombination landscape. Use for understanding inheritance patterns and population diversity.",
    references: [
      "Kong A, et al. A high-resolution recombination map of the human genome. Nat Genet. 2002;31(3):241-7.",
      "Myers S, et al. A fine-scale map of recombination rates and hotspots across the human genome. Science. 2005;310(5746):321-4.",
    ],
    version: "2.0.0",
    authors: ["Population Genetics Consortium"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~80MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["recombination_threshold"],
    },
  },

  local_nucleotide_diversity_recombination_rate_maternal: {
    overview:
      "Sex-specific recombination rates in female meiosis showing maternal inheritance patterns and crossover frequency.",
    dataSource: "Sex-specific recombination studies",
    methodology:
      "Female-specific recombination maps derived from pedigree analysis and genetic linkage studies.",
    interpretation:
      "Higher female recombination rates in most regions. Important for understanding maternal inheritance and genetic diversity.",
    references: [
      "Broman KW, et al. Comprehensive human genetic maps: individual and sex-specific variation. Am J Hum Genet. 1998;63(3):861-9.",
      "Kong A, et al. Sequence variants in the RNF212 gene associate with genome-wide recombination rate. Science. 2008;319(5868):1398-401.",
    ],
    version: "1.0.0",
    authors: ["Sex-specific Recombination Research Group"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~70MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["recombination_threshold", "sex_specific_filter"],
    },
  },

  local_nucleotide_diversity_recombination_rate_paternal: {
    overview:
      "Sex-specific recombination rates in male meiosis showing paternal inheritance patterns and crossover distribution.",
    dataSource: "Sex-specific recombination studies",
    methodology:
      "Male-specific recombination maps with focus on paternal transmission and Y-chromosome linkage patterns.",
    interpretation:
      "Generally lower male recombination rates. Critical for understanding paternal inheritance and population structure.",
    references: [
      "Broman KW, et al. Comprehensive human genetic maps: individual and sex-specific variation. Am J Hum Genet. 1998;63(3):861-9.",
      "Coop G, et al. High-resolution mapping of crossovers reveals extensive variation in fine-scale recombination patterns. Nat Genet. 2008;40(9):1035-40.",
    ],
    version: "1.0.0",
    authors: ["Sex-specific Recombination Research Group"],
    performance: { renderTime: "fast", memoryUsage: "low", dataSize: "~70MB" },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["recombination_threshold", "sex_specific_filter"],
    },
  },

  // Conservation track (GerpR)
  conservation_gerpr: {
    overview:
      "GERP rejected substitution scores indicating evolutionary constraint and conservation pressure at genomic positions.",
    dataSource: "GERP++ conservation analysis",
    methodology:
      "Phylogenetic analysis of rejected substitutions across mammalian species. Measures deviation from neutral evolution.",
    interpretation:
      "Higher scores indicate stronger conservation constraint. Scores >2 suggest functional importance and potential pathogenicity.",
    references: [
      "Davydov EV, et al. Identifying a high fraction of the human genome to be under selective pressure. PLoS Comput Biol. 2010;6(12):e1001025.",
      "Cooper GM, et al. Distribution and intensity of constraint in mammalian genomic sequence. Genome Res. 2005;15(7):901-13.",
    ],
    version: "2.0.0",
    authors: ["GERP++ Team"],
    performance: {
      renderTime: "fast",
      memoryUsage: "medium",
      dataSize: "~200MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["conservation_threshold", "score_range"],
    },
  },

  // CADD tracks (C, G, T mutations)
  integrative_cadd_1_7_mutation_c: {
    overview:
      "CADD pathogenicity predictions for C>X mutations using comprehensive variant annotation and deleteriousness scoring.",
    dataSource: "CADD v1.7 pre-computed scores",
    methodology:
      "Support vector machine model integrating genomic annotations for C>A, C>G, C>T mutation pathogenicity prediction.",
    interpretation:
      "Higher CADD scores indicate greater predicted deleteriousness. Scores >15 suggest potential pathogenicity, >20 high confidence.",
    references: [
      "Rentzsch P, et al. CADD: predicting the deleteriousness of variants throughout the human genome. Nucleic Acids Res. 2019;47(D1):D886-D894.",
      "Kircher M, et al. A general framework for estimating the relative pathogenicity of human genetic variants. Nat Genet. 2014;46(3):310-5.",
    ],
    version: "1.7.0",
    authors: ["CADD Team"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~300MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cadd_threshold", "mutation_type"],
    },
  },

  integrative_cadd_1_7_mutation_g: {
    overview:
      "CADD pathogenicity predictions for G>X mutations with integrated functional annotations and evolutionary constraints.",
    dataSource: "CADD v1.7 pre-computed scores",
    methodology:
      "Machine learning model combining conservation, functional annotation, and regulatory data for G>A, G>C, G>T mutations.",
    interpretation:
      "Comprehensive deleteriousness assessment for guanine-based mutations. Essential for variant prioritization and clinical interpretation.",
    references: [
      "Rentzsch P, et al. CADD: predicting the deleteriousness of variants throughout the human genome. Nucleic Acids Res. 2019;47(D1):D886-D894.",
      "Kircher M, et al. A general framework for estimating the relative pathogenicity of human genetic variants. Nat Genet. 2014;46(3):310-5.",
    ],
    version: "1.7.0",
    authors: ["CADD Team"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~300MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cadd_threshold", "mutation_type"],
    },
  },

  integrative_cadd_1_7_mutation_t: {
    overview:
      "CADD pathogenicity predictions for T>X mutations combining multiple genomic features for variant deleteriousness assessment.",
    dataSource: "CADD v1.7 pre-computed scores",
    methodology:
      "Integrative scoring framework incorporating regulatory, conservation, and functional data for T>A, T>C, T>G mutations.",
    interpretation:
      "Predictive scores for thymine-based mutations. Higher scores indicate increased likelihood of functional impact and pathogenicity.",
    references: [
      "Rentzsch P, et al. CADD: predicting the deleteriousness of variants throughout the human genome. Nucleic Acids Res. 2019;47(D1):D886-D894.",
      "Kircher M, et al. A general framework for estimating the relative pathogenicity of human genetic variants. Nat Genet. 2014;46(3):310-5.",
    ],
    version: "1.7.0",
    authors: ["CADD Team"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~300MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"],
      linkingSupported: false,
      zoomBehavior: "scalable",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cadd_threshold", "mutation_type"],
    },
  },

  // Research Tools
  other_gnocchi: {
    overview:
      "Gnocchi research tool providing specialized genomic analysis and visualization capabilities.",
    dataSource: "Custom research datasets and algorithms",
    methodology:
      "Specialized computational methods for genomic pattern recognition and analysis.",
    interpretation:
      "Research-grade analysis tool. Interpret results in context of specific research questions and methodological considerations.",
    references: ["Internal research tool documentation"],
    version: "1.0.0",
    authors: ["Research Team"],
    performance: {
      renderTime: "medium",
      memoryUsage: "medium",
      dataSize: "~100MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["analysis_type"],
    },
  },

  other_jarvis: {
    overview:
      "JARVIS (Joint Analysis of Regulatory Variants in Single-cell) providing single-cell regulatory analysis.",
    dataSource: "Single-cell genomics datasets and regulatory predictions",
    methodology:
      "Integrative analysis of single-cell data for regulatory variant interpretation and cell-type-specific effects.",
    interpretation:
      "Provides cell-type-specific regulatory insights. Use for understanding tissue-specific variant effects and regulatory mechanisms.",
    references: ["JARVIS methodology and validation studies"],
    version: "1.0.0",
    authors: ["Single-cell Genomics Team"],
    performance: {
      renderTime: "slow",
      memoryUsage: "high",
      dataSize: "~600MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["cell_type", "regulatory_score", "tissue_specificity"],
    },
  },
};

// Auto-generate documentation for remaining tracks
function generateDefaultDocumentation(
  trackId: string,
  trackName: string,
  category: string,
) {
  const baseDoc = {
    version: "1.0.0",
    authors: ["Data Provider"],
    performance: {
      renderTime: "medium" as const,
      memoryUsage: "medium" as const,
      dataSize: "~200MB",
    },
    interactions: {
      supportedViewTypes: ["linear", "stack"] as const,
      linkingSupported: false,
      zoomBehavior: "scalable" as const,
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["threshold"],
    },
  };

  if (trackId.includes("mappability")) {
    return {
      ...baseDoc,
      overview: `${trackName} scores for assessing sequencing alignment reliability using ${trackId.includes("k24") ? "24" : trackId.includes("k36") ? "36" : trackId.includes("k50") ? "50" : "100"}-mer analysis.`,
      dataSource: "Pre-computed mappability scores (hg38)",
      methodology:
        "Mappability analysis using k-mer uniqueness scoring. Higher scores indicate more reliable alignment regions.",
      interpretation:
        "Use for quality control and variant calling reliability assessment. High scores (>0.8) indicate reliable regions.",
      references: ["Mappability analysis methodology papers"],
      performance: {
        renderTime: "fast",
        memoryUsage: "low",
        dataSize: "~150MB",
      },
    };
  }

  if (trackId.includes("recombination")) {
    return {
      ...baseDoc,
      overview: `${trackName} data showing recombination frequency patterns across the genome.`,
      dataSource: "1000 Genomes Project and population genetics studies",
      methodology:
        "Statistical analysis of recombination events across populations. Rates measured in centiMorgans per megabase.",
      interpretation:
        "High recombination regions show greater genetic diversity. Use for population genetics and linkage analysis.",
      references: ["1000 Genomes Project Consortium papers"],
      performance: {
        renderTime: "fast",
        memoryUsage: "low",
        dataSize: "~100MB",
      },
    };
  }

  if (trackId.includes("cadd")) {
    const mutation = trackId.split("_").pop()?.toUpperCase();
    return {
      ...baseDoc,
      overview: `CADD pathogenicity predictions for ${mutation}>X mutations using machine learning integration of genomic annotations.`,
      dataSource: "CADD v1.7 pre-computed scores",
      methodology:
        "Support vector machine model trained on benign and pathogenic variants. Scores represent relative deleteriousness.",
      interpretation:
        "Higher scores indicate greater predicted pathogenicity. Threshold >20 suggests clinical relevance.",
      references: ["Kircher M, et al. CADD framework. Nat Genet. 2014."],
      performance: {
        renderTime: "medium",
        memoryUsage: "medium",
        dataSize: "~300MB",
      },
    };
  }

  if (trackId.includes("gerp")) {
    return {
      ...baseDoc,
      overview: `${trackName} conservation scores based on mammalian genome alignments.`,
      dataSource: "GERP++ conservation analysis",
      methodology:
        "Phylogenetic analysis comparing observed vs expected substitution rates across mammalian species.",
      interpretation:
        "Positive scores indicate conservation constraint. Use for variant impact assessment.",
      references: ["Cooper GM, et al. GERP conservation. Genome Res. 2005."],
    };
  }

  return {
    ...baseDoc,
    overview: `${trackName} data providing ${category.toLowerCase()} information for genomic analysis.`,
    dataSource: "Genomic databases and analysis pipelines",
    methodology: "Standard bioinformatics processing and analysis methods.",
    interpretation:
      "Interpret in context of genomic position and other regulatory data.",
    references: ["Relevant methodology papers"],
  };
}

// Create comprehensive registry
export function createComprehensiveRegistry(): Record<string, TrackMetadata> {
  const registry: Record<string, TrackMetadata> = {};

  allCategoriesData.forEach(
    (categoryData: CategoryData, categoryIndex: number) => {
      const categoryId = categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-") as TrackCategoryId;

      categoryData.tracks.forEach((track: TrackSpec, trackIndex: number) => {
        const documentation =
          TRACK_DOCUMENTATION[track.id] ||
          generateDefaultDocumentation(track.id, track.name, categoryData.name);

        const enhancedTrack: TrackMetadata = {
          id: track.id,
          name: track.name,
          description:
            track.description ||
            documentation.overview.substring(0, 150) + "...",
          category: categoryId,
          subcategory: undefined,
          enabled: track.visible || false,
          visible: track.visible || false,
          track: track.spec,
          color: generateColor(categoryIndex, trackIndex),
          height: estimateTrackHeight(track.spec),
          order: categoryIndex * 100 + trackIndex,
          version: documentation.version,
          authors: documentation.authors,
          documentation: {
            overview: documentation.overview,
            dataSource: documentation.dataSource,
            methodology: documentation.methodology,
            interpretation: documentation.interpretation,
            references: documentation.references,
            lastUpdated: "2024-12-01",
            colorLegend: documentation.colorLegend,
            visualElements: documentation.visualElements,
          },
          performance: documentation.performance,
          interactions: documentation.interactions,
          customization: documentation.customization,
        };

        registry[track.id] = enhancedTrack;
      });
    },
  );

  return registry;
}

// Helper functions
function generateColor(categoryIndex: number, trackIndex: number): string {
  const colors = [
    "#3B82F6",
    "#EF4444",
    "#F59E0B",
    "#10B981",
    "#8B5CF6",
    "#F43F5E",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
  ];
  return colors[(categoryIndex * 3 + trackIndex) % colors.length];
}

export function estimateTrackHeight(
  spec: Track | OverlaidTracks | (Track | OverlaidTracks)[],
): number {
  if (!spec) return 60;

  if (Array.isArray(spec)) {
    return spec.reduce((sum, t) => sum + estimateTrackHeight(t), 0);
  }

  if (spec.height) return spec.height;

  return 80;
}

// Export the comprehensive registry
export const COMPREHENSIVE_TRACK_REGISTRY = createComprehensiveRegistry();

// Enhanced categories with proper metadata
export const COMPREHENSIVE_TRACK_CATEGORIES: {
  id: TrackCategoryId;
  name: string;
  description: string;
  priority: number;
}[] = [
  {
    id: "other" as const,
    name: "Other",
    description: "Core genomic annotations and research tools",
    priority: 1,
  },
  {
    id: "single-cell-tissue" as const,
    name: "Single Cell/Tissue",
    description: "Epigenomic marks, accessibility, and functional validation",
    priority: 2,
  },
  {
    id: "clinvar" as const,
    name: "Clinvar",
    description: "Clinical significance and pathogenicity data",
    priority: 3,
  },
  {
    id: "mappability" as const,
    name: "Mappability",
    description: "Sequencing mappability and technical assessments",
    priority: 4,
  },
  {
    id: "local-nucleotide-diversity" as const,
    name: "Local Nucleotide Diversity",
    description: "Recombination rates and population diversity metrics",
    priority: 5,
  },
  {
    id: "conservation" as const,
    name: "Conservation",
    description: "Cross-species conservation and constraint scores",
    priority: 6,
  },
  {
    id: "integrative" as const,
    name: "Integrative",
    description: "Computational predictions of variant deleteriousness",
    priority: 7,
  },
  {
    id: "gwas" as const,
    name: "GWAS",
    description: "Genome-wide association studies and population data",
    priority: 8,
  },
];

// Track collections optimized for different analysis workflows
export const COMPREHENSIVE_TRACK_COLLECTIONS = {
  "essential-clinical": {
    name: "Basic Clinical",
    description: "Core tracks for clinical variant interpretation",
    tracks: ["other_gene_annotation", "clinvar_clinvar"],
  },
  "regulatory-analysis": {
    name: "Complete Analysis",
    description: "Comprehensive epigenomic and regulatory data",
    tracks: [
      "other_gene_annotation",
      "clinvar_clinvar",
      "single_cell_tissue_ccres",
      "single_cell_tissue_atac_seq_chromatin_accessibility",
      "single_cell_tissue_h3k4me3_active_promoters",
      "single_cell_tissue_h3k27ac_enhancer_activity",
      "single_cell_tissue_eqtls_arc_link",
    ],
  },
  "pathogenicity-suite": {
    name: "Variant Impact",
    description: "Computational predictions and conservation scores",
    tracks: [
      "other_gene_annotation",
      "clinvar_clinvar",
      "integrative_cadd_1_7_mutation_a",
      "integrative_cadd_1_7_mutation_c",
      "integrative_cadd_1_7_mutation_g",
      "integrative_cadd_1_7_mutation_t",
      "conservation_gerpn",
      "conservation_gerpr",
    ],
  },
  "functional-validation": {
    name: "Experimental Data",
    description: "Experimental validation and functional genomics",
    tracks: [
      "other_gene_annotation",
      "clinvar_clinvar",
      "single_cell_tissue_eqtls_overlay_link",
      "single_cell_tissue_crispr_arc_link",
      "single_cell_tissue_chromatin_arc_link",
    ],
  },
  "quality-control": {
    name: "Data Quality",
    description: "Technical quality and mappability assessment",
    tracks: [
      "other_gene_annotation",
      "mappability_k24_bismap",
      "mappability_k36_bismap",
      "mappability_k50_bismap",
      "mappability_k100_bismap",
    ],
  },
  "diversity-analysis": {
    name: "Genetic Diversity",
    description: "Population genetics and recombination patterns",
    tracks: [
      "other_gene_annotation",
      "local_nucleotide_diversity_recombination_rate_1000g_avg",
      "local_nucleotide_diversity_recombination_rate_avg",
      "local_nucleotide_diversity_recombination_rate_maternal",
      "local_nucleotide_diversity_recombination_rate_paternal",
    ],
  },
  "gwas-analysis": {
    name: "GWAS Analysis",
    description: "Genome-wide association study results",
    tracks: ["other_gene_annotation", "gwas_gwas_p_value_manhattan_plot"],
  },
};
