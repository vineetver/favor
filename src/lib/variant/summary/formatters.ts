import type { Variant } from '@/lib/variant/types';
import { shouldIncludeField, getItemsByActivity } from './threshold-lookup';

/**
 * Format basic variant information
 */
export function formatBasicInfo(variant: Variant): string[] {
  const lines: string[] = [];

  // TOPMed QC Status
  if (variant.filter_status) {
    lines.push(`  Filter Status: ${variant.filter_status}`);
  }

  // 1000 Genomes All AF
  if (variant.tg_all !== null && variant.tg_all !== undefined) {
    lines.push(`  1000 Genomes AF: ${variant.tg_all}`);
  }

  return lines;
}

/**
 * Format protein function predictions with threshold filtering
 */
export function formatProteinFunctionScores(
  variant: Variant,
  gnomadGenome?: any
): string[] {
  const lines: string[] = [];

  // CADD Phred (threshold >= 10)
  if (shouldIncludeField('cadd_phred', variant.cadd_phred)) {
    lines.push(`  CADD Phred: ${variant.cadd_phred} (CADD, >10 = deleterious, >20 = highly deleterious)`);
  }

  // REVEL (threshold >= 0.5) - from gnomAD
  if (gnomadGenome?.revel_max && shouldIncludeField('revel_max', gnomadGenome.revel_max)) {
    lines.push(`  REVEL: ${gnomadGenome.revel_max} (gnomAD v4, >0.5 = pathogenic, >0.75 = highly pathogenic)`);
  }

  // MetaSVM - special case: T means Tolerated, we skip it (categorical field, no threshold)
  if (variant.metasvm_pred && variant.metasvm_pred !== 'T') {
    lines.push(`  MetaSVM: ${variant.metasvm_pred} (dbNSFP)`);
  }

  // PolyPhen-2 (threshold >= 0.8 for polyphen_val)
  if (variant.polyphen_cat && shouldIncludeField('polyphen_val', variant.polyphen_val)) {
    lines.push(`  PolyPhen-2: ${variant.polyphen_cat} (${variant.polyphen_val}, dbNSFP, >0.8 = damaging)`);
  }

  // PolyPhen-2 HumDiv (threshold >= 0.8)
  if (shouldIncludeField('polyphen2_hdiv_score', variant.polyphen2_hdiv_score)) {
    lines.push(`  PolyPhen-2 HumDiv: ${variant.polyphen2_hdiv_score} (dbNSFP, >0.8 = damaging)`);
  }

  // PolyPhen-2 HumVar (threshold >= 0.8)
  if (shouldIncludeField('polyphen2_hvar_score', variant.polyphen2_hvar_score)) {
    lines.push(`  PolyPhen-2 HumVar: ${variant.polyphen2_hvar_score} (dbNSFP, >0.8 = damaging)`);
  }

  // SIFT (threshold 0.0 - 0.05 for sift_val)
  if (variant.sift_cat && shouldIncludeField('sift_val', variant.sift_val)) {
    lines.push(`  SIFT: ${variant.sift_cat} (${variant.sift_val}, dbNSFP, ≤0.05 = deleterious)`);
  }

  // MutationTaster (threshold >= 0.8)
  if (shouldIncludeField('mutation_taster_score', variant.mutation_taster_score)) {
    lines.push(`  MutationTaster: ${variant.mutation_taster_score} (dbNSFP, >0.8 = disease causing)`);
  }

  // MutationAssessor (threshold >= 3)
  if (shouldIncludeField('mutation_assessor_score', variant.mutation_assessor_score)) {
    lines.push(`  MutationAssessor: ${variant.mutation_assessor_score} (dbNSFP, >3 = high functional impact)`);
  }

  // Grantham (threshold >= 0.8)
  if (shouldIncludeField('grantham', variant.grantham)) {
    lines.push(`  Grantham: ${variant.grantham} (dbNSFP, >0.8 = large physicochemical difference)`);
  }

  return lines;
}

