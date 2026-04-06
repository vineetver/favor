"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@infra/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Field {
  name: string;
  type: string;
  description: string;
  isNew?: boolean;
}

interface Category {
  name: string;
  description: string;
  fields: Field[];
}

/* ------------------------------------------------------------------ */
/*  Annotation data — verified against actual parquet schema           */
/*  s3://favor-hg38/stage16/v2/chromosome=1/sorted.parquet             */
/* ------------------------------------------------------------------ */

const categories: Category[] = [
  {
    name: "Basic",
    description: "Core variant identification fields.",
    fields: [
      { name: "variant_vcf", type: "string", description: "Unique variant identifier in chr-pos-ref-alt format" },
      { name: "dbsnp.rsid", type: "string", description: "rsID of the variant (if exists)" },
      { name: "dbsnp.rsid_all", type: "string[]", description: "All rsIDs associated with this position/allele" },
      { name: "chromosome", type: "bigint", description: "Chromosome number" },
      { name: "position", type: "int", description: "1-based genomic position (GRCh38)" },
      { name: "ref_vcf / alt_vcf", type: "string", description: "Reference and alternate alleles (VCF format)" },
      { name: "ref_annovar / alt_annovar", type: "string", description: "Reference and alternate alleles (ANNOVAR format)" },
    ],
  },
  {
    name: "ClinVar",
    description: "Clinical variant classifications and disease associations.",
    fields: [
      { name: "clinvar.clnsig", type: "string[]", description: "Clinical significance for this variant (e.g. Pathogenic, Benign)" },
      { name: "clinvar.clnsigincl", type: "struct[]", description: "Clinical significance for a haplotype or genotype that includes this variant, reported as VariationID:classification pairs" },
      { name: "clinvar.clndn", type: "string[]", description: "ClinVar preferred disease name for the concept specified by disease identifiers" },
      { name: "clinvar.clndnincl", type: "string[]", description: "Disease name for included variant" },
      { name: "clinvar.clnrevstat", type: "string", description: "ClinVar review status (star rating)" },
      { name: "clinvar.origin", type: "uint16", description: "Allele origin code: 0=unknown, 1=germline, 2=somatic, 4=inherited, 8=paternal, 16=maternal, 32=de-novo, 64=biparental, 128=uniparental" },
      { name: "clinvar.origin_decoded", type: "string[]", description: "Human-readable allele origin labels" },
      { name: "clinvar.clndisdb", type: "struct[]", description: "Disease database name and identifier pairs (e.g. OMIM:NNNNNN)" },
      { name: "clinvar.geneinfo", type: "struct[]", description: "Gene symbol and NCBI gene ID pairs" },
      { name: "clinvar.gene", type: "string", description: "Primary gene symbol" },
    ],
  },
  {
    name: "Variant Category",
    description: "Gene impact predictions from three transcript definition systems, plus regulatory element overlaps.",
    fields: [
      { name: "gencode.region_type", type: "string", description: "Whether variant falls in exonic, intronic, intergenic, etc. region using GENCODE gene definitions" },
      { name: "gencode.genes", type: "string[]", description: "Impacted gene names (or nearest genes if intergenic)" },
      { name: "gencode.consequence", type: "string", description: "Predicted consequence (synonymous, missense, frameshift, etc.)" },
      { name: "gencode.transcripts", type: "struct[]", description: "Per-transcript detail: gene, transcript_id, location, hgvsc, hgvsp" },
      { name: "ucsc.region_type", type: "string", description: "Region type using UCSC gene definitions" },
      { name: "ucsc.exonic_details", type: "struct[]", description: "Exonic impact detail: transcript_id, location, hgvsc, hgvsp" },
      { name: "refseq.region_type", type: "string", description: "Region type using RefSeq gene definitions" },
      { name: "refseq.exonic_details", type: "struct[]", description: "Exonic impact detail: gene, transcript_id, location, hgvsc, hgvsp" },
      { name: "cage.cage_promoter", type: "string", description: "CAGE-defined promoter site from FANTOM5" },
      { name: "cage.cage_enhancer", type: "string", description: "CAGE-defined permissive enhancer site from FANTOM5" },
      { name: "cage.cage_tc", type: "string", description: "CAGE tag cluster" },
      { name: "genehancer.id", type: "string", description: "GeneHancer predicted enhancer ID" },
      { name: "genehancer.feature_score", type: "float", description: "GeneHancer confidence score" },
      { name: "genehancer.targets", type: "struct[]", description: "Target genes with enhancer-gene link scores" },
      { name: "super_enhancer_ids", type: "string[]", description: "Predicted super-enhancer IDs (cell-type-specific)" },
    ],
  },
  {
    name: "COSMIC",
    description: "Somatic mutation data from the Catalogue of Somatic Mutations in Cancer.",
    fields: [
      { name: "cosmic.gene", type: "string", description: "COSMIC gene symbol" },
      { name: "cosmic.transcript", type: "string", description: "Affected transcript" },
      { name: "cosmic.cds / .aa", type: "string", description: "CDS and amino acid change notation" },
      { name: "cosmic.hgvsc / .hgvsp / .hgvsg", type: "string", description: "HGVS coding, protein, and genomic notation" },
      { name: "cosmic.sample_count", type: "int", description: "Number of COSMIC samples with this mutation" },
      { name: "cosmic.is_canonical", type: "bool", description: "Whether this is the canonical transcript" },
      { name: "cosmic.tier", type: "string", description: "COSMIC variant classification tier" },
      { name: "cosmic.so_term", type: "string", description: "Sequence Ontology term" },
    ],
  },
  {
    name: "Allele Frequencies",
    description: "Population-level allele frequencies from gnomAD, TOPMed BRAVO, and 1000 Genomes.",
    fields: [
      { name: "bravo.bravo_af", type: "float", description: "TOPMed BRAVO genome allele frequency (132K whole genomes)" },
      { name: "bravo.bravo_ac / .bravo_an", type: "int", description: "BRAVO allele count and total allele number" },
      { name: "bravo.filter_status", type: "string", description: "BRAVO filter status" },
      { name: "gnomad_genome.af", type: "float", description: "gnomAD genome allele frequency (all samples)" },
      { name: "gnomad_genome.ac / .an / .nhomalt", type: "int", description: "Allele count, total allele number, homozygous alt count" },
      { name: "gnomad_genome.populations", type: "struct", description: "Per-population AF for 9 ancestry groups: AFR, AMI, AMR, ASJ, EAS, FIN, MID, NFE, SAS. Each with total, XX, and XY frequencies" },
      { name: "gnomad_genome.af_xx / .af_xy", type: "float", description: "Sex-stratified allele frequencies" },
      { name: "gnomad_genome.faf", type: "struct", description: "Filtering allele frequency: faf95_max, faf99_max with ancestry group" },
      { name: "gnomad_genome.quality", type: "struct", description: "Quality metrics: QD, inbreeding coefficient, FS, MQ, SOR" },
      { name: "gnomad_genome.variant_info", type: "struct", description: "allele_type, variant_type, n_alt_alleles" },
      { name: "gnomad_genome.region_flags", type: "struct", description: "Boolean flags: lcr, segdup, non_par" },
      { name: "gnomad_genome.functional", type: "struct", description: "Pre-computed: revel_max, spliceai_ds_max, pangolin_largest_ds" },
      { name: "gnomad_exome.*", type: "struct", description: "Same structure as gnomad_genome for exome data" },
      { name: "tg.tg_all", type: "float", description: "1000 Genomes global allele frequency" },
      { name: "tg.tg_afr / amr / eas / eur / sas", type: "float", description: "1000 Genomes superpopulation frequencies" },
    ],
  },
  {
    name: "Integrative Scores",
    description: "Variant-level deleteriousness and pathogenicity predictions combining multiple evidence sources.",
    fields: [
      { name: "main.cadd.raw", type: "float (+)", description: "CADD raw score. Higher = more deleterious. Range: [-237.102, 22.763]" },
      { name: "main.cadd.phred", type: "float (+)", description: "CADD PHRED-scaled score. Higher = more deleterious. Range: [0, 99]" },
      { name: "linsight", type: "float (+)", description: "LINSIGHT score. Higher = more likely under negative selection. Range: [0.215, 0.995]" },
      { name: "fathmm_xf", type: "float (+)", description: "FATHMM-XF coding and non-coding pathogenicity. Higher = more functional. Range: [0.405, 99.451]" },
      { name: "gpn_msa_score / _phred", type: "float (+)", description: "GPN-MSA: Genomic Pre-trained Network score from multiple sequence alignment", isNew: true },
      { name: "jarvis_score / _phred", type: "float (+)", description: "JARVIS: variant importance and significance reclassifier", isNew: true },
      { name: "remm_score / _phred", type: "float (+)", description: "REMM: Regulatory Mendelian Mutation score for non-coding variants", isNew: true },
      { name: "ncer_percentile", type: "float (+)", description: "NCER: Non-Coding Essential Region percentile", isNew: true },
      { name: "gnomad_constraint_score / gnomad_cst_phred", type: "float", description: "gnomAD regional constraint score (raw + PHRED)", isNew: true },
      { name: "funseq.score", type: "uint8 (+)", description: "FunSeq2: framework to prioritize regulatory mutations from cancer genomes" },
      { name: "funseq.description", type: "string", description: "FunSeq annotation: coding or non-coding region" },
      { name: "aloft.score", type: "float (+)", description: "ALoFT: annotations for putative loss-of-function variants including functional, evolutionary and network features" },
      { name: "aloft.description", type: "string", description: "ALoFT classification: dominant disease-causing, recessive disease-causing, or benign" },
    ],
  },
  {
    name: "Protein Function",
    description: "Predictions for amino acid substitution impact on protein function. Legacy fields in main.protein_predictions, expanded predictions in dbnsfp.",
    fields: [
      { name: "main.protein_predictions.sift_cat", type: "string", description: "SIFT category: tolerated or deleterious" },
      { name: "main.protein_predictions.sift_val", type: "float (-)", description: "SIFT score. 0.0 = deleterious, 1.0 = tolerated. Range: [0, 1], default: 1" },
      { name: "main.protein_predictions.polyphen_cat", type: "string", description: "PolyPhen-2 category: benign, possibly damaging, or probably damaging" },
      { name: "main.protein_predictions.polyphen_val", type: "float (+)", description: "PolyPhen-2 score. Higher = more damaging. Range: [0, 1], default: 0" },
      { name: "main.protein_predictions.grantham", type: "float (+)", description: "Grantham distance: evolutionary distance between amino acids. Higher = more deleterious. Range: [0, 215], default: 0" },
      { name: "alphamissense.max_pathogenicity", type: "float (+)", description: "AlphaMissense: max calibrated pathogenicity score (0-1). Likely benign < 0.34, likely pathogenic > 0.564", isNew: true },
      { name: "alphamissense.predictions[]", type: "struct[]", description: "Per-transcript predictions: uniprot_id, transcript_id, protein_variant, pathogenicity, class", isNew: true },
      { name: "spliceai.max_ds", type: "float (+)", description: "SpliceAI: max delta score across all splice effects", isNew: true },
      { name: "spliceai.ds_ag / ds_al / ds_dg / ds_dl", type: "float", description: "SpliceAI delta scores: acceptor gain/loss, donor gain/loss", isNew: true },
      { name: "spliceai.dp_ag / dp_al / dp_dg / dp_dl", type: "int16", description: "SpliceAI delta positions: distance to affected splice site", isNew: true },
      { name: "spliceai.symbol", type: "string", description: "Gene symbol for SpliceAI prediction", isNew: true },
      { name: "mavedb.gene_name", type: "string", description: "MaveDB gene name", isNew: true },
      { name: "mavedb.hgvs_pro", type: "string", description: "MaveDB HGVS protein notation", isNew: true },
      { name: "mavedb.scoresets[]", type: "struct[]", description: "MaveDB experimental scores: score, scoreset_urn", isNew: true },
    ],
  },
  {
    name: "dbNSFP",
    description: "Comprehensive missense variant predictions from the dbNSFP database. All fields are under the dbnsfp struct.",
    fields: [
      { name: "dbnsfp.revel", type: "float (+)", description: "REVEL: ensemble method for predicting pathogenicity of missense variants", isNew: true },
      { name: "dbnsfp.bayesdel.score / .pred", type: "float / string", description: "BayesDel: deleteriousness meta-predictor with score and prediction", isNew: true },
      { name: "dbnsfp.clinpred.score / .pred", type: "float / string", description: "ClinPred: clinical pathogenicity predictor", isNew: true },
      { name: "dbnsfp.mpc", type: "float (+)", description: "MPC: missense badness, PolyPhen-2, and constraint score", isNew: true },
      { name: "dbnsfp.esm1b.score / .pred", type: "float / string", description: "ESM-1b: protein language model variant effect prediction", isNew: true },
      { name: "dbnsfp.meta_rnn.score / .pred", type: "float / string", description: "MetaRNN: ensemble meta-predictor using recurrent neural networks", isNew: true },
      { name: "dbnsfp.meta_lr.score / .pred", type: "float / string", description: "MetaLR: ensemble meta-predictor using logistic regression", isNew: true },
      { name: "dbnsfp.m_cap.score / .pred", type: "float / string", description: "M-CAP: Mendelian Clinically Applicable Pathogenicity predictor", isNew: true },
      { name: "dbnsfp.vest4", type: "float (+)", description: "VEST4: Variant Effect Scoring Tool", isNew: true },
      { name: "dbnsfp.primate_ai.score / .pred", type: "float / string", description: "PrimateAI: deep learning pathogenicity using primate data", isNew: true },
      { name: "dbnsfp.deogen2.score / .pred", type: "float / string", description: "DEOGEN2: variant deleteriousness predictor", isNew: true },
      { name: "dbnsfp.mutpred2.score / .pred", type: "float / string", description: "MutPred2: classification of amino acid substitutions", isNew: true },
      { name: "dbnsfp.mvp", type: "float (+)", description: "MVP: Missense Variant Pathogenicity prediction", isNew: true },
      { name: "dbnsfp.gmvp", type: "float (+)", description: "gMVP: gene-level MVP", isNew: true },
      { name: "dbnsfp.sift4g.score / .pred", type: "float / string", description: "SIFT4G: updated SIFT predictions", isNew: true },
      { name: "dbnsfp.provean.score / .pred", type: "float / string", description: "PROVEAN: protein variant effect analysis", isNew: true },
      { name: "dbnsfp.phactboost", type: "float (+)", description: "PhACTboost: pathogenicity score using phylogenetic analysis", isNew: true },
      { name: "dbnsfp.mutformer", type: "float (+)", description: "MutFormer: transformer-based mutation effect prediction", isNew: true },
      { name: "dbnsfp.mutscore", type: "float (+)", description: "MutScore: mutation scoring", isNew: true },
      { name: "dbnsfp.varity_r / .varity_er", type: "float (+)", description: "VARITY: variant effect prediction (regular and extended)", isNew: true },
      { name: "dbnsfp.list_s2.score / .pred", type: "float / string", description: "LIST-S2: pathogenicity prediction using multiple sequence alignments", isNew: true },
      { name: "dbnsfp.polyphen2_hdiv", type: "float (+)", description: "PolyPhen-2 HumDiv: Mendelian disease variants vs. divergence from close homologs", isNew: true },
      { name: "dbnsfp.polyphen2_hvar", type: "float (+)", description: "PolyPhen-2 HumVar: disease variants vs. common polymorphisms", isNew: true },
      { name: "dbnsfp.mutation_taster", type: "float (+)", description: "MutationTaster: disease-causing potential via in silico tests. Range: [0, 1]", isNew: true },
      { name: "dbnsfp.mutation_assessor", type: "float (+)", description: "MutationAssessor: functional impact of amino-acid substitutions. Range: [-5.135, 6.490]", isNew: true },
      { name: "dbnsfp.metasvm_pred", type: "string", description: "MetaSVM prediction label", isNew: true },
      { name: "dbnsfp.aloft.pred / .confidence", type: "string", description: "ALoFT loss-of-function prediction and confidence from dbNSFP", isNew: true },
      { name: "dbnsfp.interpro_domain", type: "string", description: "InterPro protein domain annotation", isNew: true },
    ],
  },
  {
    name: "Non-coding Pathogenicity",
    description: "Specialized scores for functional impact of non-coding variants.",
    fields: [
      { name: "macie.conserved", type: "raw + phred", description: "MACIE conserved classifier: non-coding pathogenicity for conserved sites", isNew: true },
      { name: "macie.regulatory", type: "raw + phred", description: "MACIE regulatory classifier: non-coding pathogenicity for regulatory sites", isNew: true },
      { name: "macie.anyclass", type: "raw + phred", description: "MACIE combined classifier", isNew: true },
      { name: "macie.region", type: "string", description: "MACIE region classification", isNew: true },
      { name: "cv2f.liver / .baseline / .mpra / .lvs / .combined", type: "raw + phred", description: "CV2F: tissue-specific functional scores from MPRA and liver variant assays", isNew: true },
      { name: "ncboost.score / .percentile", type: "float (+)", description: "NCBoost: non-coding variant pathogenicity with gene assignment", isNew: true },
      { name: "ncboost.region / .gene", type: "string", description: "NCBoost region classification and linked gene", isNew: true },
      { name: "pgboost[].score", type: "float (+)", description: "pgBoost: probabilistic SNP-gene link score from gradient boosting model trained on multiome fine-mapping data", isNew: true },
      { name: "pgboost[].percentile", type: "float (+)", description: "pgBoost percentile ranking across all SNP-gene pairs", isNew: true },
      { name: "pgboost[].gene", type: "string", description: "Linked gene symbol", isNew: true },
    ],
  },
  {
    name: "Conservation",
    description: "Cross-species evolutionary conservation at three phylogenetic depths.",
    fields: [
      { name: "main.conservation.priphcons", type: "float (+)", description: "Primate PhastCons (excl. human). Higher = more conserved. Range: [0, 0.999], default: 0" },
      { name: "main.conservation.mamphcons", type: "float (+)", description: "Mammalian PhastCons (excl. human). Range: [0, 1], default: 0" },
      { name: "main.conservation.verphcons", type: "float (+)", description: "Vertebrate PhastCons (excl. human). Range: [0, 1], default: 0" },
      { name: "main.conservation.priphylop", type: "float (+)", description: "Primate PhyloP (excl. human). Positive = conserved (slower evolution), negative = accelerated. Range: [-10.761, 0.595]" },
      { name: "main.conservation.mamphylop", type: "float (+)", description: "Mammalian PhyloP. Range: [-20, 4.494]" },
      { name: "main.conservation.verphylop", type: "float (+)", description: "Vertebrate PhyloP. Range: [-20, 11.295]" },
      { name: "main.gerp.n", type: "float (+)", description: "GERP++ neutral evolution rate. Higher = more conserved. Range: [0, 19.8], default: 3.0" },
      { name: "main.gerp.rs", type: "float (+)", description: "GERP++ rejected substitutions. Positive = constraint, negative = acceleration. Range: [-39.5, 19.8], default: -0.2" },
      { name: "main.gerp.rs_pval", type: "float", description: "GERP RS p-value" },
      { name: "main.gerp.s", type: "float", description: "GERP observed substitution rate" },
      { name: "main.conservation.bstatistic", type: "float (+)", description: "Background selection score. 0 = near complete diversity removal by selection. 1000 = little selection effect. Range: [0, 1000], default: 800" },
    ],
  },
  {
    name: "Epigenetics (ENCODE)",
    description: "Histone modification and chromatin accessibility signals. Each has raw and PHRED values. Higher raw values indicate increased signal.",
    fields: [
      { name: "main.encode.h3k4me1", type: "raw + phred (+)", description: "H3K4me1: enhancer mark. Max over 13 cell lines. Range: [0.01, 227.81], default: 0.37" },
      { name: "main.encode.h3k4me2", type: "raw + phred (+)", description: "H3K4me2: active regulatory mark. Max over 14 cell lines. Range: [0.01, 774.99], default: 0.37" },
      { name: "main.encode.h3k4me3", type: "raw + phred (+)", description: "H3K4me3: active promoter mark. Max over 14 cell lines. Range: [0.01, 1093.75], default: 0.38" },
      { name: "main.encode.h3k9ac", type: "raw + phred (+)", description: "H3K9ac: active chromatin mark. Max over 13 cell lines. Range: [0.01, 1340.42], default: 0.41" },
      { name: "main.encode.h3k27ac", type: "raw + phred (+)", description: "H3K27ac: active enhancer/promoter mark. Max over 14 cell lines. Range: [0.01, 1442.69], default: 0.36" },
      { name: "main.encode.h4k20me1", type: "raw + phred (+)", description: "H4K20me1: transcription-associated mark. Max over 11 cell lines. Range: [0.01, 226.64], default: 0.47" },
      { name: "main.encode.h2afz", type: "raw + phred (+)", description: "H2A.Z: nucleosome remodeling, promoter-proximal. Max over 13 cell lines. Range: [0.02, 468.98], default: 0.42" },
      { name: "main.encode.h3k9me3", type: "raw + phred (+)", description: "H3K9me3: heterochromatin/repressive mark. Max over 14 cell lines. Range: [0.01, 226.64], default: 0.38" },
      { name: "main.encode.h3k27me3", type: "raw + phred (+)", description: "H3K27me3: Polycomb repression mark. Max over 14 cell lines. Range: [0.01, 193.38], default: 0.47" },
      { name: "main.encode.h3k36me3", type: "raw + phred (+)", description: "H3K36me3: transcription elongation mark. Max over 10 cell lines. Range: [0.02, 246.88], default: 0.39" },
      { name: "main.encode.h3k79me2", type: "raw + phred (+)", description: "H3K79me2: active transcription mark. Max over 13 cell lines. Range: [0.02, 553.06], default: 0.34" },
      { name: "main.encode.dnase", type: "raw + phred (+)", description: "DNase hypersensitivity: open chromatin. Max over 12 cell lines. Range: [0, 118672], default: 0" },
      { name: "main.encode.total_rna", type: "raw + phred (+)", description: "Total RNA-seq: transcriptional activity. Max over 10 cell lines. Range: [0, 385096], default: 0" },
      { name: "main.sequence_context.gc / .gc_phred", type: "float (+)", description: "Percent GC in +/- 75bp window. Range: [0, 1], default: 0.42" },
      { name: "main.sequence_context.cpg / .cpg_phred", type: "float (+)", description: "Percent CpG in +/- 75bp window. Range: [0, 0.604], default: 0.02" },
    ],
  },
  {
    name: "Transcription Factors",
    description: "Transcription factor binding evidence from ReMap.",
    fields: [
      { name: "main.remap.overlap_tf", type: "float (+)", description: "Number of different transcription factors binding. Range: [1, 350]" },
      { name: "main.remap.overlap_cl", type: "float (+)", description: "Number of different TF-cell line combinations binding. Range: [1, 1068]" },
    ],
  },
  {
    name: "Chromatin States",
    description: "Number of 48 cell types in each of 25 ChromHMM states (Ernst et al., 2015). Default: 1.92.",
    fields: [
      { name: "main.chromhmm.e1", type: "float", description: "E1: poised" },
      { name: "main.chromhmm.e2", type: "float", description: "E2: repressed" },
      { name: "main.chromhmm.e3", type: "float", description: "E3: dead" },
      { name: "main.chromhmm.e4", type: "float", description: "E4: dead" },
      { name: "main.chromhmm.e5", type: "float", description: "E5: repressed" },
      { name: "main.chromhmm.e6", type: "float", description: "E6: repressed" },
      { name: "main.chromhmm.e7", type: "float", description: "E7: weak" },
      { name: "main.chromhmm.e8", type: "float", description: "E8: gene" },
      { name: "main.chromhmm.e9", type: "float", description: "E9: gene" },
      { name: "main.chromhmm.e10", type: "float", description: "E10: gene" },
      { name: "main.chromhmm.e11", type: "float", description: "E11: gene" },
      { name: "main.chromhmm.e12", type: "float", description: "E12: distal enhancer" },
      { name: "main.chromhmm.e13", type: "float", description: "E13: distal enhancer" },
      { name: "main.chromhmm.e14", type: "float", description: "E14: distal enhancer" },
      { name: "main.chromhmm.e15", type: "float", description: "E15: weak" },
      { name: "main.chromhmm.e16", type: "float", description: "E16: TSS" },
      { name: "main.chromhmm.e17", type: "float", description: "E17: proximal" },
      { name: "main.chromhmm.e18", type: "float", description: "E18: proximal" },
      { name: "main.chromhmm.e19", type: "float", description: "E19: TSS" },
      { name: "main.chromhmm.e20", type: "float", description: "E20: poised" },
      { name: "main.chromhmm.e21", type: "float", description: "E21: dead" },
      { name: "main.chromhmm.e22", type: "float", description: "E22: repressed" },
      { name: "main.chromhmm.e23", type: "float", description: "E23: weak" },
      { name: "main.chromhmm.e24", type: "float", description: "E24: distal enhancer" },
      { name: "main.chromhmm.e25", type: "float", description: "E25: distal enhancer" },
    ],
  },
  {
    name: "Local Nucleotide Diversity",
    description: "Regional measures of genetic variation and recombination.",
    fields: [
      { name: "recombination_rate", type: "float (+)", description: "Recombination rate: probability of recombination in this region. Range: [0, 54.96], default: 0" },
      { name: "nucdiv", type: "float (+)", description: "Nuclear diversity: probability of regional diversification. Range: [0.05, 60.25], default: 0" },
    ],
  },
  {
    name: "Mutation Density",
    description: "Counts of common (MAF > 0.05), rare (MAF < 0.05), and singleton BRAVO SNVs in windows around the site.",
    fields: [
      { name: "main.variant_density.freq_100bp", type: "float (+)", description: "Common variants in 100bp window. Range: [0, 14]" },
      { name: "main.variant_density.rare_100bp", type: "float (+)", description: "Rare variants in 100bp window. Range: [0, 31]" },
      { name: "main.variant_density.sngl_100bp", type: "float (+)", description: "Singletons in 100bp window. Range: [0, 99]" },
      { name: "main.variant_density.freq_1000bp", type: "float (+)", description: "Common variants in 1kb window. Range: [0, 73]" },
      { name: "main.variant_density.rare_1000bp", type: "float (+)", description: "Rare variants in 1kb window. Range: [0, 74]" },
      { name: "main.variant_density.sngl_1000bp", type: "float (+)", description: "Singletons in 1kb window. Range: [0, 658]" },
      { name: "main.variant_density.freq_10000bp", type: "float (+)", description: "Common variants in 10kb window. Range: [0, 443]" },
      { name: "main.variant_density.rare_10000bp", type: "float (+)", description: "Rare variants in 10kb window. Range: [0, 355]" },
      { name: "main.variant_density.sngl_10000bp", type: "float (+)", description: "Singletons in 10kb window. Range: [0, 4750]" },
    ],
  },
  {
    name: "Mappability",
    description: "Sequence uniqueness at four k-mer lengths. Lower mappability = less reliable estimates and more spurious mapping.",
    fields: [
      { name: "mappability.k24.umap / .bismap", type: "float (+)", description: "24-mer uniqueness. Umap = unconverted genome, Bismap = bisulfite-converted. Range: [0, 1]" },
      { name: "mappability.k36.umap / .bismap", type: "float (+)", description: "36-mer uniqueness. Range: [0, 1]" },
      { name: "mappability.k50.umap / .bismap", type: "float (+)", description: "50-mer uniqueness. Range: [0, 1]" },
      { name: "mappability.k100.umap / .bismap", type: "float (+)", description: "100-mer uniqueness. Range: [0, 1]" },
    ],
  },
  {
    name: "Proximity",
    description: "Distance to the nearest gene boundaries.",
    fields: [
      { name: "main.distance.min_dist_tss", type: "float (-)", description: "Distance to closest Transcription Start Site. Lower = closer to TSS. Range: [1, 3604063], default: 1e7" },
      { name: "main.distance.min_dist_tse", type: "float (-)", description: "Distance to closest Transcription End Site. Lower = closer to TES. Range: [1, 3608885], default: 1e7" },
    ],
  },
  {
    name: "Mutation Rate",
    description: "Context-dependent mutation rate estimates.",
    fields: [
      { name: "mutation_rate.mr", type: "float (+)", description: "Roulette mutation rate estimate" },
      { name: "mutation_rate.ar", type: "float", description: "Ancestral rate" },
      { name: "mutation_rate.mg", type: "float (+)", description: "gnomAD mutation rate estimate (Karczewski et al. 2020)" },
      { name: "mutation_rate.mc", type: "float (+)", description: "Carlson mutation rate estimate (Carlson et al. 2018)" },
      { name: "mutation_rate.pn", type: "string", description: "Pentanucleotide context" },
      { name: "mutation_rate.filter", type: "string", description: "Quality flags: Low (gnomAD metrics), SFS_bump (abnormal SFS), TFBS (ChIP-seq overlap)" },
    ],
  },
  {
    name: "cCREs (ENCODE)",
    description: "Candidate cis-regulatory elements from the ENCODE Registry.",
    fields: [
      { name: "ccre.ids", type: "string", description: "cCRE IDs" },
      { name: "ccre.accessions", type: "string", description: "cCRE accession numbers" },
      { name: "ccre.annotations", type: "string", description: "cCRE types: PLS (Promoter-like), pELS (Proximal enhancer-like), dELS (Distal enhancer-like), CA-CTCF, CA-H3K4me3, CA-TF, CA (Chromatin Accessible Only), TF Only, CTCF-Bound" },
      { name: "ccre.count", type: "uint8", description: "Number of overlapping cCREs" },
    ],
  },
  {
    name: "Annotation Principal Components",
    description: "Composite PHRED-scaled scores. Each aPC is the first PC of standardized individual annotations in its category. Higher = stronger signal.",
    fields: [
      { name: "apc.protein_function_v3", type: "float (+)", description: "aPC-Protein-Function. From: SIFT, PolyPhen, Grantham, MutationTaster, MutationAssessor. Range: [2.970, 97.690]" },
      { name: "apc.conservation_v2", type: "float (+)", description: "aPC-Conservation. From: GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP. Range: [0, 99.451]" },
      { name: "apc.epigenetics", type: "float (+)", description: "aPC-Epigenetics. From: all 13 ENCODE signals. Range: [0, 99.451]" },
      { name: "apc.epigenetics_active", type: "float (+)", description: "aPC-Epigenetics-Active. From: H3K4me1/2/3, H3K9ac, H3K27ac, H4K20me1, H2AFZ. Range: [0, 99.451]" },
      { name: "apc.epigenetics_repressed", type: "float (+)", description: "aPC-Epigenetics-Repressed. From: H3K9me3, H3K27me3. Range: [0, 99.451]" },
      { name: "apc.epigenetics_transcription", type: "float (+)", description: "aPC-Epigenetics-Transcription. From: H3K36me3, H3K79me2. Range: [0, 99.451]" },
      { name: "apc.local_nucleotide_diversity_v3", type: "float", description: "aPC-Local-Nucleotide-Diversity. From: bStatistic, RecombinationRate, NuclearDiversity. Range: [0, 99.451]" },
      { name: "apc.mutation_density", type: "float", description: "aPC-Mutation-Density. From: all 9 variant density fields. Range: [0, 99.451]" },
      { name: "apc.transcription_factor", type: "float (+)", description: "aPC-Transcription-Factor. From: RemapOverlapTF, RemapOverlapCL. Range: [1.185, 99.451]" },
      { name: "apc.mappability", type: "float (+)", description: "aPC-Mappability. From: all 8 umap/bismap fields. Range: [0.185, 99.451]" },
      { name: "apc.proximity_to_coding_v2", type: "float (+)", description: "aPC-Proximity-to-Coding" },
      { name: "apc.proximity_to_tsstes", type: "float (+)", description: "aPC-Proximity-to-TSS-TES. From: minDistTSS, minDistTSE. Range: [0, 99.451]" },
      { name: "apc.micro_rna", type: "float (+)", description: "aPC-microRNA" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Expandable category component                                      */
/* ------------------------------------------------------------------ */

function CategorySection({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const preview = category.fields.slice(0, 3);
  const hasMore = category.fields.length > 3;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {category.name}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {category.fields.length} field{category.fields.length > 1 ? "s" : ""}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {category.description}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground shrink-0 ml-4 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <div className={cn("border-t border-border", !open && "hidden")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2 px-4 font-semibold text-foreground text-xs">Field</th>
              <th className="text-left py-2 px-4 font-semibold text-foreground text-xs">Type</th>
              <th className="text-left py-2 px-4 font-semibold text-foreground text-xs">Description</th>
            </tr>
          </thead>
          <tbody>
            {(open ? category.fields : preview).map((field) => (
              <tr
                key={field.name}
                className="border-b border-border last:border-0"
              >
                <td className="py-2 px-4 font-mono text-xs text-foreground whitespace-nowrap align-top">
                  {field.name}
                  {field.isNew && (
                    <span className="ml-1.5 text-[10px] font-sans font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      NEW
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 text-xs text-muted-foreground whitespace-nowrap align-top">
                  {field.type}
                </td>
                <td className="py-2 px-4 text-xs text-muted-foreground leading-relaxed">
                  {field.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!open && hasMore && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full py-2 text-xs text-primary hover:underline"
          >
            Show all {category.fields.length} fields
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported catalog                                                   */
/* ------------------------------------------------------------------ */

export function AnnotationCatalog() {
  return (
    <div className="mt-4 space-y-3">
      {categories.map((cat) => (
        <CategorySection key={cat.name} category={cat} />
      ))}
    </div>
  );
}
