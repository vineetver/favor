import { myProvider } from "@/lib/ai";
import { streamText } from "ai";
import type { Variant } from "@/lib/variant/types";
import { fetchVariant } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";
import { getCCREByVCF } from "@/lib/variant/ccre/api";
import { fetchCV2F } from "@/lib/variant/cv2f/api";
import { fetchPGBoost } from "@/lib/variant/pgboost/api";
import { fetchScentTissueByVCF } from "@/lib/variant/scent/api";
import { fetchEQTL } from "@/lib/variant/eqtl/api";
import { fetchGWAS } from "@/lib/variant/gwas/api";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import {
  formatProteinFunctionScores,
  formatConservationScores,
  formatSplicingScores,
  formatIntegrativeScores,
  formatEpigeneticsSection,
  formatMutationRateScores,
  formatAlphaMissenseScores,
  formatBasicInfo,
  formatEpigeneticMarks,
} from "@/lib/variant/summary/formatters";
import { shouldIncludeField } from "@/lib/variant/summary/threshold-lookup";

export const maxDuration = 300;

// Type definition for all variant data sources
export type VariantContext = {
  variant: Variant;
  gnomadExome: any | null;
  gnomadGenome: any | null;
  ccreData: any[] | null;
  cv2fData: any | null;
  pgboostData: any | null;
  scentData: any[] | null;
  eqtlData: any[] | null;
  gwasData: any[] | null;
};

// Aggregation helper functions
function aggregateEQTLData(eqtlData: any[]) {
  if (!eqtlData || eqtlData.length === 0) return null;

  // Filter out null/undefined entries and entries without required fields
  const validData = eqtlData.filter((e) => e && e.gene_name && e.tissue && e.p_value !== undefined);

  if (validData.length === 0) return null;

  const uniqueGenes = new Set(validData.map((e) => e.gene_name));
  const uniqueTissues = new Set(validData.map((e) => e.tissue));

  // Group by gene, get strongest association per gene
  const geneMap = new Map<string, any[]>();
  validData.forEach((e) => {
    if (!geneMap.has(e.gene_name)) {
      geneMap.set(e.gene_name, []);
    }
    geneMap.get(e.gene_name)!.push(e);
  });

  // Get top 5 genes by strongest p-value
  const topGenes = Array.from(geneMap.entries())
    .map(([gene, associations]) => {
      const strongest = associations.sort((a, b) => {
        const aP = parseFloat(String(a.p_value || Infinity));
        const bP = parseFloat(String(b.p_value || Infinity));
        return aP - bP;
      })[0];
      return { gene, ...strongest };
    })
    .sort((a, b) => {
      const aP = parseFloat(String(a.p_value || Infinity));
      const bP = parseFloat(String(b.p_value || Infinity));
      return aP - bP;
    })
    .slice(0, 5);

  // Count tissue distribution
  const tissueCount = new Map<string, number>();
  validData.forEach((e) => {
    tissueCount.set(e.tissue, (tissueCount.get(e.tissue) || 0) + 1);
  });
  const topTissues = Array.from(tissueCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tissue]) => tissue);

  return {
    totalGenes: uniqueGenes.size,
    totalTissues: uniqueTissues.size,
    totalAssociations: validData.length,
    topGenes,
    topTissues,
  };
}

function aggregateGWASData(gwasData: any[]) {
  if (!gwasData || gwasData.length === 0) return null;

  // Filter out null/undefined entries and entries without required fields
  const validData = gwasData.filter((g) => g && g.gwas_disease_trait && g.gwas_p_value_mlog);

  if (validData.length === 0) return null;

  // Group by trait and keep only the strongest association per trait
  const traitMap = new Map<string, any>();
  validData.forEach((g) => {
    const trait = g.gwas_disease_trait;
    const pValue = parseFloat(String(g.gwas_p_value_mlog || 0));

    if (!traitMap.has(trait) || pValue > parseFloat(String(traitMap.get(trait).gwas_p_value_mlog || 0))) {
      // Remove efo_hierarchy and keep only essential fields
      const { efo_hierarchy, ...essentialFields } = g;
      traitMap.set(trait, essentialFields);
    }
  });

  // Get top 10 most significant unique traits
  const topAssociations = Array.from(traitMap.values())
    .sort((a, b) => {
      const pA = parseFloat(String(a.gwas_p_value_mlog || 0));
      const pB = parseFloat(String(b.gwas_p_value_mlog || 0));
      return pB - pA; // Higher -log10 p-value = stronger association
    })
    .slice(0, 10);

  return {
    totalAssociations: validData.length,
    uniqueTraits: traitMap.size,
    topAssociations,
  };
}

function aggregateSCENTData(scentData: any[]) {
  if (!scentData || scentData.length === 0) return null;

  const uniqueGenes = new Set(scentData.filter((s) => s.gene).map((s) => s.gene));
  const uniqueTissues = new Set(scentData.filter((s) => s.tissue).map((s) => s.tissue));

  // Group by gene
  const geneMap = new Map<string, Set<string>>();
  scentData.forEach((s) => {
    if (s.gene && s.tissue) {
      if (!geneMap.has(s.gene)) {
        geneMap.set(s.gene, new Set());
      }
      geneMap.get(s.gene)!.add(s.tissue);
    }
  });

  // Get top genes by tissue count
  const topGenes = Array.from(geneMap.entries())
    .map(([gene, tissues]) => ({ gene, tissueCount: tissues.size, tissues: Array.from(tissues) }))
    .sort((a, b) => b.tissueCount - a.tissueCount)
    .slice(0, 5);

  return {
    totalGenes: uniqueGenes.size,
    totalTissues: uniqueTissues.size,
    totalLinks: scentData.length,
    topGenes,
  };
}

