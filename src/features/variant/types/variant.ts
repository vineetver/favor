import type { GnomadData } from "./gnomad";

export interface Variant {
  vid: number;
  chromosome: string;
  position: number;
  variant_vcf: string;
  bravo?: Bravo | null;
  genecode?: Gencode | null;
  ucsc?: Ucsc | null;
  dbsnp?: Dbsnp | null;
  dbnsfp?: Dbnsfp | null;
  refseq?: Refseq | null;
  cage?: Cage | null;
  genehancer?: GeneHancer | null;
  super_enhancer?: SuperEnhancer | null;
  clinvar?: Clinvar | null;
  main?: Main | null;
  tg?: ThousandGenomes | null;
  mappability?: Mappability | null;
  gnomad_exome?: GnomadData | null;
  gnomad_genome?: GnomadData | null;
  mutation_rate?: MutationRate | null;
  funseq?: Funseq | null;
  aloft?: Aloft | null;
  alphamissense?: AlphaMissense | null;
  ccre?: Ccre | null;
  apc?: Apc | null;
  cosmic?: Cosmic | null;
  pgboost?: PgBoost[] | null;
  linsight?: number | null;
  fathmm_xf?: number | null;
  recombination_rate?: number | null;
  nucdiv?: number | null;
}

export interface VariantWithIncludes extends Variant {
  gwas?: unknown[] | null;
}

// Ambiguous rsID candidate is a full variant object
export type AmbiguousVariantCandidate = Variant;

export interface AmbiguousVariantResponse {
  ambiguous: true;
  rsid?: string;
  variant?: string;
  candidates: AmbiguousVariantCandidate[];
}

export type VariantSingleResponse = Variant | AmbiguousVariantResponse;

export interface Bravo {
  bravo_ac?: number | null;
  bravo_af?: number | null;
  bravo_an?: number | null;
  filter_status?: string | null;
}

export interface ThousandGenomes {
  tg_afr?: number | null;
  tg_all?: number | null;
  tg_amr?: number | null;
  tg_eas?: number | null;
  tg_eur?: number | null;
  tg_sas?: number | null;
}

export interface Dbsnp {
  rsid?: string | null;
  rsid_all?: Array<string | null>;
}

export interface Dbnsfp {
  metasvm_pred?: string | null;
  mutation_assessor?: number | null;
  mutation_taster?: number | null;
  polyphen2_hdiv?: number | null;
  polyphen2_hvar?: number | null;
}

export interface Gencode {
  consequence?: string | null;
  genes?: Array<string | null>;
  region_type?: string | null;
  transcripts?: Transcript[];
}

export interface Transcript {
  gene?: string | null;
  hgvsc?: string | null;
  hgvsp?: string | null;
  location?: string | null;
  transcript_id?: string | null;
}

export interface Refseq {
  consequence?: string | null;
  exonic_details?: ExonicDetail[];
  region_type?: string | null;
  transcripts?: Array<string | null>;
}

export interface ExonicDetail {
  gene?: string | null;
  hgvsc?: string | null;
  hgvsp?: string | null;
  location?: string | null;
  transcript_id?: string | null;
}

export interface Ucsc {
  consequence?: string | null;
  exonic_details?: UcscTranscript[];
  region_type?: string | null;
  transcripts?: Array<string | null>;
}

export interface UcscTranscript {
  hgvsc?: string | null;
  hgvsp?: string | null;
  location?: string | null;
  transcript_id?: string | null;
}

export interface Cage {
  cage_enhancer?: string | null;
  cage_promoter?: string | null;
  cage_tc?: string | null;
}

export interface GeneHancer {
  feature_score?: number | null;
  id?: string | null;
  targets?: GeneHancerTarget[];
}

export interface GeneHancerTarget {
  gene?: string | null;
  score?: number | null;
}

export interface SuperEnhancer {
  ids?: Array<string | null>;
}

export interface Clinvar {
  clndisdb?: ClinvarDisDb[];
  clndisdbincl?: ClinvarDisDb[];
  clndn?: Array<string | null>;
  clndnincl?: Array<string | null>;
  clnrevstat?: string | null;
  clnsig?: Array<string | null>;
  clnsigincl?: ClinvarSigIncl[];
  gene?: string | null;
  geneinfo?: ClinvarGeneInfo[];
  origin?: number | null;
  origin_decoded?: Array<string | null>;
}

export interface ClinvarDisDb {
  db?: string | null;
  id?: string | null;
}

export interface ClinvarSigIncl {
  classification?: string | null;
  variation_id?: string | null;
}

export interface ClinvarGeneInfo {
  id?: string | null;
  symbol?: string | null;
}

export interface Main {
  cadd?: Cadd | null;
  chromhmm?: ChromHmm | null;
  conservation?: Conservation | null;
  distance?: Distance | null;
  encode?: Encode | null;
  gerp?: Gerp | null;
  protein_predictions?: ProteinPredictions | null;
  remap?: Remap | null;
  sequence_context?: SequenceContext | null;
  variant_density?: VariantDensity | null;
}

