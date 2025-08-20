import type { ColumnsType } from "@/lib/annotations/types";

interface BiologicalContext {
  label: string;
  interpretation: string;
  significance: 'high' | 'moderate' | 'low' | 'neutral';
}

function getBiologicalContext(
  accessor: string, 
  value: number, 
  percentage: number,
  categorySlug: string
): BiologicalContext {
  if (categorySlug === 'allele-distribution') {
    switch (accessor) {
      case 'common':
        return {
          label: 'Population Impact',
          interpretation: 'Population polymorphisms (MAF > 1%)',
          significance: 'low'
        };
      case 'lowfreq':
        return {
          label: 'Population Impact', 
          interpretation: 'Regional/founder effects (0.01-1%)',
          significance: 'moderate'
        };
      case 'rare':
        return {
          label: 'Population Impact',
          interpretation: 'Recent mutations (< 0.01%)',
          significance: 'high'
        };
      case 'singletons':
        return {
          label: 'Population Impact',
          interpretation: 'Private/de novo variants',
          significance: 'high'
        };
      case 'doubletons':
        return {
          label: 'Population Impact',
          interpretation: 'Very rare recurrent variants',
          significance: 'high'
        };
      case 'total':
        return {
          label: 'Gene Burden',
          interpretation: 'Total variant load in gene',
          significance: 'neutral'
        };
    }
  }

  if (categorySlug === 'genecode-comprehensive-category') {
    switch (accessor) {
      case 'exonic':
        return {
          label: 'Functional Expectation',
          interpretation: percentage > 10 ? 'High impact (enriched vs 2% genome)' : 'Moderate impact (2% of genome)',
          significance: percentage > 10 ? 'high' : 'moderate'
        };
      case 'intronic':
        return {
          label: 'Functional Expectation',
          interpretation: 'Regulatory potential in introns',
          significance: 'moderate'
        };
      case 'utr':
        return {
          label: 'Functional Expectation',
          interpretation: 'Post-transcriptional regulation',
          significance: 'moderate'
        };
      case 'splicing':
        return {
          label: 'Functional Expectation',
          interpretation: 'Critical for transcript integrity',
          significance: 'high'
        };
      case 'downstream':
        return {
          label: 'Functional Expectation',
          interpretation: 'Downstream regulatory elements',
          significance: 'low'
        };
      case 'upstream':
        return {
          label: 'Functional Expectation',
          interpretation: 'Promoter/regulatory sequences',
          significance: 'moderate'
        };
      case 'intergenic':
        return {
          label: 'Functional Expectation',
          interpretation: 'Distal regulatory potential',
          significance: 'low'
        };
      case 'ncrna':
        return {
          label: 'Functional Expectation',
          interpretation: 'Non-coding RNA regulation',
          significance: 'moderate'
        };
    }
  }

  if (categorySlug === 'functional-consequences') {
    switch (accessor) {
      case 'plof':
        return {
          label: 'Protein Impact',
          interpretation: 'Severe - protein truncation/LoF',
          significance: 'high'
        };
      case 'nonsynonymous':
        return {
          label: 'Protein Impact',
          interpretation: 'Moderate - amino acid change',
          significance: 'moderate'
        };
      case 'synonymous':
        return {
          label: 'Protein Impact',
          interpretation: 'Silent - no amino acid change',
          significance: 'low'
        };
      case 'deleterious':
        return {
          label: 'Protein Impact',
          interpretation: 'SIFT predicted damaging',
          significance: 'high'
        };
      case 'damaging':
        return {
          label: 'Protein Impact',
          interpretation: 'PolyPhen predicted damaging',
          significance: 'high'
        };
      case 'cageenhancer':
        return {
          label: 'Regulatory Impact',
          interpretation: 'CAGE enhancer overlap',
          significance: 'moderate'
        };
      case 'cagepromoter':
        return {
          label: 'Regulatory Impact',
          interpretation: 'CAGE promoter overlap',
          significance: 'moderate'
        };
    }
  }

  if (categorySlug === 'clinvar') {
    switch (accessor) {
      case 'pathogenic':
        return {
          label: 'Clinical Actionability',
          interpretation: 'Immediate clinical action required',
          significance: 'high'
        };
      case 'likelypathogenic':
        return {
          label: 'Clinical Actionability',
          interpretation: 'Clinical consideration warranted',
          significance: 'high'
        };
      case 'drugresponse':
        return {
          label: 'Clinical Actionability',
          interpretation: 'Pharmacogenomic relevance',
          significance: 'moderate'
        };
      case 'unknown':
        return {
          label: 'Clinical Actionability',
          interpretation: 'Uncertain - requires monitoring',
          significance: 'moderate'
        };
      case 'likelybenign':
        return {
          label: 'Clinical Actionability',
          interpretation: 'Probably not clinically significant',
          significance: 'low'
        };
      case 'benign':
        return {
          label: 'Clinical Actionability',
          interpretation: 'Not clinically significant',
          significance: 'low'
        };
      case 'conflicting':
        return {
          label: 'Clinical Actionability',
          interpretation: 'Disputed - requires expert review',
          significance: 'moderate'
        };
    }
  }

  if (categorySlug === 'high-integrative-score') {
    const isHighScore = value > 10;
    switch (accessor) {
      case 'apcproteinfunction':
        return {
          label: 'Functional Prediction',
          interpretation: isHighScore ? 'High likelihood of protein function impact' : 'Lower likelihood of function impact',
          significance: isHighScore ? 'high' : 'low'
        };
      case 'apcconservation':
        return {
          label: 'Evolutionary Context',
          interpretation: isHighScore ? 'Highly evolutionarily conserved' : 'Less evolutionarily constrained',
          significance: isHighScore ? 'high' : 'low'
        };
      case 'caddphred':
        return {
          label: 'Deleteriousness',
          interpretation: isHighScore ? 'Predicted deleterious (CADD > 10)' : 'Predicted benign/tolerated',
          significance: isHighScore ? 'high' : 'low'
        };
      default:
        if (accessor.startsWith('apc')) {
          return {
            label: 'Regulatory Score',
            interpretation: isHighScore ? 'High regulatory/epigenetic impact' : 'Lower regulatory impact',
            significance: isHighScore ? 'moderate' : 'low'
          };
        }
    }
  }

  return {
    label: 'Biological Context',
    interpretation: 'Variant classification',
    significance: 'neutral'
  };
}