function aggregatePGBoostData(pgboostData: any) {
  // Validate input is an array
  if (!pgboostData || !Array.isArray(pgboostData) || pgboostData.length === 0) {
    return null;
  }

  // Filter out null/undefined entries and entries without required fields
  const validData = pgboostData.filter((pg) => {
    try {
      return (
        pg &&
        typeof pg === 'object' &&
        pg.gene &&
        pg.pg_boost !== null &&
        pg.pg_boost !== undefined &&
        pg.pg_boost_percentile !== null &&
        pg.pg_boost_percentile !== undefined
      );
    } catch (e) {
      return false;
    }
  });

  if (validData.length === 0) return null;

  // Sort by percentile (defensive against null values)
  const sorted = [...validData].sort((a, b) => {
    try {
      const aPercentile = parseFloat(String(a.pg_boost_percentile || 0));
      const bPercentile = parseFloat(String(b.pg_boost_percentile || 0));
      return bPercentile - aPercentile;
    } catch (e) {
      return 0;
    }
  });

  // Filter for high-confidence connections (90th percentile or higher)
  const highConfidence = sorted.filter((pg) => {
    try {
      const percentile = parseFloat(String(pg.pg_boost_percentile));
      return !isNaN(percentile) && percentile >= 90;
    } catch (e) {
      return false;
    }
  });

  // Take top 5 (either high-confidence or overall top)
  let topConnections = highConfidence.length >= 3
    ? highConfidence.slice(0, 5)
    : sorted.slice(0, 5);

  // Final safety filter - ensure no nulls slipped through
  topConnections = topConnections.filter((pg) => {
    try {
      return pg && pg.gene && pg.pg_boost_percentile !== null && pg.pg_boost_percentile !== undefined;
    } catch (e) {
      return false;
    }
  });

  return {
    totalConnections: validData.length,
    highConfidenceCount: highConfidence.length,
    topConnections,
  };
}

function aggregateCCREData(ccreData: any[]) {
  if (!ccreData || ccreData.length === 0) return null;

  // Filter out null/undefined entries and entries without annotations
  const validData = ccreData.filter((c) => c && c.annotations);

  if (validData.length === 0) return null;

  // Group by regulatory element type
  const typeCount = new Map<string, number>();
  validData.forEach((c) => {
    typeCount.set(c.annotations, (typeCount.get(c.annotations) || 0) + 1);
  });

  const types = Array.from(typeCount.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalElements: validData.length,
    types,
  };
}

/**
 * Pure data collection function - fetches all variant data sources
 */
async function collectVariantContext(vcf: string): Promise<VariantContext> {
  const variant = await fetchVariant(vcf);

  if (!variant) {
    throw new Error("Variant not found");
  }

  const [gnomadExome, gnomadGenome, ccreData, cv2fData, pgboostData, scentData, eqtlData, gwasData] = await Promise.all([
    fetchGnomadExome(vcf).catch(err => {
      console.error(`Failed to fetch gnomAD exome for ${vcf}:`, err);
      return null;
    }),
    fetchGnomadGenome(vcf).catch(err => {
      console.error(`Failed to fetch gnomAD genome for ${vcf}:`, err);
      return null;
    }),
    getCCREByVCF(vcf, 0).catch(err => {
      console.error(`Failed to fetch CCRE for ${vcf}:`, err);
      return null;
    }),
    variant.rsid && variant.rsid !== "NA"
      ? fetchCV2F(variant.rsid).catch(err => {
          console.error(`Failed to fetch CV2F for ${variant.rsid}:`, err);
          return null;
        })
      : Promise.resolve(null),
    variant.rsid && variant.rsid !== "NA"
      ? fetchPGBoost(variant.rsid).catch(err => {
          console.error(`Failed to fetch PGBoost for ${variant.rsid}:`, err);
          return null;
        })
      : Promise.resolve(null),
    fetchScentTissueByVCF(vcf, 0).catch(err => {
      console.error(`Failed to fetch SCENT for ${vcf}:`, err);
      return null;
    }),
    fetchEQTL(vcf).catch(err => {
      console.error(`Failed to fetch eQTL for ${vcf}:`, err);
      return null;
    }),
    fetchGWAS(vcf).catch(err => {
      console.error(`Failed to fetch GWAS for ${vcf}:`, err);
      return null;
    }),
  ]);

  return {
    variant,
    gnomadExome,
    gnomadGenome,
    ccreData,
    cv2fData,
    pgboostData,
    scentData,
    eqtlData,
    gwasData,
  };
}

/**
 * Build structured JSON object from variant context matching extraction JSON structure
 */
