/**
 * Offline prompt-builder harness. Builds synthetic Variant + context fixtures
 * for every archetype, runs them through buildVariantPrompt, writes outputs
 * to /tmp/prompt-tests/, and asserts pattern routing + length-cap compliance.
 *
 * Run with: npx tsx scripts/test-variant-prompts.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Variant } from "../src/features/variant/types/variant";
import {
  buildVariantPrompt,
  type VariantPromptContext,
} from "../src/features/variant/utils/build-variant-prompt";
import { computeVariantFrame } from "../src/features/variant/utils/variant-frame";

const OUT_DIR = "/tmp/prompt-tests";
const MAX_PROMPT_LENGTH = 18000; // matches src/features/variant/actions/ai-summary.ts

function baseVariant(overrides: Partial<Variant>): Variant {
  return {
    vid: 1,
    chromosome: "1",
    position: 1000000,
    variant_vcf: "1-1000000-A-G",
    ...overrides,
  };
}

const fixtures: Array<{
  name: string;
  variant: Variant;
  context?: VariantPromptContext;
  expectedPattern: string;
}> = [
  {
    name: "01_pcsk9_r46l_hypomorphic_lof",
    expectedPattern: "hypomorphic_lof_candidate",
    variant: baseVariant({
      chromosome: "1",
      position: 55039974,
      variant_vcf: "1-55039974-G-T",
      dbsnp: { rsid: "rs11591147" },
      genecode: {
        genes: ["PCSK9"],
        consequence: "missense_variant",
        region_type: "exonic",
        transcripts: [{ gene: "PCSK9", hgvsp: "p.Arg46Leu" }],
      },
      gnomad_genome: { af: 0.024 } as never,
      alphamissense: {
        max_pathogenicity: 0.087,
        predictions: [{ class: "likely_benign", protein_variant: "R46L" }],
      },
      main: {
        cadd: { phred: 15.2 },
        protein_predictions: {
          sift_cat: "Tolerated",
          sift_val: 0.18,
          polyphen_cat: "Benign",
          polyphen_val: 0.041,
          grantham: 102,
        },
        conservation: {
          mamphylop: 1.2,
          verphylop: -0.3,
          mamphcons: 0.91,
          verphcons: 0.42,
        },
        gerp: { rs: 1.5 },
      },
      dbnsfp: {
        metasvm_pred: "T",
        polyphen2_hdiv: 0.122,
        polyphen2_hvar: 0.054,
      },
      apc: { protein_function_v3: 12.4, conservation_v2: 8.9 },
      ccre: { annotations: "PLS" },
    }),
    context: {
      gwas: {
        totalAssociations: 633,
        uniqueTraits: 142,
        uniqueStudies: 89,
        top: [
          { trait: "Serum LDL cholesterol", pvalue: 7.0e-26 },
          { trait: "Total cholesterol", pvalue: 3.1e-21 },
          { trait: "Coronary artery disease", pvalue: 2.4e-12 },
        ],
      },
    },
  },
  {
    name: "02_brca1_stopgain_mendelian",
    expectedPattern: "mendelian_candidate",
    variant: baseVariant({
      chromosome: "17",
      position: 43093454,
      variant_vcf: "17-43093454-C-T",
      dbsnp: { rsid: "rs80357906" },
      genecode: {
        genes: ["BRCA1"],
        consequence: "stop_gained",
        region_type: "exonic",
        transcripts: [{ gene: "BRCA1", hgvsp: "p.Glu23*" }],
      },
      gnomad_genome: { af: 0.00001 } as never,
      clinvar: {
        clnsig: ["Pathogenic"],
        clndn: ["Hereditary breast and ovarian cancer syndrome"],
        clnrevstat: "reviewed_by_expert_panel",
      },
      aloft: { description: "Dominant", score: 0.92 },
      main: {
        cadd: { phred: 41.0 },
        conservation: { mamphylop: 7.8, verphylop: 8.4 },
        gerp: { rs: 5.6 },
      },
      apc: { protein_function_v3: 28.3 },
    }),
  },
  {
    name: "03_lof_no_clinvar_aloft_dominant",
    expectedPattern: "lof_candidate",
    variant: baseVariant({
      chromosome: "11",
      position: 5226774,
      variant_vcf: "11-5226774-G-T",
      genecode: {
        genes: ["HBB"],
        consequence: "frameshift_variant",
        transcripts: [{ gene: "HBB", hgvsp: "p.Lys17fs" }],
      },
      gnomad_genome: { af: 0.0001 } as never,
      aloft: { description: "Dominant", score: 0.88 },
      main: {
        cadd: { phred: 38.0 },
        conservation: { mamphylop: 5.4 },
        gerp: { rs: 4.8 },
      },
    }),
  },
  {
    name: "04_fto_intronic_regulatory_qtl",
    expectedPattern: "regulatory_qtl_candidate",
    variant: baseVariant({
      chromosome: "16",
      position: 53786615,
      variant_vcf: "16-53786615-C-T",
      dbsnp: { rsid: "rs9939609" },
      genecode: {
        genes: ["FTO"],
        consequence: "intron_variant",
        region_type: "intronic",
      },
      gnomad_genome: { af: 0.42 } as never,
      ccre: { annotations: "dELS" },
      genehancer: {
        id: "GH16J053780",
        feature_score: 0.81,
        targets: [
          { gene: "IRX3", score: 6.2 },
          { gene: "IRX5", score: 4.8 },
        ],
      },
      main: {
        chromhmm: { e13: 38.2, e14: 24.1 } as never,
        distance: { min_dist_tss: 41200 },
        remap: { overlap_tf: 17, overlap_cl: 22 },
      },
      apc: {
        epigenetics_active: 22.4,
        transcription_factor: 18.9,
        conservation_v2: 4.3,
      },
      pgboost: [{ gene: "IRX3", score: 0.78, percentile: 96 }],
    }),
    context: {
      gwas: {
        totalAssociations: 412,
        uniqueTraits: 53,
        uniqueStudies: 78,
        top: [
          { trait: "Body mass index", pvalue: 6.8e-31 },
          { trait: "Type 2 diabetes", pvalue: 1.4e-18 },
        ],
      },
      qtlTissues: [
        { tissue: "Adipose - Subcutaneous", count: 14, significant: 12 },
        { tissue: "Brain - Hypothalamus", count: 7, significant: 5 },
      ],
      signalTissues: [
        { tissue: "Adipose - Subcutaneous", count: 8, maxValue: 9.2 },
      ],
    },
  },
  {
    name: "05_intergenic_validated_with_crispr",
    expectedPattern: "validated_regulatory_candidate",
    variant: baseVariant({
      chromosome: "8",
      position: 128413305,
      variant_vcf: "8-128413305-A-G",
      genecode: {
        consequence: "intergenic_variant",
        region_type: "intergenic",
      },
      gnomad_genome: { af: 0.18 } as never,
      ccre: { annotations: "dELS" },
      apc: {
        epigenetics_active: 18.7,
        transcription_factor: 16.4,
        conservation_v2: 5.1,
      },
    }),
    context: {
      perturbation: { crisprGenes: 2, perturbSeqGenes: 1, maveGenes: 0 },
      regionCounts: { validated_enhancers: 3, crispr_screens: 4 },
      regionOverlaps: { ccre_signals: 4, enhancer_gene: 6, epiraction: 2 },
      gwas: {
        totalAssociations: 38,
        uniqueTraits: 6,
        uniqueStudies: 12,
        top: [{ trait: "Prostate cancer", pvalue: 4.2e-15 }],
      },
    },
  },
  {
    name: "06_splice_region",
    expectedPattern: "splice_candidate",
    variant: baseVariant({
      chromosome: "13",
      position: 32340000,
      variant_vcf: "13-32340000-G-A",
      genecode: {
        genes: ["BRCA2"],
        consequence: "splice_donor_variant",
        region_type: "splice",
      },
      gnomad_genome: { af: 0.0002 } as never,
      main: { conservation: { mamphylop: 4.8, verphylop: 6.1 } },
    }),
  },
  {
    name: "07_polygenic_contributor",
    expectedPattern: "polygenic_contributor",
    variant: baseVariant({
      chromosome: "3",
      position: 12345678,
      variant_vcf: "3-12345678-A-G",
      genecode: {
        genes: ["GENEX"],
        consequence: "missense_variant",
        transcripts: [{ gene: "GENEX", hgvsp: "p.Ser123Asn" }],
      },
      gnomad_genome: { af: 0.31 } as never,
      alphamissense: { max_pathogenicity: 0.21 },
      main: {
        cadd: { phred: 11.0 },
        protein_predictions: { sift_cat: "Tolerated", polyphen_cat: "Benign" },
      },
    }),
    context: {
      gwas: {
        totalAssociations: 2,
        uniqueTraits: 2,
        uniqueStudies: 2,
        top: [{ trait: "Standing height", pvalue: 1.2e-6 }],
      },
      pgs: {
        totalHits: 47,
        uniqueTraits: 18,
        top: [
          {
            pgsId: "PGS000027",
            trait: "BMI",
            effectWeight: 0.0042,
            effectAllele: "G",
          },
          {
            pgsId: "PGS000729",
            trait: "Standing height",
            effectWeight: -0.0031,
            effectAllele: "G",
          },
          {
            pgsId: "PGS001834",
            trait: "Type 2 diabetes",
            effectWeight: 0.0019,
            effectAllele: "G",
          },
        ],
      },
    },
  },
  {
    name: "08_apoe_e4_common_quantitative",
    expectedPattern: "common_quantitative_trait",
    variant: baseVariant({
      chromosome: "19",
      position: 44908684,
      variant_vcf: "19-44908684-T-C",
      dbsnp: { rsid: "rs429358" },
      genecode: {
        genes: ["APOE"],
        consequence: "missense_variant",
        transcripts: [{ gene: "APOE", hgvsp: "p.Cys130Arg" }],
      },
      gnomad_genome: { af: 0.155 } as never,
      alphamissense: { max_pathogenicity: 0.42 },
      main: {
        cadd: { phred: 23.4 },
        protein_predictions: {
          sift_cat: "Tolerated",
          polyphen_cat: "Benign",
          grantham: 180,
        },
      },
    }),
    context: {
      gwas: {
        totalAssociations: 821,
        uniqueTraits: 234,
        uniqueStudies: 312,
        top: [
          { trait: "Alzheimer's disease", pvalue: 1.0e-300 },
          { trait: "Lipoprotein measurement", pvalue: 5.2e-180 },
        ],
      },
    },
  },
  {
    name: "09_vus_midrange_alphamissense",
    expectedPattern: "vus",
    variant: baseVariant({
      chromosome: "5",
      position: 1234567,
      variant_vcf: "5-1234567-A-T",
      genecode: {
        genes: ["GENEZ"],
        consequence: "missense_variant",
        transcripts: [{ gene: "GENEZ", hgvsp: "p.Asp200Glu" }],
      },
      gnomad_genome: { af: 0.0008 } as never,
      alphamissense: { max_pathogenicity: 0.451 },
      main: {
        cadd: { phred: 18.2 },
        protein_predictions: {
          sift_cat: "Deleterious (Low Confidence)",
          polyphen_cat: "Possibly Damaging",
        },
        conservation: { mamphylop: 2.4, verphylop: 1.8 },
      },
    }),
  },
  {
    name: "10_uninformative",
    expectedPattern: "uninformative",
    variant: baseVariant({
      chromosome: "7",
      position: 999999,
      variant_vcf: "7-999999-C-G",
      genecode: {
        consequence: "intergenic_variant",
        region_type: "intergenic",
      },
      gnomad_genome: { af: 0.05 } as never,
    }),
  },
  {
    name: "11_low_mappability_quality_flag",
    expectedPattern: "regulatory_qtl_candidate",
    variant: baseVariant({
      chromosome: "9",
      position: 5555555,
      variant_vcf: "9-5555555-A-T",
      genecode: { consequence: "intron_variant", region_type: "intronic" },
      gnomad_genome: { af: 0.21 } as never,
      ccre: { annotations: "dELS" },
      mappability: { k50: { umap: 0.32, bismap: 0.4 } },
      apc: { epigenetics_active: 12.0 },
    }),
    context: {
      gwas: {
        totalAssociations: 4,
        uniqueTraits: 3,
        uniqueStudies: 4,
        top: [{ trait: "Height", pvalue: 8e-7 }],
      },
    },
  },
];

function pad(s: string, n: number): string {
  return s + " ".repeat(Math.max(0, n - s.length));
}

const summary: string[] = [];
summary.push(
  pad("Fixture", 42) +
    pad("Frame.kind", 28) +
    pad("Got pattern", 32) +
    pad("Length", 8) +
    "OK?",
);
summary.push("-".repeat(120));

let anyFail = false;
for (const fx of fixtures) {
  const frame = computeVariantFrame(fx.variant, fx.context);
  const prompt = buildVariantPrompt(fx.variant, fx.context);
  writeFileSync(join(OUT_DIR, `${fx.name}.md`), prompt, "utf8");

  const patternOk = frame.pattern === fx.expectedPattern;
  const lengthOk = prompt.length <= MAX_PROMPT_LENGTH;
  const ok = patternOk && lengthOk;
  if (!ok) anyFail = true;

  const status = patternOk
    ? lengthOk
      ? "OK"
      : `LEN>${MAX_PROMPT_LENGTH}`
    : `pattern=${fx.expectedPattern}`;

  summary.push(
    pad(fx.name, 42) +
      pad(frame.frame.kind, 28) +
      pad(frame.pattern, 32) +
      pad(prompt.length.toString(), 8) +
      status,
  );
}

const summaryStr = summary.join("\n");
writeFileSync(join(OUT_DIR, "_summary.txt"), summaryStr, "utf8");
console.log(summaryStr);
console.log(
  `\n${anyFail ? "FAIL" : "PASS"} — ${fixtures.length} fixtures, cap=${MAX_PROMPT_LENGTH}`,
);
process.exit(anyFail ? 1 : 0);