/**
 * Format conservation scores with threshold filtering
 */
export function formatConservationScores(variant: Variant): string[] {
  const lines: string[] = [];

  // mamPhyloP (threshold > 3)
  if (shouldIncludeField('mamphylop', variant.mamphylop)) {
    lines.push(`  PhyloP (100-way): ${variant.mamphylop} (dbNSFP, >2 = highly conserved, <-2 = fast evolving)`);
  }

  // Primate phyloP (threshold > 0.3)
  if (shouldIncludeField('priphylop', variant.priphylop)) {
    lines.push(`  PhyloP (Primate): ${variant.priphylop} (dbNSFP, >0.3 = conserved)`);
  }

  // Vertebrate phyloP (threshold > 8)
  if (shouldIncludeField('verphylop', variant.verphylop)) {
    lines.push(`  PhyloP (Vertebrate): ${variant.verphylop} (dbNSFP, >8 = conserved)`);
  }

  // mamPhastCons (threshold > 0.8)
  if (shouldIncludeField('mamphcons', variant.mamphcons)) {
    lines.push(`  PhastCons (Mammalian): ${variant.mamphcons} (dbNSFP, >0.8 = conserved)`);
  }

  // Primate phastCons (threshold > 0.8)
  if (shouldIncludeField('priphcons', variant.priphcons)) {
    lines.push(`  PhastCons (Primate): ${variant.priphcons} (dbNSFP, >0.8 = conserved)`);
  }

  // Vertebrate phastCons (threshold > 0.8)
  if (shouldIncludeField('verphcons', variant.verphcons)) {
    lines.push(`  PhastCons (Vertebrate): ${variant.verphcons} (dbNSFP, >0.8 = conserved)`);
  }

  // GERP++ RS (threshold > 10)
  if (shouldIncludeField('gerp_s', variant.gerp_s)) {
    lines.push(`  GERP++ RS: ${variant.gerp_s} (dbNSFP, >2 = constrained, >4 = highly constrained)`);
  }

  // GERP++ N (threshold > 10)
  if (shouldIncludeField('gerp_n', variant.gerp_n)) {
    lines.push(`  GERP++ N: ${variant.gerp_n} (dbNSFP, >10 = neutral evolution)`);
  }

  return lines;
}

/**
 * Format splicing predictions with threshold filtering
 */
export function formatSplicingScores(gnomadGenome?: any): { lines: string[], hasSignificant: boolean } {
  const lines: string[] = [];
  let hasSignificant = false;

  if (!gnomadGenome) {
    return { lines, hasSignificant };
  }

  // SpliceAI (threshold >= 0.2)
  if (shouldIncludeField('spliceai_ds_max', gnomadGenome.spliceai_ds_max)) {
    hasSignificant = true;
    lines.push(`  SpliceAI ΔScore: ${gnomadGenome.spliceai_ds_max} (gnomAD v4, >0.2 = likely affects splicing, >0.5 = high confidence, >0.8 = very high confidence)`);
  }

  // Pangolin (threshold >= 0.2)
  if (shouldIncludeField('pangolin_largest_ds', gnomadGenome.pangolin_largest_ds)) {
    hasSignificant = true;
    lines.push(`  Pangolin ΔScore: ${gnomadGenome.pangolin_largest_ds} (gnomAD v4)`);
  }

  return { lines, hasSignificant };
}

/**
 * Format integrative aPC scores with threshold filtering
 */