function buildVariantJSON(ctx: VariantContext): any {
  const { variant, gnomadExome, gnomadGenome, ccreData, cv2fData, pgboostData, scentData, eqtlData, gwasData } = ctx;

  const categories: any = {};

  // Basic Category
  const basic: any[] = [];
  basic.push({
    field: "Variant",
    value: variant.variant_vcf,
    tooltip: "The unique identifier of the given variant, Reported as chr-pos-ref-alt format."
  });
  if (variant.rsid && variant.rsid !== "NA") {
    basic.push({
      field: "rsID",
      value: variant.rsid,
      tooltip: "The rsID of the given variant (if exists)."
    });
  }
  if (variant.filter_status) {
    basic.push({
      field: "TOPMed QC Status",
      value: variant.filter_status,
      tooltip: "TOPMed QC status of the given variant."
    });
  }
  if (variant.bravo_an !== null) {
    basic.push({
      field: "TOPMed Bravo AN",
      value: variant.bravo_an,
      tooltip: "TOPMed Bravo Genome Allele Number. (NHLBI TOPMed Consortium, 2018; Taliun et al., 2019)"
    });
  }
  if (variant.bravo_af !== null) {
    basic.push({
      field: "TOPMed Bravo AF",
      value: variant.bravo_af,
      tooltip: "TOPMed Bravo Genome Allele Frequency. (NHLBI TOPMed Consortium, 2018; Taliun et al., 2019)"
    });
  }
  if (variant.af_total !== null) {
    basic.push({
      field: "Total GNOMAD AF",
      value: variant.af_total,
      tooltip: "GNOMAD v3 Genome Allele Frequency using all the samples. (GNOMAD Consortium, 2019; Karczewski et al., 2020)"
    });
  }
  if (variant.tg_all !== null) {
    basic.push({
      field: "All 1000 Genomes AF",
      value: variant.tg_all,
      tooltip: "1000 Genome Allele Frequency (Whole genome allele frequencies from the 1000 Genomes Project phase 3 data)."
    });
  }
  if (basic.length > 0) categories.Basic = { label: "Basic Information", items: basic };

  // Category section
  const category: any[] = [];
  if (variant.genecode_comprehensive_info) {
    category.push({
      field: "Genecode Comprehensive Info",
      value: variant.genecode_comprehensive_info,
      tooltip: "Identify whether variants cause protein coding changes using Gencode genes definition systems, it will label the gene name of the variants has impact, if it is intergenic region, the nearby gene name will be labeled in the annotation. (Frankish et al., 2018; Harrow et al., 2012)"
    });
  }
  if (variant.genecode_comprehensive_category) {
    category.push({
      field: "Genecode Comprehensive Category",
      value: variant.genecode_comprehensive_category,
      tooltip: "Identify whether variants cause protein coding changes using Gencode genes definition systems. Categories include: Exonic (within protein-coding regions), UTR (untranslated regions), Intronic (within gene introns), Downstream (downstream of genes), Upstream (upstream of genes), Intergenic (between genes), and Splicing (affecting splice sites). (Frankish et al., 2018; Harrow et al., 2012)"
    });
  }
  if (variant.genecode_comprehensive_exonic_category) {
    category.push({
      field: "Genecode Comprehensive Exonic Category",
      value: variant.genecode_comprehensive_exonic_category,
      tooltip: "Identify variants impact using Gencode exonic definition. Categories include: Stopgain (introduces stop codon), Stoploss (removes stop codon), Nonsynonymous SNV (changes amino acid), Synonymous SNV (doesn't change amino acid), Frameshift insertion/deletion/substitution, and Nonframeshift insertion/deletion/substitution. (Frankish et al., 2018; Harrow et al., 2012)"
    });
  }
  if (variant.metasvm_pred && variant.metasvm_pred !== 'T') {
    category.push({
      field: "MetaSVM Prediction",
      value: variant.metasvm_pred,
      tooltip: "Identify whether the variant is a disruptive missense variant, defined as 'disruptive' by the ensemble MetaSVM annotation. D (Deleterious): likely to affect protein function. T (Tolerated): unlikely to affect protein function. (Dong et al., 2014)"
    });
  }
  if (variant.cage_promoter) {
    category.push({
      field: "CAGE Promoter",
      value: variant.cage_promoter,
      tooltip: "CAGE defined promoter sites from Fantom 5. Yes: variant overlaps with CAGE promoter site. No: variant does not overlap with CAGE promoter site. (Forrest et al., 2014)"
    });
  }
  if (variant.cage_enhancer) {
    category.push({
      field: "CAGE Enhancer",
      value: variant.cage_enhancer,
      tooltip: "CAGE defined enhancer sites from Fantom 5. Yes: variant overlaps with CAGE enhancer site. No: variant does not overlap with CAGE enhancer site. (Forrest et al., 2014)"
    });
  }
  if (variant.genehancer) {
    category.push({
      field: "GeneHancer",
      value: variant.genehancer,
      tooltip: "Predicted human enhancer sites from the GeneHancer database. (Fishilevich et al., 2017)"
    });
  }
  if (variant.super_enhancer) {
    category.push({
      field: "Super Enhancer",
      value: variant.super_enhancer,
      tooltip: "Predicted super-enhancer sites and targets in a range of human cell types. (Hnisz et al., 2013)"
    });
  }
  if (category.length > 0) categories.Category = { label: "Genomic Context", items: category };

  // ClinVar
  const clinvar: any[] = [];
  if (variant.clnsig) {
    clinvar.push({
      field: "Clinical Significance",
      value: variant.clnsig,
      tooltip: "Clinical significance for this single variant. (Landrum et al., 2017, 2013)"
    });
  }
  if (variant.clndn) {
    clinvar.push({
      field: "Disease Name",
      value: variant.clndn,
      tooltip: "ClinVar's preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)"
    });
  }
  if (variant.clnrevstat) {
    clinvar.push({
      field: "Review Status",
      value: variant.clnrevstat,
      tooltip: "ClinVar review status for the Variation ID. (Landrum et al., 2017, 2013)"
    });
  }
  if (variant.origin) {
    clinvar.push({
      field: "Allele Origin",
      value: variant.origin,
      tooltip: "Allele origin. Values: 0-unknown; 1-germline; 2-somatic; 4-inherited; 8-paternal; 16-maternal; 32-de-novo; 64-biparental; 128-uniparental; 256-not-tested; 512-tested-inconclusive. (Landrum et al., 2017, 2013)"
    });
  }
  if (clinvar.length > 0) categories.Clinvar = { label: "Clinical Significance", items: clinvar };

  // Population / Ancestry-specific frequencies
  const population: any[] = [];
  const hasV4Ancestry = gnomadGenome && (gnomadGenome.af_afr || gnomadGenome.af_amr || gnomadGenome.af_eas || gnomadGenome.af_nfe || gnomadGenome.af_sas);
  const hasV3Ancestry = variant.af_afr !== null || variant.af_amr !== null || variant.af_eas !== null || variant.af_nfe !== null || variant.af_sas !== null;

  if (hasV4Ancestry) {
    if (gnomadGenome.af_afr) population.push({ field: "AFR (African)", value: gnomadGenome.af_afr, source: "gnomAD v4 Genome" });
    if (gnomadGenome.af_amr) population.push({ field: "AMR (Ad Mixed American)", value: gnomadGenome.af_amr, source: "gnomAD v4 Genome" });
    if (gnomadGenome.af_eas) population.push({ field: "EAS (East Asian)", value: gnomadGenome.af_eas, source: "gnomAD v4 Genome" });
    if (gnomadGenome.af_nfe) population.push({ field: "NFE (Non-Finnish European)", value: gnomadGenome.af_nfe, source: "gnomAD v4 Genome" });
    if (gnomadGenome.af_sas) population.push({ field: "SAS (South Asian)", value: gnomadGenome.af_sas, source: "gnomAD v4 Genome" });
  } else if (hasV3Ancestry) {
    if (variant.af_afr !== null) population.push({ field: "AFR (African)", value: variant.af_afr, source: "gnomAD v3" });
    if (variant.af_amr !== null) population.push({ field: "AMR (Ad Mixed American)", value: variant.af_amr, source: "gnomAD v3" });
    if (variant.af_eas !== null) population.push({ field: "EAS (East Asian)", value: variant.af_eas, source: "gnomAD v3" });
    if (variant.af_nfe !== null) population.push({ field: "NFE (Non-Finnish European)", value: variant.af_nfe, source: "gnomAD v3" });
    if (variant.af_sas !== null) population.push({ field: "SAS (South Asian)", value: variant.af_sas, source: "gnomAD v3" });
  }
  if (population.length > 0) {
    categories.Population = {
      label: "Population Genetics",
      interpretation: "Rare (MAF < 0.0001), Low Frequency (0.0001 ≤ MAF < 0.01), Common (MAF ≥ 0.01)",
      items: population
    };
  }

  // Conservation
  const conservation: any[] = [];
  if (shouldIncludeField('apc_conservation_v2', variant.apc_conservation_v2)) {
    conservation.push({
      field: "aPC-Conservation",
      value: variant.apc_conservation_v2,
      tooltip: "Conservation annotation PC: the first PC of the standardized scores of GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP in PHRED scale. Range: [0, 75.824]. Higher scores (>10) indicate more evolutionary conservation. (Li et al., 2020)"
    });
  }
  if (shouldIncludeField('mamphcons', variant.mamphcons)) {
    conservation.push({
      field: "mamPhCons",
      value: variant.mamphcons,
      tooltip: "Mammalian phastCons conservation score (excl. human). A higher score means the region is more conserved. Uses statistical models of nucleotide substitution. Range: [0, 1] (default: 0.0). Higher scores (>0.8) indicate stronger conservation. (Siepel et al., 2005)"
    });
  }
  if (shouldIncludeField('priphcons', variant.priphcons)) {
    conservation.push({
      field: "priPhCons",
      value: variant.priphcons,
      tooltip: "Primate phastCons conservation score (excl. human). Uses evolutionary models to identify conserved regions across multiple species. Range: [-10.761, 0.595] (default: -0.029). Higher positive scores (>0.3) indicate stronger conservation. (Pollard et al., 2010)"
    });
  }
  if (shouldIncludeField('verphcons', variant.verphcons)) {
    conservation.push({
      field: "verPhCons",
      value: variant.verphcons,
      tooltip: "Vertebrate phastCons conservation score (excl. human). Models evolutionary pressure across vertebrate species. Range: [-20, 11.295] (default: 0.042). Higher positive scores (>2) indicate stronger conservation. (Pollard et al., 2010)"
    });
  }
  if (shouldIncludeField('priphylop', variant.priphylop)) {
    conservation.push({
      field: "priPhyloP",
      value: variant.priphylop,
      tooltip: "Primate phyloP score (excl. human). Site-by-site conservation measuring evolutionary constraint at individual positions. Positive scores indicate conservation, negative scores indicate accelerated evolution. Range: [-10.761, 0.595] (default: -0.029). Higher scores (>0.3) indicate stronger conservation. (Pollard et al., 2010)"
    });
  }
  if (shouldIncludeField('mamphylop', variant.mamphylop)) {
    conservation.push({
      field: "mamPhyloP",
      value: variant.mamphylop,
      tooltip: "Mammalian phyloP score (excl. human). Per-site evolutionary constraint analysis across mammalian species. Range: [-20, 4.494] (default: -0.005). Higher positive scores (>3) indicate stronger conservation. (Pollard et al., 2010)"
    });
  }
  if (shouldIncludeField('verphylop', variant.verphylop)) {
    conservation.push({
      field: "verPhyloP",
      value: variant.verphylop,
      tooltip: "Vertebrate phyloP score (excl. human). Measures evolutionary constraint at individual positions across vertebrate species. Range: [-20, 11.295] (default: 0.042). Higher positive scores (>8) indicate stronger conservation. (Pollard et al., 2010)"
    });
  }
  if (shouldIncludeField('gerp_n', variant.gerp_n)) {
    conservation.push({
      field: "GerpN",
      value: variant.gerp_n,
      tooltip: "Neutral evolution score defined by GERP++. A higher score means the region is more conserved. Range: [0, 19.8] (default: 3.0). Higher scores (>10) indicate stronger conservation. (Davydov et al., 2010)"
    });
  }
  if (shouldIncludeField('gerp_s', variant.gerp_s)) {
    conservation.push({
      field: "GerpS",
      value: variant.gerp_s,
      tooltip: "Rejected Substitution score defined by GERP++. Quantifies substitution deficits representing purifying selection. Positive scores indicate evolutionary constraint, negative scores may indicate accelerated evolution. Range: [-39.5, 19.8] (default: -0.2). Higher positive scores (>10) indicate stronger conservation. (Davydov et al., 2010)"
    });
  }
  if (conservation.length > 0) categories.Conservation = { label: "Evolutionary Conservation", items: conservation };

  // Epigenetics - using formatters but extracting structured data
  const epigenetics: any[] = [];
  const epigeneticMarks = formatEpigeneticMarks(variant);

  // Add active marks
  epigeneticMarks.active.forEach(mark => epigenetics.push({ field: mark, activity: "Active" }));
  // Add repressed marks
  epigeneticMarks.repressed.forEach(mark => epigenetics.push({ field: mark, activity: "Repressed" }));
  // Add transcription marks
  epigeneticMarks.transcription.forEach(mark => epigenetics.push({ field: mark, activity: "Transcription" }));

  if (epigeneticMarks.dnase) {
    epigenetics.push({ field: `DNase Accessibility: ${epigeneticMarks.dnase}`, activity: "Active", source: "ENCODE" });
  }
  if (shouldIncludeField('encodetotal_rna_sum', variant.encodetotal_rna_sum)) {
    epigenetics.push({ field: "totalRNA", value: variant.encodetotal_rna_sum, activity: "Transcription", source: "ENCODE" });
  }
  if (epigenetics.length > 0) categories.Epigenetics = { label: "Epigenetic Marks", items: epigenetics };

  // Integrative scores
  const integrative: any[] = [];
  if (shouldIncludeField('apc_protein_function_v3', variant.apc_protein_function_v3)) {
    integrative.push({ field: "aPC-Protein Function", value: variant.apc_protein_function_v3 });
  }
  if (shouldIncludeField('apc_conservation_v2', variant.apc_conservation_v2)) {
    integrative.push({ field: "aPC-Conservation", value: variant.apc_conservation_v2 });
  }
  if (shouldIncludeField('apc_epigenetics_active', variant.apc_epigenetics_active)) {
    integrative.push({ field: "aPC-Epigenetics Active", value: variant.apc_epigenetics_active });
  }
  if (shouldIncludeField('apc_epigenetics_repressed', variant.apc_epigenetics_repressed)) {
    integrative.push({ field: "aPC-Epigenetics Repressed", value: variant.apc_epigenetics_repressed });
  }
  if (shouldIncludeField('apc_epigenetics_transcription', variant.apc_epigenetics_transcription)) {
    integrative.push({ field: "aPC-Epigenetics Transcription", value: variant.apc_epigenetics_transcription });
  }
  if (shouldIncludeField('apc_local_nucleotide_diversity_v3', variant.apc_local_nucleotide_diversity_v3)) {
    integrative.push({ field: "aPC-Local Nucleotide Diversity", value: variant.apc_local_nucleotide_diversity_v3 });
  }
  if (shouldIncludeField('apc_mutation_density', variant.apc_mutation_density)) {
    integrative.push({ field: "aPC-Mutation Density", value: variant.apc_mutation_density });
  }
  if (shouldIncludeField('apc_transcription_factor', variant.apc_transcription_factor)) {
    integrative.push({ field: "aPC-Transcription Factor", value: variant.apc_transcription_factor });
  }
  if (shouldIncludeField('apc_mappability', variant.apc_mappability)) {
    integrative.push({ field: "aPC-Mappability", value: variant.apc_mappability });
  }
  if (shouldIncludeField('cadd_phred', variant.cadd_phred)) {
    integrative.push({ field: "CADD phred", value: variant.cadd_phred });
  }
  if (shouldIncludeField('linsight', variant.linsight)) {
    integrative.push({ field: "LINSIGHT", value: variant.linsight });
  }
  if (integrative.length > 0) categories.Integrative = { label: "Integrative Scores", items: integrative };

  // Protein Function
  const proteinFunction: any[] = [];
  if (shouldIncludeField('apc_protein_function_v3', variant.apc_protein_function_v3)) {
    proteinFunction.push({
      field: "aPC-Protein Function",
      value: variant.apc_protein_function_v3,
      tooltip: "Integrative score combining multiple protein function predictions (SIFT, PolyPhen, Grantham, PolyPhen2, MutationTaster, MutationAssessor) into a single PHRED-scaled score. Higher scores (>10) are more likely to affect protein function. Range: [2.974, 86.238]. (Li et al., 2020)"
    });
  }
  if (shouldIncludeField('cadd_phred', variant.cadd_phred)) {
    proteinFunction.push({
      field: "CADD phred",
      value: variant.cadd_phred,
      tooltip: "The CADD score in PHRED scale (integrative score). A higher CADD score indicates more deleterious. Higher scores (>10) are more likely deleterious. Range: [0.001, 84]. (Kircher et al., 2014; Rentzsch et al., 2018)"
    });
  }
  if (gnomadGenome?.revel_max && shouldIncludeField('revel_max', gnomadGenome.revel_max)) {
    proteinFunction.push({
      field: "REVEL",
      value: gnomadGenome.revel_max,
      tooltip: "REVEL (Rare Exome Variant Ensemble Learner) is an ensemble method for predicting pathogenicity of missense variants. Combines scores from MutPred, FATHMM, VEST, PolyPhen, SIFT, PROVEAN, MutationAssessor, MutationTaster, LRT, GERP, SiPhy, phyloP, and phastCons. Higher scores (>0.5) indicate likely pathogenic, >0.75 indicate highly pathogenic. Range: [0, 1]. (Ioannidis et al., 2016; gnomAD v4)"
    });
  }
  if (variant.polyphen_cat && shouldIncludeField('polyphen_val', variant.polyphen_val)) {
    proteinFunction.push({
      field: "PolyPhen-2",
      category: variant.polyphen_cat,
      value: variant.polyphen_val,
      tooltip: "PolyPhen score predicting functional significance of allele replacement. Higher scores (>0.8) are more likely damaging. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)"
    });
  }
  if (shouldIncludeField('polyphen2_hdiv_score', variant.polyphen2_hdiv_score)) {
    proteinFunction.push({
      field: "PolyPhen2 HDIV",
      value: variant.polyphen2_hdiv_score,
      tooltip: "PolyPhen2 HumDiv: Predicts amino acid substitution impact trained on Mendelian disease variants vs. evolutionarily divergent variants. Higher scores (>0.8) are more likely damaging. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)"
    });
  }
  if (shouldIncludeField('polyphen2_hvar_score', variant.polyphen2_hvar_score)) {
    proteinFunction.push({
      field: "PolyPhen2 HVAR",
      value: variant.polyphen2_hvar_score,
      tooltip: "PolyPhen2 HumVar: Predicts amino acid substitution impact trained on human disease variants vs. common polymorphisms (MAF ≥1%). Higher scores (>0.8) are more likely damaging. Range: [0, 1] (default: 0). (Adzhubei et al., 2010)"
    });
  }
  if (variant.sift_cat && shouldIncludeField('sift_val', variant.sift_val)) {
    proteinFunction.push({
      field: "SIFT",
      category: variant.sift_cat,
      value: variant.sift_val,
      tooltip: "SIFT score, ranges from 0.0 (deleterious) to 1.0 (tolerated). Lower scores (0.0-0.05) are more likely deleterious. Range: [0, 1] (default: 1). (Ng and Henikoff, 2003)"
    });
  }
  if (shouldIncludeField('grantham', variant.grantham)) {
    proteinFunction.push({
      field: "Grantham",
      value: variant.grantham,
      tooltip: "Grantham Score: Measures evolutionary distance between amino acids based on chemical properties. Higher scores indicate greater chemical difference and potential functional impact. Thresholds: Conservative (0-50), moderate (51-100), radical (>100). Range: [0, 215] (default: 0). (Grantham, 1974)"
    });
  }
  if (shouldIncludeField('mutation_taster_score', variant.mutation_taster_score)) {
    proteinFunction.push({
      field: "Mutation Taster",
      value: variant.mutation_taster_score,
      tooltip: "MutationTaster evaluates DNA sequence variants for disease-causing potential. Higher scores (>0.8) are more likely disease-causing. Range: [0, 1] (default: 0). (Schwarz et al., 2014)"
    });
  }
  if (shouldIncludeField('mutation_assessor_score', variant.mutation_assessor_score)) {
    proteinFunction.push({
      field: "Mutation Assessor",
      value: variant.mutation_assessor_score,
      tooltip: "Predicts functional impact of amino-acid substitutions in proteins. Higher scores (>3) indicate more likely functional impact. Range: [-5.135, 6.125] (default: -5.545). (Reva et al., 2011)"
    });
  }
  if (proteinFunction.length > 0) categories["Protein Function"] = { label: "Protein Function Predictions", items: proteinFunction };

  // Splicing
  const splicing: any[] = [];
  if (gnomadGenome?.spliceai_ds_max && shouldIncludeField('spliceai_ds_max', gnomadGenome.spliceai_ds_max)) {
    splicing.push({ field: "SpliceAI", value: gnomadGenome.spliceai_ds_max, source: "gnomAD v4" });
  }
  if (gnomadGenome?.pangolin_largest_ds && shouldIncludeField('pangolin_largest_ds', gnomadGenome.pangolin_largest_ds)) {
    splicing.push({ field: "Pangolin", value: gnomadGenome.pangolin_largest_ds, source: "gnomAD v4" });
  }
  if (splicing.length > 0) categories.Splicing = { label: "Splicing Impact", items: splicing };

  // Mutation Rate
  const mutationRate: any[] = [];
  if (variant.filter_value) {
    mutationRate.push({ field: "Filter value", value: variant.filter_value });
  }
  if (variant.pn) {
    mutationRate.push({ field: "PN", value: variant.pn, tooltip: "Pentanucleotide context" });
  }
  if (variant.mr !== null && variant.mr !== undefined) {
    mutationRate.push({ field: "MR", value: variant.mr, tooltip: "Mutation Rate (Roulette)" });
  }
  if (variant.ar !== null && variant.ar !== undefined) {
    mutationRate.push({ field: "AR", value: variant.ar, tooltip: "Adjusted Rate" });
  }
  if (variant.mg !== null && variant.mg !== undefined) {
    mutationRate.push({ field: "MG", value: variant.mg, tooltip: "gnomAD mutation rate" });
  }
  if (variant.mc !== null && variant.mc !== undefined) {
    mutationRate.push({ field: "MC", value: variant.mc, tooltip: "Carlson mutation rate" });
  }
  if (mutationRate.length > 0) categories["Mutation Rate"] = { label: "Mutation Density & Context", items: mutationRate };

  // Alphamissense
  const alphamissense: any[] = [];
  if ((variant as any).protein_variant) {
    alphamissense.push({ field: "Protein Variant", value: (variant as any).protein_variant });
  }
  if (shouldIncludeField('am_pathogenicity', (variant as any).am_pathogenicity)) {
    alphamissense.push({ field: "AM Pathogenicity", value: (variant as any).am_pathogenicity });
  }
  if ((variant as any).am_class) {
    alphamissense.push({ field: "AM Class", value: (variant as any).am_class });
  }
  if (alphamissense.length > 0) categories.Alphamissense = { label: "AlphaMissense Predictions", items: alphamissense };

  // cCRE (Candidate cis-Regulatory Elements) - separate category
  if (ccreData) {
    try {
      const ccreAgg = aggregateCCREData(ccreData);
      if (ccreAgg) categories.cCRE = { label: "Regulatory Elements (cCRE)", data: ccreAgg };
    } catch (error) {
      console.error("Error aggregating cCRE data:", error);
    }
  }

  // PGBoost (Variant-to-Gene Connections) - separate category
  if (pgboostData) {
    try {
      const pgboostAgg = aggregatePGBoostData(pgboostData);
      if (pgboostAgg) categories.PGBoost = { label: "Variant-to-Gene Connections", data: pgboostAgg };
    } catch (error) {
      console.error("Error aggregating PGBoost data:", error);
    }
  }

  // Tissue-specific data (CV2F, SCENT)
  const tissueSpecific: any = {};

  if (cv2fData) tissueSpecific.CV2F = cv2fData;

  if (scentData) {
    try {
      const scentAgg = aggregateSCENTData(scentData);
      if (scentAgg) tissueSpecific.SCENT = scentAgg;
    } catch (error) {
      console.error("Error aggregating SCENT data:", error);
    }
  }

  // Phenotypic impact
  const phenotypic: any = {};

  if (gwasData) {
    try {
      const gwasAgg = aggregateGWASData(gwasData);
      if (gwasAgg) phenotypic.GWAS = gwasAgg;
    } catch (error) {
      console.error("Error aggregating GWAS data:", error);
    }
  }

  if (eqtlData) {
    try {
      const eqtlAgg = aggregateEQTLData(eqtlData);
      if (eqtlAgg) phenotypic.eQTL = eqtlAgg;
    } catch (error) {
      console.error("Error aggregating eQTL data:", error);
    }
  }

  // Add tissue-specific and phenotypic if they have data
  if (Object.keys(tissueSpecific).length > 0) categories["Tissue-Specific"] = { label: "Tissue-Specific Annotations", data: tissueSpecific };
  if (Object.keys(phenotypic).length > 0) categories["Phenotypic Impact"] = { label: "Phenotypic Associations", data: phenotypic };

  return categories;
}