function BiologicalContextComponent({ 
  accessor, 
  value = 0, 
  percentage = 0, 
  categorySlug 
}: { 
  accessor: string;
  value?: number;
  percentage?: number;
  categorySlug: string;
}) {
  const context = getBiologicalContext(accessor, value, percentage, categorySlug);
  
  const significanceColors = {
    high: 'text-red-600',
    moderate: 'text-orange-600',
    low: 'text-blue-600',
    neutral: 'text-gray-600'
  };

  return (
    <div className="text-left space-y-1">
      <div className="flex justify-left">
        <span className={`text-left text-xs font-semibold ${significanceColors[context.significance]} whitespace-nowrap inline-block`}>
          {context.significance.toUpperCase()}
        </span>
        <span className="text-xs text-foreground font-medium">
          {context.label}
        </span>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed">
        {context.interpretation}
      </div>
    </div>
  );
}

export default BiologicalContextComponent;





export const GENE_SUMMARY_ALLELE_DISTRIBUTION: ColumnsType = {
  name: "Allele Distribution",
  slug: "allele-distribution",
  items: [
    {
      key: 1,
      header: "Total",
      accessor: "total",
      tooltip: "Total number of variants",
      biologicalContext: <BiologicalContextComponent accessor="total" categorySlug="allele-distribution" />,
    },
    {
      key: 2,
      header: "Common (MAF > 0.01)",
      accessor: "common",
      tooltip: "Minor allele frequency (MAF) > 0.01",
      biologicalContext: <BiologicalContextComponent accessor="common" categorySlug="allele-distribution" />,
    },
    {
      key: 3,
      header: "Low Frequency (0.0001 <= MAF < 0.01)",
      accessor: "lowfreq",
      tooltip: "Minor allele frequency (MAF) between 0.0001 and 0.01",
      biologicalContext: <BiologicalContextComponent accessor="lowfreq" categorySlug="allele-distribution" />,
    },
    {
      key: 4,
      header: "Rare (MAF < 0.0001)",
      accessor: "rare",
      tooltip: "Minor allele frequency (MAF) < 0.0001",
      biologicalContext: <BiologicalContextComponent accessor="rare" categorySlug="allele-distribution" />,
    },
    {
      key: 5,
      header: "Singletons",
      accessor: "singletons",
      tooltip: "Variants that are observed only once in the dataset",
      biologicalContext: <BiologicalContextComponent accessor="singletons" categorySlug="allele-distribution" />,
    },
    {
      key: 6,
      header: "Doubletons",
      accessor: "doubletons",
      tooltip: "Variants that are observed twice in the dataset",
      biologicalContext: <BiologicalContextComponent accessor="doubletons" categorySlug="allele-distribution" />,
    },
  ],
};