export interface Cadd {
  phred?: number | null;
  raw?: number | null;
}

export interface ChromHmm {
  e1?: number | null;
  e2?: number | null;
  e3?: number | null;
  e4?: number | null;
  e5?: number | null;
  e6?: number | null;
  e7?: number | null;
  e8?: number | null;
  e9?: number | null;
  e10?: number | null;
  e11?: number | null;
  e12?: number | null;
  e13?: number | null;
  e14?: number | null;
  e15?: number | null;
  e16?: number | null;
  e17?: number | null;
  e18?: number | null;
  e19?: number | null;
  e20?: number | null;
  e21?: number | null;
  e22?: number | null;
  e23?: number | null;
  e24?: number | null;
  e25?: number | null;
}

export interface Conservation {
  bstatistic?: number | null;
  mamphcons?: number | null;
  mamphylop?: number | null;
  priphcons?: number | null;
  priphylop?: number | null;
  verphcons?: number | null;
  verphylop?: number | null;
}

export interface Distance {
  min_dist_tse?: number | null;
  min_dist_tss?: number | null;
}

export interface EncodeValue {
  phred?: number | null;
  raw?: number | null;
}

export interface Encode {
  dnase?: EncodeValue | null;
  h2afz?: EncodeValue | null;
  h3k27ac?: EncodeValue | null;
  h3k27me3?: EncodeValue | null;
  h3k36me3?: EncodeValue | null;
  h3k4me1?: EncodeValue | null;
  h3k4me2?: EncodeValue | null;
  h3k4me3?: EncodeValue | null;
  h3k79me2?: EncodeValue | null;
  h3k9ac?: EncodeValue | null;
  h3k9me3?: EncodeValue | null;
  h4k20me1?: EncodeValue | null;
  total_rna?: EncodeValue | null;
}

export interface Gerp {
  n?: number | null;
  rs?: number | null;
  rs_pval?: number | null;
  s?: number | null;
}

export interface ProteinPredictions {
  grantham?: number | null;
  polyphen_cat?: string | null;
  polyphen_val?: number | null;
  sift_cat?: string | null;
  sift_val?: number | null;
}

export interface Remap {
  overlap_cl?: number | null;
  overlap_tf?: number | null;
}

export interface SequenceContext {
  cpg?: number | null;
  gc?: number | null;
}

export interface VariantDensity {
  freq_10000bp?: number | null;
  freq_1000bp?: number | null;
  freq_100bp?: number | null;
  rare_10000bp?: number | null;
  rare_1000bp?: number | null;
  rare_100bp?: number | null;
  sngl_10000bp?: number | null;
  sngl_1000bp?: number | null;
  sngl_100bp?: number | null;
}

export interface Mappability {
  k24?: MappabilityValue | null;
  k36?: MappabilityValue | null;
  k50?: MappabilityValue | null;
  k100?: MappabilityValue | null;
}

export interface MappabilityValue {
  bismap?: number | null;
  umap?: number | null;
}

export interface Apc {
  conservation?: number | null;
  conservation_v2?: number | null;
  epigenetics?: number | null;
  epigenetics_active?: number | null;
  epigenetics_repressed?: number | null;
  epigenetics_transcription?: number | null;
  local_nucleotide_diversity?: number | null;
  local_nucleotide_diversity_v2?: number | null;
  local_nucleotide_diversity_v3?: number | null;
  mappability?: number | null;
  micro_rna?: number | null;
  mutation_density?: number | null;
  protein_function?: number | null;
  protein_function_v2?: number | null;
  protein_function_v3?: number | null;
  proximity_to_coding?: number | null;
  proximity_to_coding_v2?: number | null;
  proximity_to_tsstes?: number | null;
  transcription_factor?: number | null;
}

export interface MutationRate {
  ar?: number | null;
  mc?: number | null;
  mg?: number | null;
  mr?: number | null;
}

export interface Funseq {
  description?: string | null;
  score?: number | null;
}

export interface Aloft {
  description?: string | null;
  score?: number | null;
}

export interface AlphaMissense {
  max_pathogenicity?: number | null;
  predictions?: AlphaMissensePrediction[];
}

export interface AlphaMissensePrediction {
  class?: string | null;
  pathogenicity?: number | null;
  protein_variant?: string | null;
  transcript_id?: string | null;
  uniprot_id?: string | null;
}

export interface Ccre {
  accessions?: string | null;
  annotations?: string | null;
  count?: number | null;
  ids?: string | null;
}

export interface Cosmic {
  aa?: string | null;
  cds?: string | null;
  gene?: string | null;
  hgvsc?: string | null;
  hgvsp?: string | null;
  hgvsg?: string | null;
  is_canonical?: string | null;
  sample_count?: number | null;
  so_term?: string | null;
  tier?: string | null;
  transcript?: string | null;
}

export interface PgBoost {
  gene?: string | null;
  percentile?: number | null;
  score?: number | null;
}