const systemPrompt = String.raw`You are an expert genomic variant analyst with deep knowledge of molecular biology, population genetics, clinical genomics and more. Your role is to synthesize complex multi-source variant annotation data into clear, biologically meaningful summary.

**CRITICAL: Data Fidelity & Citation Rules**
- ONLY use data explicitly provided in the input - never invent or assume values
- **MANDATORY: EVERY single data point, score, frequency, or metric MUST have an inline (Source) citation**
- PRESERVE all inline database citations (e.g., "gnomAD v4", "BRAVO freeze 10", "ENCODE", "ClinVar") when referencing specific data points
- If insufficient data exists for a section, state that clearly rather than generating placeholder content

**Core Principles:**
- Provide expert biological reasoning grounded strictly in the provided data
- Focus on telling a coherent biological story - not listing all available scores
- Explain significance for both clinical and research contexts
- Use precise genomic terminology while remaining accessible

**Input Format:**
You will receive structured JSON data organized by categories. Each category has a "label" field that should be used as the section header in your summary.

Category structure example:
{
  "CategoryName": {
    "label": "Display Label for Section Header",
    "items": [
      { "field": "Field Name", "value": ..., "tooltip": "Detailed explanation with ranges and interpretation" }
    ]
  }
}

Available categories:
- Basic (label: "Basic Information"): Variant VCF, rsID, TOPMed QC Status, Bravo AF, GNOMAD AF, 1000 Genomes AF
- Category (label: "Category Insights"): Genecode annotations, MetaSVM, CAGE, GeneHancer, Super Enhancer
- Clinvar (label: "Clinical Significance"): Clinical significance, disease name, review status, allele origin
- Population (label: "Population Genetics"): Ancestry-specific frequencies with interpretation guide
- Conservation (label: "Evolutionary Conservation"): aPC-Conservation, phyloP/phastCons, GERP scores
- Epigenetics (label: "Epigenetic Marks"): Histone marks by activity (Active/Repressed/Transcription), DNase, totalRNA
- Integrative (label: "Integrative Scores"): aPC scores, CADD, LINSIGHT
- Protein Function (label: "Protein Function Predictions"): CADD, REVEL, PolyPhen, SIFT, Grantham, MutationTaster, MutationAssessor
- Splicing (label: "Splicing Impact"): SpliceAI, Pangolin
- Mutation Rate (label: "Mutation Density & Rate"): Filter value, PN, mutation rates
- Alphamissense (label: "AlphaMissense Predictions"): Protein variant, pathogenicity, classification
- cCRE (label: "Regulatory Elements (cCRE)"): Candidate cis-regulatory elements
- PGBoost (label: "Variant-to-Gene Connections"): Variant-to-gene associations
- Tissue-Specific (label: "Tissue-Specific Annotations"): CV2F chromatin accessibility, SCENT enhancer-gene links
- Phenotypic Impact (label: "Phenotypic Associations"): GWAS (top 10 unique traits, deduped), eQTL

**IMPORTANT**: Use the "label" field from each category as your section header.



Output Structure & Formatting:
Start the summary with Basic Information, we dont want any titles, content above it.
Use #### for section headers (e.g., "#### Basic Information", "#### Category Insights", etc.) based on the "label" field of each category.

1. Hierarchical bullet format: Use nested bullets to organize information under each section header. For example:
Category Insights:
 - (similar scores interpreted together) 
 - (scores with similar interpretation grouped together)

2. Score presentation rules: 
  - Lead with interpretation, then support with data points and citations (e.g., "This variant has a CADD score of 25, which is above the threshold of 10 for likely deleterious variants. (Kircher et al., 2014)"), "GNOMAD v4 reports an allele frequency of 0.0005, which is considered rare (MAF < 0.0001). (gnomAD v4)" etc.

3. Styling:
  - Bold key findings: Highlight critical insights or particularly impactful scores in bold.
  - Use formats for region, variant as chr-pos-ref-alt (e.g., "19-44908822-C-T"), chr-start-end for regions (e.g., "19-44908816-44908825") without chr prefix


4. Example output:
#### Basic Information:

The variant is identified as **19-44908822-C-T**, also known by its rsID **rs7412**.
It passes the **TOPMed QC Status**, indicating satisfactory quality.
The **TOPMed Bravo Allele Number** is **264690**, reflecting the variant's representation in the dataset.
Its **TOPMed Bravo Allele Frequency** is **0.0781216**, suggesting it is a Low Frequency variant (0.0001 ≤ MAF < 0.01) in the population (NHLBI TOPMed Consortium).
The **Total GNOMAD Allele Frequency** is **0.0788183**, also indicating low frequency status (GNOMAD Consortium, 2019; Karczewski et al., 2020).
The **1000 Genomes Allele Frequency** is **0.0750799**, consistent with both previous frequencies.

#### Category Insights:

This variant affects the **APOE** gene, categorized as **exonic**, meaning it occurs within the protein-coding region (Frankish et al., 2018; Harrow et al., 2012).
It particularly results in a **nonsynonymous SNV**, leading to an amino acid change (Frankish et al., 2018; Harrow et al., 2012).
The variant overlaps with a **CAGE promoter site** positioned at **19-44908816-44908825** (Forrest et al., 2014).
  `;

