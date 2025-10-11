import { myProvider } from "@/lib/ai";
import { streamText } from "ai";
import type { Variant } from "@/lib/variant/types";
import { fetchVariant } from "@/lib/variant/api";
import { fetchGnomadExome, fetchGnomadGenome } from "@/lib/variant/gnomad/api";
import { getCCREByVCF } from "@/lib/variant/ccre/api";
import { fetchCV2F } from "@/lib/variant/cv2f/api";
import { fetchPGBoost } from "@/lib/variant/pgboost/api";
import { fetchScentTissueByVCF } from "@/lib/variant/scent/api";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";

export const maxDuration = 300;

function constructVariantPrompt(
  variant: Variant,
  gnomadExome?: any,
  gnomadGenome?: any,
  ccreData?: any,
  cv2fData?: any,
  pgboostData?: any,
  scentData?: any
): string {
  const sections: string[] = [];

  sections.push("# GENOMIC LOCATION & IDENTIFICATION");
  sections.push(`Chromosome: ${variant.chromosome}`);
  sections.push(`Position: ${variant.position}`);
  sections.push(`Variant ID: ${variant.variant_vcf}`);
  if (variant.rsid && variant.rsid !== "NA") sections.push(`rsID: ${variant.rsid}`);

  sections.push("\n# FUNCTIONAL CONSEQUENCE & GENE CONTEXT");
  if (variant.genecode_comprehensive_category) {
    sections.push(`Genomic Region: ${variant.genecode_comprehensive_category}`);
  }
  if (variant.genecode_comprehensive_exonic_category) {
    sections.push(`Coding Impact: ${variant.genecode_comprehensive_exonic_category}`);
  }
  if (variant.geneinfo) sections.push(`Gene: ${variant.geneinfo}`);
  if (variant.genecode_comprehensive_info) {
    sections.push(`Annotation: ${variant.genecode_comprehensive_info}`);
  }

  sections.push("\n# PATHOGENICITY & FUNCTIONAL PREDICTIONS");
  if (variant.cadd_phred) sections.push(`CADD Phred: ${variant.cadd_phred} (deleteriousness)`);
  if (gnomadGenome?.revel_max) sections.push(`REVEL: ${gnomadGenome.revel_max} (missense pathogenicity)`);
  if (variant.metasvm_pred) sections.push(`MetaSVM: ${variant.metasvm_pred}`);
  if (variant.polyphen_cat && variant.polyphen_val !== null) {
    sections.push(`PolyPhen-2: ${variant.polyphen_cat} (${variant.polyphen_val})`);
  }
  if (variant.sift_cat && variant.sift_val !== null) {
    sections.push(`SIFT: ${variant.sift_cat} (${variant.sift_val})`);
  }
  if (variant.linsight !== null && variant.linsight > 0) {
    sections.push(`LINSIGHT: ${variant.linsight} (non-coding functional impact)`);
  }
  if (variant.fathmm_xf !== null && variant.fathmm_xf > 0) {
    sections.push(`FATHMM-XF: ${variant.fathmm_xf} (non-coding deleteriousness)`);
  }

  sections.push("\n# SPLICING IMPACT");
  if (gnomadGenome?.spliceai_ds_max && gnomadGenome.spliceai_ds_max > 0.1) {
    sections.push(`SpliceAI ΔScore: ${gnomadGenome.spliceai_ds_max} (splicing disruption)`);
  }
  if (gnomadGenome?.pangolin_largest_ds && gnomadGenome.pangolin_largest_ds > 0.1) {
    sections.push(`Pangolin ΔScore: ${gnomadGenome.pangolin_largest_ds}`);
  }

  sections.push("\n# CLINICAL SIGNIFICANCE");
  if (variant.clnsig) sections.push(`ClinVar: ${variant.clnsig}`);
  if (variant.clndn) sections.push(`Phenotypes: ${variant.clndn}`);
  if (variant.clnrevstat) sections.push(`Review Status: ${variant.clnrevstat}`);
  if (variant.origin) sections.push(`Origin: ${variant.origin}`);

  sections.push("\n# POPULATION GENETICS");
  if (variant.bravo_af !== null) {
    sections.push(`TOPMed AF: ${variant.bravo_af.toExponential(3)} (n=${variant.bravo_an})`);
  }
  if (gnomadGenome?.af) {
    sections.push(`gnomAD v4 Genome AF: ${gnomadGenome.af.toExponential(3)}`);
  }
  if (gnomadExome?.af) {
    sections.push(`gnomAD v4 Exome AF: ${gnomadExome.af.toExponential(3)}`);
  }
  if (gnomadGenome?.nhomalt) {
    sections.push(`Homozygous individuals: ${gnomadGenome.nhomalt}`);
  }

  sections.push("Ancestry frequencies:");
  if (variant.af_afr !== null) sections.push(`  AFR: ${variant.af_afr.toExponential(3)}`);
  if (variant.af_amr !== null) sections.push(`  AMR: ${variant.af_amr.toExponential(3)}`);
  if (variant.af_eas !== null) sections.push(`  EAS: ${variant.af_eas.toExponential(3)}`);
  if (variant.af_nfe !== null) sections.push(`  NFE: ${variant.af_nfe.toExponential(3)}`);
  if (variant.af_sas !== null) sections.push(`  SAS: ${variant.af_sas.toExponential(3)}`);

  sections.push("\n# EVOLUTIONARY CONSERVATION");
  if (variant.mamphylop !== null) sections.push(`PhyloP (100-way): ${variant.mamphylop}`);
  if (variant.mamphcons !== null) sections.push(`PhastCons: ${variant.mamphcons}`);
  if (variant.gerp_s !== null) sections.push(`GERP++: ${variant.gerp_s}`);

  sections.push("\n# REGULATORY & EPIGENETIC LANDSCAPE");
  if (ccreData && ccreData.length > 0) {
    sections.push(`cCREs: ${ccreData.length} candidate regulatory element(s)`);
    const types = Array.from(new Set(ccreData.filter((c: any) => c && c.annotations).map((c: any) => c.annotations)));
    if (types.length > 0) sections.push(`  Types: ${types.join(", ")}`);
  }
  if (variant.cage_promoter) sections.push(`CAGE Promoter: ${variant.cage_promoter}`);
  if (variant.cage_enhancer) sections.push(`CAGE Enhancer: ${variant.cage_enhancer}`);
  if (variant.genehancer) sections.push(`GeneHancer: ${variant.genehancer}`);
  if (variant.super_enhancer) sections.push(`Super Enhancer: ${variant.super_enhancer}`);
  if (variant.remap_overlap_tf) sections.push(`ReMap TF sites: ${variant.remap_overlap_tf} overlaps`);

  const histones = [];
  if (variant.encodeh3k27ac_sum) histones.push(`H3K27ac=${variant.encodeh3k27ac_sum}`);
  if (variant.encodeh3k4me3_sum) histones.push(`H3K4me3=${variant.encodeh3k4me3_sum}`);
  if (variant.encodeh3k4me1_sum) histones.push(`H3K4me1=${variant.encodeh3k4me1_sum}`);
  if (histones.length > 0) sections.push(`Key histones: ${histones.join(", ")}`);

  if (variant.encode_dnase_sum !== null) sections.push(`DNase signal: ${variant.encode_dnase_sum}`);

  sections.push("\n# TISSUE-SPECIFIC EFFECTS");
  if (cv2fData) {
    sections.push("CV2F scores (chromatin accessibility):");
    if (cv2fData.Cv2f) sections.push(`  Overall: ${cv2fData.Cv2f}`);
    if (cv2fData.BrainCv2f) sections.push(`  Brain: ${cv2fData.BrainCv2f}`);
    if (cv2fData.BloodCv2f) sections.push(`  Blood: ${cv2fData.BloodCv2f}`);
    if (cv2fData.LiverCv2f) sections.push(`  Liver: ${cv2fData.LiverCv2f}`);
  }

  if (pgboostData && pgboostData.length > 0) {
    sections.push("Variant-to-gene prioritization (PGBoost):");
    pgboostData.slice(0, 3).forEach((pg: any) => {
      if (pg && pg.gene) {
        sections.push(`  ${pg.gene}: ${pg.pg_boost} (${pg.pg_boost_percentile}th %ile)`);
      }
    });
  }

  if (scentData && scentData.length > 0) {
    const tissues = Array.from(new Set(scentData.filter((s: any) => s && s.tissue).map((s: any) => s.tissue))).slice(0, 5);
    const genes = Array.from(new Set(scentData.filter((s: any) => s && s.gene).map((s: any) => s.gene))).slice(0, 5);
    if (tissues.length > 0 || genes.length > 0) {
      sections.push(`SCENT enhancer links:`);
      if (tissues.length > 0) sections.push(`  Tissues: ${tissues.join(", ")}`);
      if (genes.length > 0) sections.push(`  Genes: ${genes.join(", ")}`);
    }
  }

  sections.push("\n# INTEGRATIVE APC SCORES");
  if (variant.apc_protein_function_v3 !== null) {
    sections.push(`Protein function: ${variant.apc_protein_function_v3}`);
  }
  if (variant.apc_conservation_v2 !== null) {
    sections.push(`Conservation: ${variant.apc_conservation_v2}`);
  }
  if (variant.apc_epigenetics_active !== null) {
    sections.push(`Epigenetics (active): ${variant.apc_epigenetics_active}`);
  }
  if (variant.apc_transcription_factor !== null) {
    sections.push(`Transcription factor: ${variant.apc_transcription_factor}`);
  }

  return sections.join("\n");
}

