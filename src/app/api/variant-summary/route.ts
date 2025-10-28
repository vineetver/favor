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

  const isCoding = variant.genecode_comprehensive_category?.toLowerCase().includes("exonic") &&
                   variant.genecode_comprehensive_exonic_category &&
                   !variant.genecode_comprehensive_exonic_category.toLowerCase().includes("synonymous");

  sections.push("# GENOMIC LOCATION & IDENTIFICATION");
  sections.push(`Chromosome: ${variant.chromosome}`);
  sections.push(`Position: ${variant.position}`);
  sections.push(`Variant ID: ${variant.variant_vcf}`);
  if (variant.rsid && variant.rsid !== "NA") sections.push(`rsID: ${variant.rsid}`);

  sections.push("\n# CATEGORY (Functional Classification)");
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

  if (variant.clnsig || variant.clndn) {
    sections.push("\n# CLINVAR");
    if (variant.clnsig) sections.push(`Clinical Significance: ${variant.clnsig}`);
    if (variant.clndn) sections.push(`Phenotypes: ${variant.clndn}`);
    if (variant.clnrevstat) sections.push(`Review Status: ${variant.clnrevstat}`);
    if (variant.origin) sections.push(`Origin: ${variant.origin}`);
  }

  sections.push("\n# OVERALL ALLELE FREQUENCY");
  sections.push("Interpretation: Rare (MAF < 0.0001), Low Frequency (0.0001 ≤ MAF < 0.01), Common (MAF ≥ 0.01)");
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

  sections.push("\n# ANCESTRY SPECIFIC ALLELE FREQUENCY");
  if (variant.af_afr !== null) sections.push(`AFR (African): ${variant.af_afr.toExponential(3)}`);
  if (variant.af_amr !== null) sections.push(`AMR (Ad Mixed American): ${variant.af_amr.toExponential(3)}`);
  if (variant.af_eas !== null) sections.push(`EAS (East Asian): ${variant.af_eas.toExponential(3)}`);
  if (variant.af_nfe !== null) sections.push(`NFE (Non-Finnish European): ${variant.af_nfe.toExponential(3)}`);
  if (variant.af_sas !== null) sections.push(`SAS (South Asian): ${variant.af_sas.toExponential(3)}`);

  if (isCoding) {
    sections.push("\n# PROTEIN FUNCTION PREDICTIONS");
    if (variant.cadd_phred && variant.cadd_phred >= 10) {
      sections.push(`CADD Phred: ${variant.cadd_phred} (>10 = deleterious, >20 = highly deleterious)`);
    }
    if (gnomadGenome?.revel_max && gnomadGenome.revel_max >= 0.3) {
      sections.push(`REVEL: ${gnomadGenome.revel_max} (>0.5 = pathogenic, >0.75 = highly pathogenic)`);
    }
    if (variant.metasvm_pred && variant.metasvm_pred !== "T") {
      sections.push(`MetaSVM: ${variant.metasvm_pred}`);
    }
    if (variant.polyphen_cat && variant.polyphen_val !== null && variant.polyphen_val >= 0.8) {
      sections.push(`PolyPhen-2: ${variant.polyphen_cat} (${variant.polyphen_val}, >0.8 = damaging)`);
    }
    if (variant.sift_cat && variant.sift_val !== null && variant.sift_val <= 0.05) {
      sections.push(`SIFT: ${variant.sift_cat} (${variant.sift_val}, ≤0.05 = deleterious)`);
    }
  }

  sections.push("\n# CONSERVATION");
  if (variant.mamphylop !== null && Math.abs(variant.mamphylop) >= 1.5) {
    sections.push(`PhyloP (100-way): ${variant.mamphylop} (>2 = highly conserved, <-2 = fast evolving)`);
  }
  if (variant.mamphcons !== null && variant.mamphcons >= 0.8) {
    sections.push(`PhastCons: ${variant.mamphcons} (>0.8 = conserved)`);
  }
  if (variant.gerp_s !== null && variant.gerp_s >= 2) {
    sections.push(`GERP++: ${variant.gerp_s} (>2 = constrained, >4 = highly constrained)`);
  }

  if (!isCoding) {
    sections.push("\n# EPIGENETICS (Chromatin Marks)");
    const histones = [];
    if (variant.encodeh3k27ac_sum) histones.push(`H3K27ac=${variant.encodeh3k27ac_sum}`);
    if (variant.encodeh3k4me3_sum) histones.push(`H3K4me3=${variant.encodeh3k4me3_sum}`);
    if (variant.encodeh3k4me1_sum) histones.push(`H3K4me1=${variant.encodeh3k4me1_sum}`);
    if (histones.length > 0) sections.push(`Active marks: ${histones.join(", ")}`);
    if (variant.encode_dnase_sum !== null) sections.push(`DNase signal: ${variant.encode_dnase_sum}`);

    sections.push("\n# TRANSCRIPTION FACTORS");
    if (variant.remap_overlap_tf) sections.push(`ReMap TF sites: ${variant.remap_overlap_tf} overlaps`);
    if (variant.cage_promoter) sections.push(`CAGE Promoter: ${variant.cage_promoter}`);
    if (variant.cage_enhancer) sections.push(`CAGE Enhancer: ${variant.cage_enhancer}`);
    if (variant.genehancer) sections.push(`GeneHancer: ${variant.genehancer}`);
    if (variant.super_enhancer) sections.push(`Super Enhancer: ${variant.super_enhancer}`);
  }

  if (gnomadGenome?.spliceai_ds_max && gnomadGenome.spliceai_ds_max >= 0.2) {
    sections.push("\n# SPLICEAI");
    sections.push(`SpliceAI ΔScore: ${gnomadGenome.spliceai_ds_max} (>0.2 = likely affects splicing, >0.5 = high confidence, >0.8 = very high confidence)`);
    if (gnomadGenome?.pangolin_largest_ds && gnomadGenome.pangolin_largest_ds >= 0.2) {
      sections.push(`Pangolin ΔScore: ${gnomadGenome.pangolin_largest_ds}`);
    }
  }

  sections.push("\n# INTEGRATIVE SCORES (aPC)");
  sections.push("APC (Annotation Principal Components) are PHRED-scaled. Scores >10 indicate biologically significant evidence.");
  if (isCoding) {
    if (variant.apc_protein_function_v3 !== null && variant.apc_protein_function_v3 >= 10) {
      sections.push(`aPC-Protein Function: ${variant.apc_protein_function_v3}`);
    }
    if (variant.apc_conservation_v2 !== null && variant.apc_conservation_v2 >= 10) {
      sections.push(`aPC-Conservation: ${variant.apc_conservation_v2}`);
    }
  } else {
    if (variant.apc_conservation_v2 !== null && variant.apc_conservation_v2 >= 10) {
      sections.push(`aPC-Conservation: ${variant.apc_conservation_v2}`);
    }
    if (variant.apc_epigenetics_active !== null && variant.apc_epigenetics_active >= 10) {
      sections.push(`aPC-Epigenetics (active): ${variant.apc_epigenetics_active}`);
    }
    if (variant.apc_epigenetics_transcription !== null && variant.apc_epigenetics_transcription >= 10) {
      sections.push(`aPC-Epigenetics (transcription): ${variant.apc_epigenetics_transcription}`);
    }
    if (variant.apc_transcription_factor !== null && variant.apc_transcription_factor >= 10) {
      sections.push(`aPC-Transcription Factor: ${variant.apc_transcription_factor}`);
    }
  }

  if (cv2fData || pgboostData || scentData || ccreData) {
    sections.push("\n# TISSUE-SPECIFIC EFFECTS");
    if (ccreData && ccreData.length > 0) {
      sections.push(`cCREs: ${ccreData.length} candidate regulatory element(s)`);
      const types = Array.from(new Set(ccreData.filter((c: any) => c && c.annotations).map((c: any) => c.annotations)));
      if (types.length > 0) sections.push(`  Types: ${types.join(", ")}`);
    }
    if (cv2fData) {
      sections.push("CV2F (chromatin accessibility):");
      if (cv2fData.Cv2f) sections.push(`  Overall: ${cv2fData.Cv2f}`);
      if (cv2fData.BrainCv2f) sections.push(`  Brain: ${cv2fData.BrainCv2f}`);
      if (cv2fData.BloodCv2f) sections.push(`  Blood: ${cv2fData.BloodCv2f}`);
      if (cv2fData.LiverCv2f) sections.push(`  Liver: ${cv2fData.LiverCv2f}`);
    }
    if (pgboostData && pgboostData.length > 0) {
      sections.push("PGBoost (variant-to-gene):");
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
        sections.push(`SCENT (enhancer links):`);
        if (tissues.length > 0) sections.push(`  Tissues: ${tissues.join(", ")}`);
        if (genes.length > 0) sections.push(`  Genes: ${genes.join(", ")}`);
      }
    }
  }

  return sections.join("\n");
}