/**
 * Pure LLM summarization function
 */
async function summarizeVariantWithLLM(ctx: VariantContext, modelId: string): Promise<string> {
  const variantJSON = buildVariantJSON(ctx);

  // Log the structured JSON for inspection
  console.log('\n========== VARIANT JSON STRUCTURE ==========');
  console.log('VCF:', ctx.variant.variant_vcf);
  console.log('\nJSON Keys:', Object.keys(variantJSON));
  console.log('\nFull JSON:');
  console.log(JSON.stringify(variantJSON, null, 2));
  console.log('========== END VARIANT JSON ==========\n');

  const result = streamText({
    model: myProvider.languageModel(modelId),
    system: systemPrompt,
    prompt: `Summarize this variant based on the following structured data:\n\n${JSON.stringify(variantJSON, null, 2)}`,
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  return fullText;
}

/**
 * Orchestrates variant summary generation using pure functions
 */
async function generateSummaryInBackground(vcf: string, modelId: string) {
  try {
    await prisma.variantSummary.update({
      where: { vcf },
      data: { status: "generating" },
    });

    // Step 1: Collect all variant data (pure data fetching)
    const variantContext = await collectVariantContext(vcf);

    // Step 2: Generate summary using LLM (pure business logic)
    const summary = await summarizeVariantWithLLM(variantContext, modelId);

    // Step 3: Save to database (side effect)
    await prisma.variantSummary.update({
      where: { vcf },
      data: {
        summary,
        status: "completed",
      },
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await prisma.variantSummary.update({
      where: { vcf },
      data: {
        status: "failed",
        error: errorMessage,
      },
    });
  }
}

export async function POST(req: Request) {
  try {
    const {
      vcf,
      model = "gpt-4o-mini",
    }: {
      vcf: string;
      model?: string;
    } = await req.json();

    if (!vcf) {
      return new Response("VCF parameter required", { status: 400 });
    }

    const existingRecord = await prisma.variantSummary.findUnique({
      where: { vcf },
    });

    if (existingRecord) {
      if (existingRecord.status === "completed" && existingRecord.summary) {
        return Response.json({ status: "completed", summary: existingRecord.summary });
      }
      if (existingRecord.status === "generating") {
        return Response.json({ status: "generating" });
      }
      if (existingRecord.status === "failed") {
        await prisma.variantSummary.update({
          where: { vcf },
          data: { status: "generating", error: null },
        });
        waitUntil(generateSummaryInBackground(vcf, model));
        return Response.json({ status: "generating" });
      }
      if (existingRecord.status === "pending") {
        await prisma.variantSummary.update({
          where: { vcf },
          data: { status: "generating" },
        });
        waitUntil(generateSummaryInBackground(vcf, model));
        return Response.json({ status: "generating" });
      }
    } else {
      await prisma.variantSummary.create({
        data: {
          vcf,
          modelId: model,
          status: "generating",
        },
      });
      waitUntil(generateSummaryInBackground(vcf, model));
      return Response.json({ status: "generating" });
    }
  } catch (error) {
    console.error("Error in variant-summary route:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate variant summary";
    return new Response(errorMessage, { status: 500 });
  }
}
