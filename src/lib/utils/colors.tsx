const colorVariants = {
  blue: "bg-blue-300 text-blue-900 hover:bg-blue-400 focus:bg-blue-400",
  red: "bg-red-300 text-red-900 hover:bg-red-400 focus:bg-red-400",
  green: "bg-green-300 text-green-900 hover:bg-green-400 focus:bg-green-400",
  indigo:
    "bg-indigo-300 text-indigo-900 hover:bg-indigo-400 focus:bg-indigo-400",
  lime: "bg-lime-300 text-lime-900 hover:bg-lime-400 focus:bg-lime-400",
  teal: "bg-teal-300 text-teal-900 hover:bg-teal-400 focus:bg-teal-400",
  cyan: "bg-cyan-300 text-cyan-900 hover:bg-cyan-400 focus:bg-cyan-400",
  yellow:
    "bg-yellow-300 text-yellow-900 hover:bg-yellow-400 focus:bg-yellow-400",
  rose: "bg-rose-300 text-rose-900 hover:bg-rose-400 focus:bg-rose-400",
  sky: "bg-sky-300 text-sky-900 hover:bg-sky-400 focus:bg-sky-400",
  orange:
    "bg-orange-300 text-orange-900 hover:bg-orange-400 focus:bg-orange-400",
  stone: "bg-stone-300 text-stone-900 hover:bg-stone-400 focus:bg-stone-400",
  amber: "bg-amber-300 text-amber-900 hover:bg-amber-400 focus:bg-amber-400",
  emerald:
    "bg-emerald-300 text-emerald-900 hover:bg-emerald-400 focus:bg-emerald-400",
  fuchsia:
    "bg-fuchsia-300 text-fuchsia-900 hover:bg-fuchsia-400 focus:bg-fuchsia-400",
  violet:
    "bg-violet-300 text-violet-900 hover:bg-violet-400 focus:bg-violet-400",
  purple:
    "bg-purple-300 text-purple-900 hover:bg-purple-400 focus:bg-purple-400",
  pink: "bg-pink-300 text-pink-900 hover:bg-pink-400 focus:bg-pink-400",
  gray: "bg-gray-300 text-gray-900 hover:bg-gray-400 focus:bg-gray-400",
};

export function genecodeComprehensiveCategoryCCode(value: string) {
  if (value.match(/(exonic)/i)) {
    return getSpanElement(value, "stone");
  } else if (value.match(/(UTR)/i)) {
    return getSpanElement(value, "indigo");
  } else if (value.match(/(intronic)/i)) {
    return getSpanElement(value, "lime");
  } else if (value.match(/(downstream)/i)) {
    return getSpanElement(value, "teal");
  } else if (value.match(/(intergenic)/i)) {
    return getSpanElement(value, "cyan");
  } else if (value.match(/^upstream$/)) {
    return getSpanElement(value, "sky");
  } else if (value.match(/(splicing)/i)) {
    return getSpanElement(value, "yellow");
  } else {
    return getSpanElement(value, "amber");
  }
}

export function ccreAnnotationCCode(displayValue: string, value: string) {
  switch (value) {
    case "PLS":
      return getSpanElementNoCap(displayValue, "red");
    case "pELS":
      return getSpanElementNoCap(displayValue, "orange");
    case "dELS":
      return getSpanElementNoCap(displayValue, "yellow");
    case "DNase-H3K4me3":
      return getSpanElementNoCap(displayValue, "pink");
    case "CA-CTCF":
      return getSpanElementNoCap(displayValue, "blue");
    case "CA-H3K4me3":
      return getSpanElementNoCap(displayValue, "orange");
    case "CTCF-Bound":
      return getSpanElementNoCap(displayValue, "blue");
    case "CA-TF":
      return getSpanElementNoCap(displayValue, "purple");
    case "TF":
      return getSpanElementNoCap(displayValue, "pink");
    case "CA":
      return getSpanElementNoCap(displayValue, "green");
    default:
      return getSpanElement(displayValue, "amber");
  }
}

export function polyphenCCode(value: string) {
  switch (value) {
    case "probably damaging":
      return getSpanElement(value, "red");
    case "possibly damaging":
      return getSpanElement(value, "amber");
    case "benign":
      return getSpanElement(value, "green");
    case "unknown":
      return getSpanElement(value, "stone");
    default:
      return getSpanElement(value, "gray");
  }
}

export function alphamissenseCCODE(value: string) {
  // 'likely_benign','likely_pathogenic', or 'ambiguous'
  switch (value) {
    case "likely benign":
      return getSpanElement(value, "green");
    case "likely pathogenic":
      return getSpanElement(value, "red");
    case "ambiguous":
      return getSpanElement(value, "amber");
    default:
      return getSpanElement(value, "gray");
  }
}

const genecode_comp_exonic_category = new Map<string, string | undefined>([
  ["stopgain", "stone"],
  ["stoploss", "rose"],
  ["unknown", "indigo"],
  ["nonframeshift substitution", "lime"],
  ["synonymous SNV", "emerald"],
  ["nonframeshift insertion", "teal"],
  ["frameshift substitution", "yellow"],
  ["frameshift deletion", "sky"],
  ["frameshift insertion", "orange"],
  ["nonframeshift deletion", "cyan"],
  ["nonsynonymous SNV", "amber"],
]);