const systemPrompt = `You are an expert genomic variant analyst with deep knowledge of molecular biology, population genetics, and clinical genomics. Your role is to synthesize complex multi-source variant annotation data into clear, biologically meaningful interpretations.

**CRITICAL: Data Fidelity Rules**
- ONLY use data explicitly provided in the input - never invent or assume values
- If a score, annotation, or data type is missing, omit that section
- Do NOT speculate about data that isn't provided
- Do NOT make up gene names, pathways, or mechanisms not supported by the provided data
- When interpreting scores, cite the actual values provided
- If insufficient data exists for a section, state that clearly rather than generating placeholder content

**Score Interpretation Guidelines:**
- Only scores that pass meaningful thresholds are included in the data
- Absence of a score means either: (1) not available, or (2) below threshold for biological significance
- When scores are provided, they have already been filtered for relevance - focus on their biological meaning
- Use the threshold ranges provided with each score to contextualize severity
- Integrate multiple lines of evidence rather than relying on single scores
- Allele frequency categories: Rare (MAF < 0.0001), Low Frequency (0.0001 ≤ MAF < 0.01), Common (MAF ≥ 0.01)
- Data is organized by functional categories based on variant type (coding vs non-coding)

**Core Principles:**
- Provide expert biological reasoning grounded strictly in the provided data
- Interpret scores in mechanistic context only when sufficient data is available
- Focus on telling a coherent biological story - not listing all available scores
- Integrate evidence across multiple data types to build coherent biological narratives
- Explain significance for both clinical and research contexts
- Use precise genomic terminology while remaining accessible

**Response Structure (use markdown):**

## Variant Classification & Context
Synthesize data from CATEGORY and GENOMIC LOCATION sections:
- Gene context and functional classification (exonic, intronic, intergenic, regulatory)
- Variant type (coding vs. non-coding) and predicted molecular consequence
- Initial classification assessment (likely benign, VUS, likely pathogenic) based on categorical information

## Molecular & Functional Impact
Synthesize evidence from the relevant functional categories:

**For CODING variants:** Integrate PROTEIN FUNCTION, CONSERVATION, and INTEGRATIVE SCORES (aPC) categories:
- Interpret protein impact scores (CADD, REVEL, SIFT, PolyPhen-2, MetaSVM) - explain what they suggest about structural/functional disruption
- Conservation evidence (PhyloP, PhastCons, GERP++) - assess evolutionary constraint
- aPC-Protein Function and aPC-Conservation scores - integrated evidence
- If SPLICEAI category present: assess splice disruption risk

**For NON-CODING variants:** Integrate CONSERVATION, EPIGENETICS, TRANSCRIPTION FACTORS, and INTEGRATIVE SCORES (aPC) categories:
- Regulatory potential from histone marks, DNase signal, TF binding sites
- Enhancer/promoter evidence (CAGE, GeneHancer)
- Conservation evidence indicating functional constraint
- aPC-Conservation, aPC-Epigenetics, aPC-Transcription Factor scores
- If SPLICEAI category present: assess intronic splice effects

## Clinical Significance
Use CLINVAR category if provided:
- Interpret clinical classification and review status
- Report disease associations and phenotypes
- Assess clinical actionability
- If absent: state not established in ClinVar, interpret based on functional predictions

## Population Genetics & Allele Frequency
Synthesize OVERALL ALLELE FREQUENCY category:
- Characterize rarity (ultra-rare, rare, low-frequency, common) using provided thresholds
- Interpret gnomAD v4 and TOPMed frequencies - what do they suggest about selection pressure?
- Contextualize homozygote counts with predicted severity

## Ancestry-Specific Genetics
Synthesize ANCESTRY SPECIFIC ALLELE FREQUENCY category:
- Compare allele frequencies across ancestral populations (AFR, AMR, EAS, NFE, SAS)
- Identify and explain significant ancestry-specific differences (>10-fold differences are notable)
- Discuss implications for population-specific disease risk or selection patterns
- Consider founder effects or population bottlenecks if relevant

## Tissue-Specific Effects
If TISSUE-SPECIFIC EFFECTS category is provided:
- Interpret cCREs (candidate cis-Regulatory Elements) and their tissue-specific annotations
- Analyze CV2F chromatin accessibility scores across tissues
- Interpret PGBoost variant-to-gene prioritization with percentile rankings
- Synthesize SCENT enhancer-gene connections
- Explain which tissues/cell types are most affected and why

## Mechanistic Integration
Synthesize all provided evidence into a coherent biological narrative:
- Build mechanistic hypothesis from the available functional categories
- Explain how molecular changes could lead to phenotypic effects
- Identify concordance or conflicts between evidence types
- Explicitly state data limitations - do not speculate beyond provided data

## Key Takeaways
3-4 concise bullet points:
- Most likely biological impact
- Clinical/research relevance and confidence level
- Critical supporting evidence
- Suggested follow-up (functional validation, segregation, expanded phenotyping)

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