export function formatIntegrativeScores(variant: Variant): string[] {
  const lines: string[] = [];

  // All aPC scores have threshold >= 10
  if (shouldIncludeField('apc_protein_function_v3', variant.apc_protein_function_v3)) {
    lines.push(`  aPC-Protein Function: ${variant.apc_protein_function_v3}`);
  }

  if (shouldIncludeField('apc_conservation_v2', variant.apc_conservation_v2)) {
    lines.push(`  aPC-Conservation: ${variant.apc_conservation_v2}`);
  }

  if (shouldIncludeField('apc_epigenetics_active', variant.apc_epigenetics_active)) {
    lines.push(`  aPC-Epigenetics (active): ${variant.apc_epigenetics_active}`);
  }

  if (shouldIncludeField('apc_epigenetics_repressed', variant.apc_epigenetics_repressed)) {
    lines.push(`  aPC-Epigenetics (repressed): ${variant.apc_epigenetics_repressed}`);
  }

  if (shouldIncludeField('apc_epigenetics_transcription', variant.apc_epigenetics_transcription)) {
    lines.push(`  aPC-Epigenetics (transcription): ${variant.apc_epigenetics_transcription}`);
  }

  if (shouldIncludeField('apc_transcription_factor', variant.apc_transcription_factor)) {
    lines.push(`  aPC-Transcription Factor: ${variant.apc_transcription_factor}`);
  }

  if (shouldIncludeField('apc_local_nucleotide_diversity_v3', variant.apc_local_nucleotide_diversity_v3)) {
    lines.push(`  aPC-Local Nucleotide Diversity: ${variant.apc_local_nucleotide_diversity_v3}`);
  }

  if (shouldIncludeField('apc_mutation_density', variant.apc_mutation_density)) {
    lines.push(`  aPC-Mutation Density: ${variant.apc_mutation_density}`);
  }

  if (shouldIncludeField('apc_mappability', variant.apc_mappability)) {
    lines.push(`  aPC-Mappability: ${variant.apc_mappability}`);
  }

  // LINSIGHT (threshold >= 10)
  if (shouldIncludeField('linsight', variant.linsight)) {
    lines.push(`  LINSIGHT: ${variant.linsight}`);
  }

  return lines;
}

/**
 * Format mutation rate scores with threshold filtering
 */
export function formatMutationRateScores(variant: Variant): string[] {
  const lines: string[] = [];

  // Filter value (categorical quality assessment)
  if (variant.filter_value) {
    lines.push(`  Quality Filter: ${variant.filter_value}`);
  }

  // Pentanucleotide context
  if (variant.pn) {
    lines.push(`  Pentanucleotide Context: ${variant.pn}`);
  }

  // Mutation Rate (Roulette) - no threshold in JSON
  if (variant.mr !== null && variant.mr !== undefined) {
    lines.push(`  Mutation Rate (Roulette): ${variant.mr}`);
  }

  // Adjusted Rate - no threshold in JSON
  if (variant.ar !== null && variant.ar !== undefined) {
    lines.push(`  Adjusted Rate: ${variant.ar}`);
  }

  // gnomAD mutation rate - no threshold in JSON
  if (variant.mg !== null && variant.mg !== undefined) {
    lines.push(`  gnomAD Mutation Rate: ${variant.mg}`);
  }

  // Carlson mutation rate - no threshold in JSON
  if (variant.mc !== null && variant.mc !== undefined) {
    lines.push(`  Carlson Mutation Rate: ${variant.mc}`);
  }

  return lines;
}

/**
 * Format AlphaMissense scores with threshold filtering
 */
export function formatAlphaMissenseScores(variant: Variant): string[] {
  const lines: string[] = [];

  // Protein variant (amino acid change)
  if ((variant as any).protein_variant) {
    lines.push(`  Protein Variant: ${(variant as any).protein_variant}`);
  }

  // AlphaMissense pathogenicity score (threshold >= 0.564)
  if (shouldIncludeField('am_pathogenicity', (variant as any).am_pathogenicity)) {
    lines.push(`  AlphaMissense Pathogenicity: ${(variant as any).am_pathogenicity} (>0.564 = likely pathogenic)`);
  }

  // AlphaMissense classification
  if ((variant as any).am_class) {
    lines.push(`  AlphaMissense Class: ${(variant as any).am_class}`);
  }

  return lines;
}

/**
 * Format epigenetic marks with threshold filtering
 * Returns marks grouped by activity type
 */