export const GENE_SUMMARY_GENECODE_CATEGORY: ColumnsType = {
  name: "Genecode Comprehensive Category",
  slug: "genecode-comprehensive-category",
  items: [
    {
      key: 1,
      header: "Exonic",
      accessor: "exonic",
      tooltip: "Variants that are in the exonic region",
      biologicalContext: <BiologicalContextComponent accessor="exonic" categorySlug="genecode-comprehensive-category" />,
    },
    {
      key: 2,
      header: "UTR",
      accessor: "utr",
      tooltip: "Variants that are in the UTR region",
      biologicalContext: <BiologicalContextComponent accessor="utr" categorySlug="genecode-comprehensive-category" />,
    },
    {
      key: 9,
      header: "ncRNA",
      accessor: "ncrna",
      tooltip: "Variants that are ncRNA",
      biologicalContext: <BiologicalContextComponent accessor="ncrna" categorySlug="genecode-comprehensive-category" />,
    },
    {
      key: 3,
      header: "Intronic",
      accessor: "intronic",
      tooltip: "Variants that are in the intronic region",
      biologicalContext: <BiologicalContextComponent accessor="intronic" categorySlug="genecode-comprehensive-category" />,
    },
    {
      key: 4,
      header: "Downstream",
      accessor: "downstream",
      tooltip: "Variants that are in the downstream region",
      biologicalContext: <BiologicalContextComponent accessor="downstream" categorySlug="genecode-comprehensive-category" />,
    },
    {
      key: 5,
      header: "Intergenic",
      accessor: "intergenic",
      tooltip: "Variants that are in the intergenic region",
      biologicalContext: <BiologicalContextComponent accessor="intergenic" categorySlug="genecode-comprehensive-category" />,
    },
    {
      key: 6,
      header: "Upstream",
      accessor: "upstream",
      tooltip: "Variants that are in the upstream region",
      biologicalContext: <BiologicalContextComponent accessor="upstream" categorySlug="genecode-comprehensive-category" />,
    },
    {
      key: 7,
      header: "Splicing",
      accessor: "splicing",
      tooltip: "Variants that are in the splicing region",
      biologicalContext: <BiologicalContextComponent accessor="splicing" categorySlug="genecode-comprehensive-category" />,
    },
  ],
};

export const GENE_SUMMARY_CLINVAR: ColumnsType = {
  name: "Clinvar",
  slug: "clinvar",
  items: [
    {
      key: 0,
      header: "Drug Response",
      accessor: "drugresponse",
      tooltip: "Variants that are associated with drug response",
      biologicalContext: <BiologicalContextComponent accessor="drugresponse" categorySlug="clinvar" />,
    },
    {
      key: 1,
      header: "Pathogenic",
      accessor: "pathogenic",
      tooltip: "Variants that are pathogenic",
      biologicalContext: <BiologicalContextComponent accessor="pathogenic" categorySlug="clinvar" />,
    },
    {
      key: 2,
      header: "Likely Pathogenic",
      accessor: "likelypathogenic",
      tooltip: "Variants that are likely pathogenic",
      biologicalContext: <BiologicalContextComponent accessor="likelypathogenic" categorySlug="clinvar" />,
    },
    {
      key: 3,
      header: "Benign",
      accessor: "benign",
      tooltip: "Variants that are benign",
      biologicalContext: <BiologicalContextComponent accessor="benign" categorySlug="clinvar" />,
    },
    {
      key: 4,
      header: "Likely Benign",
      accessor: "likelybenign",
      tooltip: "Variants that are likely benign",
      biologicalContext: <BiologicalContextComponent accessor="likelybenign" categorySlug="clinvar" />,
    },
    {
      key: 5,
      header: "Uncertain Significance",
      accessor: "unknown",
      tooltip: "Variants that have uncertain significance",
      biologicalContext: <BiologicalContextComponent accessor="unknown" categorySlug="clinvar" />,
    },
    {
      key: 6,
      header: "Conflicting Interpretations",
      accessor: "conflicting",
      tooltip: "Variants that have conflicting interpretations",
      biologicalContext: <BiologicalContextComponent accessor="conflicting" categorySlug="clinvar" />,
    },
  ],
};

