export const PATTERNS = {
  RSID: /^rs\d+$/i,

  VARIANT_VCF: /^(chr)?(\d{1,2}|X|Y|MT?)-\d+-[ATCG]+-[ATCG]+$/i,

  REGION: /^(chr)?(\d{1,2}|X|Y|MT?)-\d+-\d+$/i,

  GENE: /^[A-Z][A-Z0-9-]*$/i,

  CHROMOSOME: /^(chr)?(\d{1,2}|X|Y|MT?)$/i,

  CHR_PREFIX: /^chr/i,
} as const;

export const VALID_CHROMOSOMES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "X",
  "Y",
  "MT",
  "M",
] as const;

export const MAX_POSITION = 300_000_000;

export const MAX_REGION_SIZE = 10_000_000;
