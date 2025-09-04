// HG19 Filter Constants for Gene Full Tables

export const hg19GenecodeCategory = [
  { label: "Exonic", value: "exonic" },
  { label: "UTR", value: "utr" },
  { label: "Intronic", value: "intronic" },
  { label: "Downstream", value: "downstream" },
  { label: "Intergenic", value: "intergenic" },
  { label: "Upstream", value: "upstream" },
  { label: "Splicing", value: "splicing" },
  { label: "ncRNA", value: "ncrna" },
];

export const hg19ExonicCategory = [
  { label: "Stopgain", value: "stopgain" },
  { label: "Stoploss", value: "stoploss" },
  { label: "Frameshift Deletion", value: "frameshift deletion" },
  { label: "Frameshift Insertion", value: "frameshift insertion" },
  { label: "Nonframeshift Deletion", value: "nonframeshift deletion" },
  { label: "Nonframeshift Insertion", value: "nonframeshift insertion" },
  { label: "Nonsynonymous SNV", value: "nonsynonymous SNV" },
  { label: "Synonymous SNV", value: "synonymous SNV" },
  { label: "Unknown", value: "unknown" },
];

export const hg19SiftCategory = [
  { label: "Deleterious", value: "deleterious" },
  { label: "Tolerated", value: "tolerated" },
];

export const hg19ClinicalSignificance = [
  { label: "Pathogenic", value: "pathogenic" },
  { label: "Likely Pathogenic", value: "likelypathogenic" },
  { label: "Benign", value: "benign" },
  { label: "Likely Benign", value: "likelybenign" },
  { label: "Uncertain Significance", value: "unknown" },
  { label: "Conflicting", value: "conflicting" },
  { label: "Drug Response", value: "drugresponse" },
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