export const GENE_SUMMARY_FUNCTIONAL_CONSEQUENCES: ColumnsType = {
  name: "Functional Consequences",
  slug: "functional-consequences",
  items: [
    {
      key: 1,
      header: "Protein LoF",
      accessor: "plof",
      tooltip: "Variants that are protein loss of function",
      biologicalContext: <BiologicalContextComponent accessor="plof" categorySlug="functional-consequences" />,
    },
    {
      key: 2,
      header: "Non-Synonymous",
      accessor: "nonsynonymous",
      tooltip: "Variants that are non-synonymous",
      biologicalContext: <BiologicalContextComponent accessor="nonsynonymous" categorySlug="functional-consequences" />,
    },
    {
      key: 3,
      header: "Synonymous",
      accessor: "synonymous",
      tooltip: "Variants that are synonymous",
      biologicalContext: <BiologicalContextComponent accessor="synonymous" categorySlug="functional-consequences" />,
    },
    {
      key: 4,
      header: "SIFT Deleterious",
      accessor: "deleterious",
      tooltip: "Variants that are deleterious",
      biologicalContext: <BiologicalContextComponent accessor="deleterious" categorySlug="functional-consequences" />,
    },
    {
      key: 5,
      header: "PolyPhen Probably Damaging",
      accessor: "damaging",
      tooltip: "Variants that are damaging",
      biologicalContext: <BiologicalContextComponent accessor="damaging" categorySlug="functional-consequences" />,
    },
    {
      key: 6,
      header: "CAGE Enhancer",
      accessor: "cageenhancer",
      tooltip: "Variants that are in the CAGE enhancer region",
      biologicalContext: <BiologicalContextComponent accessor="cageenhancer" categorySlug="functional-consequences" />,
    },
    {
      key: 7,
      header: "CAGE Promoter",
      accessor: "cagepromoter",
      tooltip: "Variants that are in the CAGE promoter region",
      biologicalContext: <BiologicalContextComponent accessor="cagepromoter" categorySlug="functional-consequences" />,
    },
  ],
};