export function genecodeCompExonicCategoryCCode(value: string) {
  switch (true) {
    case /^stopgain$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("stopgain"),
      );
    case /^stoploss$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("stoploss"),
      );
    case /^unknown$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("unknown"),
      );
    case /^nonframeshift substitution$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("nonframeshift substitution"),
      );
    case /^synonymous SNV$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("synonymous SNV"),
      );
    case /^nonframeshift insertion$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("nonframeshift insertion"),
      );
    case /^frameshift substitution$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("frameshift substitution"),
      );
    case /^frameshift deletion$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("frameshift deletion"),
      );
    case /^frameshift insertion$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("frameshift insertion"),
      );
    case /^nonframeshift deletion$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("nonframeshift deletion"),
      );
    case /^nonsynonymous SNV$/.test(value):
      return getSpanElement(
        value,
        genecode_comp_exonic_category.get("nonsynonymous SNV"),
      );
    default:
      return getSpanElement(value, "red");
  }
}

export function alleleOriginCCode(value: string | number | undefined) {
  switch (value) {
    case "unknown":
      return getSpanElement(value, "stone");
    case "germline":
      return getSpanElement(value, "green");
    case "somatic":
      return getSpanElement(value, "indigo");
    case "inherited":
      return getSpanElement(value, "lime");
    case "paternal":
      return getSpanElement(value, "teal");
    case "maternal":
      return getSpanElement(value, "cyan");
    case "de-novo":
      return getSpanElement(value, "yellow");
    case "biparental":
      return getSpanElement(value, "sky");
    case "uniparental":
      return getSpanElement(value, "orange");
    case "not-tested":
      return getSpanElement(value, "amber");
    case "tested-inconclusive":
      return getSpanElement(value, "rose");
  }
}

export function metasvmPredCCode(value: string) {
  switch (value) {
    case "T":
      return getSpanElement("Tolerated", "green");
    case "D":
      return getSpanElement("Deleterious", "red");
    default:
      return getSpanElement(value, "red");
  }
}

export function cageEnhancerCCode(value: string | number | undefined) {
  if (value !== "") {
    return getSpanElement("Yes", "green");
  } else {
    return getSpanElement("No", "red");
  }
}

export function cagePromoterCCode(value: string | number | undefined) {
  if (value !== "") {
    return getSpanElement("Yes", "green");
  } else {
    return getSpanElement("No", "red");
  }
}


export function epigeneticsCCode(value: string) {
  switch (value) {
    case "Active":
      return getSpanElement(value, "green");
    case "Repressed":
      return getSpanElement(value, "amber");
    case "Transcription":
      return getSpanElement(value, "indigo");
    default:
      return <span>{value}</span>;
  }
}

function getSpanElement(value: string, color: string | undefined) {
  const colors = colorVariants[color as keyof typeof colorVariants];

  return (
    <div
      className={`inline-flex rounded-full px-3 py-1 text-center text-label-md font-medium capitalize leading-5 ${colors}`}
    >
      {value === "unknown" ? "N/A" : value}
    </div>
  );
}

function getSpanElementNoCap(value: string, color: string | undefined) {
  const colors = colorVariants[color as keyof typeof colorVariants];

  return (
    <div
      className={`inline-flex rounded-full px-3 py-1 text-center text-label-md font-medium leading-5 ${colors}`}
    >
      {value}
    </div>
  );
}

const stateFullNameVariant: Record<string, keyof typeof colorVariants> = {
  "TssA (Active TSS)": "red",
  "PromU (Promoter Upstream TSS)": "amber",
  "PromD1 (Promoter Downstream TSS with Dnase)": "amber",
  "PromD2 (Promoter Downstream TSS)": "amber",
  "Tx5' (Transcription 5')": "green",
  "Tx (Transcription)": "green",
  "Tx3' (Transcription 3')": "green",
  "TxWk (Transcription Weak)": "green",
  "TxReg (Transcription Regulatory)": "lime",
  "TxEnh5' (Transcription Enhancer 5')": "lime",
  "TxEnh3' (Transcription Enhancer 3')": "lime",
  "TxEnhW (Transcription Enhancer Weak)": "lime",
  "EnhA1 (Active Enhancer 1)": "orange",
  "EnhA2 (Active Enhancer 2)": "orange",
  "EnhAF (Active Enhancer Flanking)": "orange",
  "EnhW1 (Enhancer Weak 1)": "yellow",
  "EnhW2 (Enhancer Weak 2)": "yellow",
  "EnhAc (Enhancer Acetylation Only)": "yellow",
  "DNase (DNase Only)": "yellow",
  "ZNF/Rpts (ZNF Genes and Repeats)": "emerald",
  "Het (Heterochromatin)": "violet",
  "PromP (Poised Promoter)": "rose",
  "PromBiv (Bivalent Promoter)": "purple",
  "ReprPC (Repressed PolyComb)": "stone",
  "Quies (Quiescent/Low)": "stone",
};

export function stateFullNameCCode(value: string) {
  const variant = stateFullNameVariant[value] ?? "gray";
  return getSpanElement(value, variant);
}

export function filterValueCCode(value: string) {
  switch (value.toLowerCase()) {
    case "low":
      return getSpanElement(value, "red");
    case "sfs_bump":
      return getSpanElement(value, "amber");
    case "tfbs":
      return getSpanElement(value, "blue");
    default:
      return getSpanElement(value, "gray");
  }
}
