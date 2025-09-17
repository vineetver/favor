export const isTestEnvironment = process.env.NODE_ENV === "test";

export const AI_CONFIG = {
  maxTokens: 8192,
  temperature: 0.7,
  topP: 0.9,
} as const;

export const FAVOR_CONTEXT = {
  dbName: "FAVOR",
  totalVariants: "8,892,915,237",
  snvs: "8,812,917,339",
  indels: "79,997,898",
  description: "Functional Annotation of Variants Online Resource",
} as const;