export const GENE_SUMMARY_HIGH_INTEGRATIVE_SCORE: ColumnsType = {
  name: "High Integrative Functional Score",
  slug: "high-integrative-score",
  items: [
    {
      key: 1,
      header: "APC Protein Function",
      accessor: "apcproteinfunction",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Protein Function:</strong> Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score. Range: [2.974, 86.238]. (Li et al., 2020)
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> More likely to affect protein function</li>
            <li><strong>Lower scores:</strong> Less likely to affect protein function</li>
            <li><strong>PHRED scale:</strong> Higher values indicate stronger evidence</li>
          </ul>
        </div>
      ),
    },
    {
      key: 2,
      header: "APC Conservation",
      accessor: "apcconservation",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            Conservation annotation PC: the first PC of the standardized scores of "GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP" in PHRED scale. Range: [0, 75.824]. (Li et al., 2020)
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> More evolutionarily conserved</li>
            <li><strong>Lower scores:</strong> Less evolutionarily conserved</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apcconservation" categorySlug="high-integrative-score" />,
    },
    {
      key: 3,
      header: "APC Epigenetics Active",
      accessor: "apcepigeneticsactive",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Epigenetics Active:</strong> Integrative score combining active chromatin marks (H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac, H4K20me1, H2AFZ) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex rounded-full bg-green-300 px-2 py-1 text-xs font-medium text-green-900">Active</span>
            <span className="text-xs text-muted-foreground">Associated with gene expression and regulatory activity</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> More active chromatin state</li>
            <li><strong>Lower scores:</strong> Less active chromatin state</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apcepigeneticsactive" categorySlug="high-integrative-score" />,
    },
    {
      key: 4,
      header: "APC Epigenetics Repressed",
      accessor: "apcepigeneticsrepressive",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Epigenetics Repressed:</strong> Integrative score combining repressive chromatin marks (H3K9me3, H3K27me3) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-amber-900">Repressed</span>
            <span className="text-xs text-muted-foreground">Associated with gene silencing and heterochromatin</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> More repressed chromatin state</li>
            <li><strong>Lower scores:</strong> Less repressed chromatin state</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apcepigeneticsrepressive" categorySlug="high-integrative-score" />,
    },
    {
      key: 5,
      header: "APC Epigenetics Transcription",
      accessor: "apcepigeneticstranscription",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Epigenetics Transcription:</strong> Integrative score combining transcription-associated chromatin marks (H3K36me3, H3K79me2) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex rounded-full bg-indigo-300 px-2 py-1 text-xs font-medium text-indigo-900">Transcription</span>
            <span className="text-xs text-muted-foreground">Associated with active gene transcription</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> More transcriptionally active chromatin</li>
            <li><strong>Lower scores:</strong> Less transcriptionally active chromatin</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apcepigeneticstranscription" categorySlug="high-integrative-score" />,
    },
    {
      key: 6,
      header: "APC Local Nucleotide Diversity",
      accessor: "apclocalnucleotidediversity",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Local Nucleotide Diversity:</strong> Integrative score combining local genetic diversity measures (background selection statistic, recombination rate, nucleotide diversity) into a single PHRED-scaled score. Range: [0, 86.238]. (Li et al., 2020)
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> Higher local genetic diversity</li>
            <li><strong>Lower scores:</strong> Lower local genetic diversity</li>
            <li><strong>Diversity context:</strong> Reflects evolutionary and recombination patterns</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apclocalnucleotidediversity" categorySlug="high-integrative-score" />,
    },
    {
      key: 7,
      header: "APC Mutation Density",
      accessor: "apcmutationdensity",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Mutation Density:</strong> Integrative score combining mutation densities at different scales (100bp, 1kb, 10kb windows) for common, rare, and singleton variants into a single PHRED-scaled score. Range: [0, 84.477]. (Li et al., 2020)
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> Higher local mutation density</li>
            <li><strong>Lower scores:</strong> Lower local mutation density</li>
            <li><strong>Density context:</strong> Reflects mutational burden in genomic region</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apcmutationdensity" categorySlug="high-integrative-score" />,
    },
    {
      key: 8,
      header: "APC Transcription Factor",
      accessor: "apctranscriptionfactor",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Transcription Factor:</strong> Integrative score combining transcription factor binding evidence (ReMap TF overlap, ReMap cell line overlap) into a single PHRED-scaled score. Range: [1.185, 86.238]. (Li et al., 2020)
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> More transcription factor binding evidence</li>
            <li><strong>Lower scores:</strong> Less transcription factor binding evidence</li>
            <li><strong>TF binding:</strong> Indicates regulatory potential</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apctranscriptionfactor" categorySlug="high-integrative-score" />,
    },
    {
      key: 9,
      header: "APC Mappability",
      accessor: "apcmappability",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            <strong>aPC-Mappability:</strong> Integrative score combining sequence mappability measures at different read lengths (k=24, 36, 50, 100) for unique and multi-mapping reads into a single PHRED-scaled score. Range: [0.007, 22.966]. (Li et al., 2020)
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> Better sequence mappability</li>
            <li><strong>Lower scores:</strong> Poorer sequence mappability</li>
            <li><strong>Mappability:</strong> Affects sequencing read alignment quality</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="apcmappability" categorySlug="high-integrative-score" />,
    },
    {
      key: 10,
      header: "CADD PHRED",
      accessor: "caddphred",
      tooltip: (
        <div className="space-y-2 text-left">
          <p>
            The CADD score in PHRED scale (integrative score). A higher CADD score indicates more deleterious. Range: [0.001, 84]. (Kircher et al., 2014; Rentzsch et al., 2018)
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Higher scores (&gt;10):</strong> More likely deleterious</li>
            <li><strong>Lower scores:</strong> More likely benign</li>
          </ul>
        </div>
      ),
      biologicalContext: <BiologicalContextComponent accessor="caddphred" categorySlug="high-integrative-score" />,
    },
  ],
};


export const GENE_SUMMARY_COLUMNS_MAP: Record<string, ColumnsType[]> = {
  "SNV-summary": [
    GENE_SUMMARY_ALLELE_DISTRIBUTION,
    GENE_SUMMARY_GENECODE_CATEGORY,
    GENE_SUMMARY_CLINVAR,
    GENE_SUMMARY_FUNCTIONAL_CONSEQUENCES,
    GENE_SUMMARY_HIGH_INTEGRATIVE_SCORE,
  ],
  "InDel-summary": [
    GENE_SUMMARY_ALLELE_DISTRIBUTION,
    GENE_SUMMARY_GENECODE_CATEGORY,
    GENE_SUMMARY_CLINVAR,
    GENE_SUMMARY_FUNCTIONAL_CONSEQUENCES,
  ],
};