export interface EpigeneticScores {
  active: string[];
  repressed: string[];
  transcription: string[];
  dnase: string | null;
}

export function formatEpigeneticMarks(variant: Variant): EpigeneticScores {
  const active: string[] = [];
  const repressed: string[] = [];
  const transcription: string[] = [];

  // DNase (threshold >= 0.437)
  const dnase = shouldIncludeField('encode_dnase_sum', variant.encode_dnase_sum)
    ? `${variant.encode_dnase_sum}`
    : null;

  // Active marks
  if (shouldIncludeField('encodeh3k27ac_sum', variant.encodeh3k27ac_sum)) {
    active.push(`H3K27ac=${variant.encodeh3k27ac_sum}`);
  }
  if (shouldIncludeField('encodeh3k4me1_sum', variant.encodeh3k4me1_sum)) {
    active.push(`H3K4me1=${variant.encodeh3k4me1_sum}`);
  }
  if (shouldIncludeField('encodeh3k4me2_sum', variant.encodeh3k4me2_sum)) {
    active.push(`H3K4me2=${variant.encodeh3k4me2_sum}`);
  }
  if (shouldIncludeField('encodeh3k4me3_sum', variant.encodeh3k4me3_sum)) {
    active.push(`H3K4me3=${variant.encodeh3k4me3_sum}`);
  }
  if (shouldIncludeField('encodeh3k9ac_sum', variant.encodeh3k9ac_sum)) {
    active.push(`H3K9ac=${variant.encodeh3k9ac_sum}`);
  }
  if (shouldIncludeField('encodeh4k20me1_sum', variant.encodeh4k20me1_sum)) {
    active.push(`H4K20me1=${variant.encodeh4k20me1_sum}`);
  }
  if (shouldIncludeField('encodeh2afz_sum', variant.encodeh2afz_sum)) {
    active.push(`H2AFZ=${variant.encodeh2afz_sum}`);
  }

  // Repressed marks
  if (shouldIncludeField('encodeh3k9me3_sum', variant.encodeh3k9me3_sum)) {
    repressed.push(`H3K9me3=${variant.encodeh3k9me3_sum}`);
  }
  if (shouldIncludeField('encodeh3k27me3_sum', variant.encodeh3k27me3_sum)) {
    repressed.push(`H3K27me3=${variant.encodeh3k27me3_sum}`);
  }

  // Transcription marks
  if (shouldIncludeField('encodeh3k36me3_sum', variant.encodeh3k36me3_sum)) {
    transcription.push(`H3K36me3=${variant.encodeh3k36me3_sum}`);
  }
  if (shouldIncludeField('encodeh3k79me2_sum', variant.encodeh3k79me2_sum)) {
    transcription.push(`H3K79me2=${variant.encodeh3k79me2_sum}`);
  }

  return { active, repressed, transcription, dnase };
}

/**
 * Format all epigenetic data into text sections
 */
export function formatEpigeneticsSection(variant: Variant): string[] {
  const sections: string[] = [];
  const marks = formatEpigeneticMarks(variant);

  // Group active marks
  if (marks.active.length > 0) {
    sections.push(`Active Chromatin Marks: ${marks.active.join(', ')} (ENCODE)`);
  }

  // Group repressed marks
  if (marks.repressed.length > 0) {
    sections.push(`Repressed Chromatin Marks: ${marks.repressed.join(', ')} (ENCODE)`);
  }

  // Group transcription marks
  if (marks.transcription.length > 0) {
    sections.push(`Transcription-Associated Marks: ${marks.transcription.join(', ')} (ENCODE)`);
  }

  // DNase
  if (marks.dnase !== null) {
    sections.push(`DNase Accessibility: ${marks.dnase} (ENCODE)`);
  }

  // Total RNA (threshold >= 0.1)
  if (shouldIncludeField('encodetotal_rna_sum', variant.encodetotal_rna_sum)) {
    sections.push(`Total RNA: ${variant.encodetotal_rna_sum} (ENCODE)`);
  }

  return sections;
}
