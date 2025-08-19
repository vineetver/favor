export const GWAS_CONSTANTS = {
  GENOME_WIDE_SIGNIFICANCE_THRESHOLD: 7.3,
  P_VALUE_SIGNIFICANCE_THRESHOLD: 5e-8,
  Y_AXIS_CUTOFF_THRESHOLD: 80,
  Y_AXIS_MAX: 90,
  Y_AXIS_MIN: 0,
  TRIANGLE_STAGGER_MIN: 65,
  TRIANGLE_STAGGER_MAX: 88,
  DEFAULT_JITTER_AMOUNT: 0.4,
  DEFAULT_ITEMS_PER_PAGE: 25,
  CHART_ITEMS_PER_PAGE: 10,
  EFFECT_SIZE_RADIUS: {
    MIN: 4,
    MAX: 10,
    DEFAULT: 5,
    SCALE_FACTOR: 2,
  },
  COLORS: {
    GENOME_WIDE_SIGNIFICANT: "#ef4444",
    DEFAULT_POINT: "#8884d8",
  },
} as const;

export const CATEGORY_COLOR_MAP: Record<string, string> = {
  measurement: "#3b82f6",
  Cardiovascular: "#f94144",
  "clinical history": "#8b5cf6",
  Other: "#06b6d4",
  disposition: "#84cc16",
  quality: "#f59e0b",
  Neurological: "#10b981",
  Metabolic: "#f97316",
  "biological process": "#6366f1",
  Immune: "#577590",
} as const;

export const KEYWORD_PATTERNS = {
  measurement:
    /\b(measurement|height|weight|bmi|body mass index|waist|hip|circumference|lean body mass|fat mass|birth weight)\b/i,
  Cardiovascular:
    /\b(heart|cardio|artery|blood pressure|hypertension|coronary|myocardial|stroke|atrial fibrillation)\b/i,
  "clinical history":
    /\b(clinical history|medical history|family history|personal history|history of)\b/i,
  Metabolic:
    /\b(cholesterol|lipid|triglyceride|diabetes|glucose|insulin|metabolic|ldl|hdl)\b/i,
  disposition:
    /\b(disposition|behavior|personality|mood|temperament|psychiatric|depression|anxiety)\b/i,
  quality: /\b(quality|response|reaction|sensitivity|tolerance|preference)\b/i,
  Neurological:
    /\b(brain|alzheimer|cognitive|schizophrenia|neuro|parkinson|dementia|multiple sclerosis|epilepsy)\b/i,
  "biological process":
    /\b(biological process|cellular process|molecular function|gene expression|protein|enzyme)\b/i,
  Immune:
    /\b(immune|t cell|b cell|infection|autoimmune|inflammatory|allergy|asthma)\b/i,
} as const;

export const EXTERNAL_LINKS = {
  NCBI_SNP: "https://www.ncbi.nlm.nih.gov/snp/",
  PUBMED: "https://pubmed.ncbi.nlm.nih.gov/",
} as const;