const systemPrompt = `You are an expert genomic variant analyst with deep knowledge of molecular biology, population genetics, and clinical genomics. Your role is to synthesize complex multi-source variant annotation data into clear, biologically meaningful interpretations.

**CRITICAL: Data Fidelity Rules**
- ONLY use data explicitly provided in the input - never invent or assume values
- If a score, annotation, or data type is missing, explicitly state "not available" or omit that section
- Do NOT speculate about data that isn't provided
- Do NOT make up gene names, pathways, or mechanisms not supported by the provided data
- When interpreting scores, cite the actual values provided
- If insufficient data exists for a section, state that clearly rather than generating placeholder content

**Core Principles:**
- Provide expert biological reasoning grounded strictly in the provided data
- Interpret scores in mechanistic context only when sufficient data is available
- Integrate evidence across multiple data types to build coherent biological narratives
- Explain significance for both clinical and research contexts
- Use precise genomic terminology while remaining accessible

**Response Structure (use markdown):**

## Genomic Context & Variant Classification
- Genomic location, gene context, and functional domain if applicable
- Variant type (coding vs. non-coding, regulatory, intronic) and predicted molecular consequence
- Brief statement on variant classification (likely benign, VUS, likely pathogenic) based on available evidence

## Molecular & Functional Impact
**For coding variants:** Interpret pathogenicity predictors (CADD, REVEL, MetaSVM, PolyPhen-2, SIFT) ONLY if provided. Explain what the actual scores suggest about structural/functional disruption.

**For non-coding variants:** Evaluate regulatory potential using LINSIGHT, FATHMM-XF, conservation scores, and epigenetic marks ONLY if provided. Explain predicted regulatory mechanism based on available data.

**Splicing:** If SpliceAI/Pangolin scores are provided and elevated, explain splice disruption risk. If not provided, omit this subsection.

## Clinical Significance
- Interpret ClinVar classification and review status ONLY if provided in the data
- Report disease associations or phenotypes ONLY if explicitly provided in ClinVar data
- Assess clinical actionability based on available evidence only
- If no ClinVar data: state that clinical significance is not established in ClinVar, and provide interpretation based solely on available functional predictions and population data

## Population Genetics & Allele Frequency
- Characterize variant rarity (ultra-rare, rare, low-frequency, common)
- Explain gnomAD v4 frequencies and what they suggest about selection pressure
- Note ancestry-specific frequencies if significant differences exist
- Interpret homozygote counts in context of variant severity predictions

## Regulatory & Epigenetic Landscape
- Evaluate cCRE overlaps, enhancer/promoter evidence, and tissue-specific regulatory activity
- Interpret histone marks and DNase hypersensitivity in context of chromatin state
- Assess transcription factor binding disruption potential
- Explain biological significance of regulatory annotations

## Tissue-Specific Effects & Gene Targeting
- Interpret CV2F scores for tissue-specific chromatin accessibility impact
- Analyze PGBoost variant-to-gene links with percentile rankings
- Synthesize SCENT enhancer-gene connections across tissues
- Explain which tissues/cell types are most likely affected and why

## Biological Integration & Mechanism
- Synthesize ONLY the provided evidence into a mechanistic hypothesis
- Explain how molecular changes could lead to phenotypic effects based strictly on available annotations
- Note concordance or conflicts between different evidence types that are present in the data
- Explicitly highlight data gaps and limitations - do not fill in missing information with assumptions

## Key Takeaways
- 3-4 concise bullet points summarizing:
  - Most likely biological impact
  - Clinical/research relevance
  - Confidence level and critical evidence
  - Suggested follow-up (functional studies, segregation analysis, etc.)

**Style Guidelines:**
- Be concise but scientifically rigorous
- Use "likely," "suggests," "consistent with" for appropriate uncertainty
- Explain *why* scores matter, not just *what* they are
- Prioritize biological insight over comprehensiveness
- Target audience: clinical geneticists and genomics researchers
- REMEMBER: Only interpret data that is actually provided - absence of data is valuable information, not a gap to fill with speculation`;

async function generateSummaryInBackground(vcf: string, modelId: string) {
  try {
    await prisma.variantSummary.update({
      where: { vcf },
      data: { status: "generating" },
    });

    const variant = await fetchVariant(vcf);

    if (!variant) {
      await prisma.variantSummary.update({
        where: { vcf },
        data: {
          status: "failed",
          error: "Variant not found",
        },
      });
      return;
    }

    const [gnomadExome, gnomadGenome, ccreData, cv2fData, pgboostData, scentData] = await Promise.all([
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
    ]);

    const structuredVariantData = constructVariantPrompt(
      variant,
      gnomadExome,
      gnomadGenome,
      ccreData,
      cv2fData,
      pgboostData,
      scentData
    );

    const result = streamText({
      model: myProvider.languageModel(modelId),
      system: systemPrompt,
      prompt: `Summarize this variant:\n\n${structuredVariantData}`,
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    await prisma.variantSummary.update({
      where: { vcf },
      data: {
        summary: fullText,
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
