// HG19 Filter Constants for Gene Full Tables

// These use ILIKE patterns to match multiple database values, just like the summary
export const hg19GenecodeCategory = [
  { label: "Exonic", value: "exonic", pattern: "%exonic%" },
  { label: "UTR", value: "utr", pattern: "%UTR%" },
  { label: "ncRNA", value: "ncrna", pattern: "%ncRNA_%" },
  { label: "Intronic", value: "intronic", pattern: "%intronic%" },
  { label: "Downstream", value: "downstream", pattern: "%downstream%" },
  { label: "Intergenic", value: "intergenic", pattern: "%intergenic%" },
  { label: "Upstream", value: "upstream", pattern: "%upstream%" },
  { label: "Splicing", value: "splicing", pattern: "%splicing%" },
];

export const hg19ExonicCategory = [
  { label: "Stopgain", value: "stopgain", summaryKey: "stopgain" },
  { label: "Stoploss", value: "stoploss", summaryKey: "stoploss" },
  { label: "Frameshift Deletion", value: "frameshift deletion", summaryKey: "frameshift_deletion" },
  { label: "Frameshift Insertion", value: "frameshift insertion", summaryKey: "frameshift_insertion" },
  { label: "Nonframeshift Deletion", value: "nonframeshift deletion", summaryKey: "nonframeshift_deletion" },
  { label: "Nonframeshift Insertion", value: "nonframeshift insertion", summaryKey: "nonframeshift_insertion" },
  { label: "Nonsynonymous SNV", value: "nonsynonymous SNV", summaryKey: "nonsynonymous_snv" },
  { label: "Synonymous SNV", value: "synonymous SNV", summaryKey: "synonymous_snv" },
  { label: "Unknown", value: "unknown", summaryKey: "unknown_exonic" },
];

export const hg19SiftCategory = [
  { label: "Deleterious", value: "deleterious", summaryKey: "deleterious" },
  { label: "Tolerated", value: "tolerated", summaryKey: "tolerated" },
];

export const hg19ClinicalSignificance = [
  { label: "Pathogenic", value: "Pathogenic" },
  { label: "Likely Pathogenic", value: "Likely_pathogenic" },
  { label: "Benign", value: "Benign" },
  { label: "Likely Benign", value: "Likely_benign" },
  { label: "Uncertain Significance", value: "Uncertain_significance" },
  { label: "Conflicting", value: "Conflicting_interpretations_of_pathogenicity" },
  { label: "Drug Response", value: "drug_response" },
];

export const hg19VariantType = [
  { label: "SNV", value: "snv" },
  { label: "InDel", value: "indel" },
];

export const hg19FunctionalCategory = [
  { label: "Loss of Function (LoF)", value: "plof" },
  { label: "Nonsynonymous", value: "nonsynonymous" },
  { label: "Synonymous", value: "synonymous" },
  { label: "Deleterious (SIFT)", value: "deleterious" },
  { label: "Damaging (PolyPhen)", value: "damaging" },
];

export const hg19FrequencyCategory = [
  { label: "Common (>1%)", value: "common" },
];

export const hg19APCCategory = [
  { label: "APC Protein Function ≥10", value: "apcProteinFunction" },
  { label: "APC Conservation ≥10", value: "apcConservation" },
  { label: "APC Epigenetics ≥10", value: "apcEpigeneticsActive" },
  { label: "APC Proximity to TSS/TES ≥10", value: "apcProximityToTssTes" },
  { label: "APC Mutation Density ≥10", value: "apcMutationDensity" },
  { label: "APC Transcription Factor ≥10", value: "apcTranscriptionFactor" },
];

export const hg19OtherFilters = [
  { label: "CADD Phred ≥10", value: "caddPhred" },
  { label: "Has rsID", value: "hasRsid" },
];

export const hg19PolyphenPrediction = [
  { label: "Probably Damaging", value: "P" },
  { label: "Possibly Damaging", value: "D" },
  { label: "Benign", value: "B" },
];

export const hg19FathmmPrediction = [
  { label: "Damaging", value: "D" },
  { label: "Tolerated", value: "T" },
];

export const hg19RsidFilter = [
  { label: "Has rsID", value: "has_rsid" },
  { label: "All variants", value: "all" },
];
