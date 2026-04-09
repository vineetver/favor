import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Prose, Callout } from "../_components/doc-primitives";
import { DocsToc, type TocItem } from "../_components/docs-toc";
import { AnnotationCatalog } from "./annotation-catalog";
import { CorrelationSection } from "./correlation-section";

/* ------------------------------------------------------------------ */
/*  Table of contents                                                  */
/* ------------------------------------------------------------------ */

const TOC_ITEMS: TocItem[] = [
  { id: "variant-set", label: "Variant set" },
  { id: "gene-based-annotation", label: "Gene-based annotation" },
  { id: "apcs", label: "Annotation PCs" },
  { id: "apc-calculation", label: "How aPCs are calculated" },
  { id: "correlation", label: "Annotation correlation" },
  { id: "annotation-catalog", label: "Annotation catalog" },
  { id: "tissue-data", label: "Tissue & cell-type data" },
  { id: "data-sources", label: "Data sources" },
];

export const metadata: Metadata = {
  title: "Data & Annotations | FAVOR Docs",
  description:
    "Detailed descriptions of functional annotations and annotation principal components in the FAVOR database. Covers 8.9 billion variants with annotations across 13 major categories.",
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DataAnnotationsPage() {
  return (
    <div>
      <DocsToc items={TOC_ITEMS} />

      {/* ── Hero ── */}
      <Prose>
        <h1>Data & Annotations</h1>
        <p>
          Detailed descriptions of functional annotations and annotation
          principal components (aPCs) in the FAVOR database. For numeric
          annotations marked <strong>(+)</strong>, higher values indicate increased
          functionality. For <strong>(-)</strong>, lower values indicate increased
          functionality.
        </p>
      </Prose>

      {/* ── Variant set ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="variant-set">Variant set</h2>
          <p>
            The current FAVOR database contains a total
            of <strong>8,892,915,237</strong> variants: all
            possible <strong>8,812,917,339 SNVs</strong> and{" "}
            <strong>79,997,898 indels</strong>.
          </p>
        </Prose>
      </div>

      {/* ── Gene-based annotation figure ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="gene-based-annotation">Gene-based annotation</h2>
        </Prose>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold text-foreground mb-6">
          Graphical illustration of gene-based annotation
        </p>
        <div className="overflow-x-auto">
          <Image
            src="/docs/gene-annotation.png"
            alt="Graphical illustration of gene-based annotation showing exonic, intronic, intergenic, UTR, splicing, upstream, and downstream regions"
            width={900}
            height={300}
            className="w-full max-w-3xl"
          />
        </div>
        <div className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-prose space-y-2">
          <p>
            <strong>Exonic</strong> refers only to the coding exonic portion, not the UTR
            portion. <strong>UTR5</strong> and <strong>UTR3</strong> are reserved
            for UTR annotations. If a variant is in both 5&apos; UTR and 3&apos; UTR
            (for two different genes), &quot;UTR5,UTR3&quot; is printed.
          </p>
          <p>
            <strong>Splicing</strong> is defined as a variant within 2bp of an
            exon/intron boundary. <strong>Upstream</strong> and{" "}
            <strong>downstream</strong> are defined as within 1kb of the
            transcription start site or transcription end site, respectively,
            taking the strand of the mRNA into account.
          </p>
          <p>
            If a variant overlaps a <strong>CAGE promoter/enhancer</strong> or{" "}
            <strong>GeneHancer</strong> region, it will also be annotated accordingly.
          </p>
        </div>
      </div>

      {/* ── Annotation Principal Components ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="apcs">Annotation principal components (aPCs)</h2>
          <p>
            It is often helpful to have a single metric summarizing multiple similar
            annotations measuring the same underlying biological function. Annotation
            PCs (aPCs) are principal component summaries of the multi-faceted
            functional annotation data in FAVOR. Unlike ancestral PCs that are
            subject-specific and calculated using genotypes across the genome,
            annotation PCs are variant-specific and calculated using functional
            annotations for individual variants. Different blocks of individual
            functional annotations are captured by different annotation PCs.
          </p>
          <p>
            Currently aPCs are calculated for all PASS SNVs in the variant set.
          </p>
        </Prose>
      </div>

      {/* aPC derivation table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">aPC</th>
              <th className="text-left py-2.5 font-semibold text-foreground">Derived from</th>
            </tr>
          </thead>
          <tbody>
            {[
              { apc: "aPC-Protein-Function", from: "SIFT, PolyPhen-2, Grantham, Polyphen2 HDIV/HVAR, MutationTaster, MutationAssessor" },
              { apc: "aPC-Conservation", from: "GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP" },
              { apc: "aPC-Epigenetics-Active", from: "H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K27ac, H4K20me1, H2AFZ" },
              { apc: "aPC-Epigenetics-Repressed", from: "H3K9me3, H3K27me3" },
              { apc: "aPC-Epigenetics-Transcription", from: "H3K36me3, H3K79me2" },
              { apc: "aPC-Local-Nucleotide-Diversity", from: "bStatistic, RecombinationRate, NuclearDiversity" },
              { apc: "aPC-Mutation-Density", from: "Common100bp, Rare100bp, Sngl100bp, Common1000bp, Rare1000bp, Sngl1000bp, Common10000bp, Rare10000bp, Sngl10000bp" },
              { apc: "aPC-Transcription-Factor", from: "RemapOverlapTF, RemapOverlapCL" },
              { apc: "aPC-Mappability", from: "umap_k100, bismap_k100, umap_k50, bismap_k50, umap_k36, bismap_k36, umap_k24, bismap_k24" },
              { apc: "aPC-Proximity-to-Coding", from: "Distance to nearest coding region" },
              { apc: "aPC-Proximity-to-TSS-TES", from: "minDistTSS, minDistTSE" },
              { apc: "aPC-microRNA", from: "microRNA target site annotation" },
            ].map((row) => (
              <tr key={row.apc} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-mono text-xs text-foreground whitespace-nowrap">{row.apc}</td>
                <td className="py-3 text-muted-foreground">{row.from}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── aPC calculation steps ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="apc-calculation">How aPCs are calculated</h2>
        </Prose>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Step 0: Pre-processing</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Variants with missing individual scores are imputed with their default values.
            Particular scores are transformed so that (1) a higher value always indicates
            increased functionality, and (2) the distribution becomes less skewed:
          </p>
          <table className="mt-3 text-sm font-mono">
            <tbody>
              <tr><td className="pr-4 py-1 text-foreground whitespace-nowrap">SIFT*</td><td className="py-1 text-muted-foreground">=</td><td className="pl-2 py-1 text-foreground">1 &minus; SIFTval</td></tr>
              <tr><td className="pr-4 py-1 text-foreground whitespace-nowrap">minDistTSS*</td><td className="py-1 text-muted-foreground">=</td><td className="pl-2 py-1 text-foreground">&minus;log(minDistTSS)</td></tr>
              <tr><td className="pr-4 py-1 text-foreground whitespace-nowrap">minDistTSE*</td><td className="py-1 text-muted-foreground">=</td><td className="pl-2 py-1 text-foreground">&minus;log(minDistTSE)</td></tr>
              <tr>
                <td className="pr-4 py-1 text-foreground whitespace-nowrap">Encode<sub className="text-muted-foreground">a</sub>*</td>
                <td className="py-1 text-muted-foreground">=</td>
                <td className="pl-2 py-1 text-foreground">log(Encode<sub className="text-muted-foreground">a</sub>)</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-2">
            where <em>a</em> &isin; {"{"}H3K4me1, H3K4me2, H3K4me3, H3K9ac, H3K9me3, H3K27ac, H3K27me3, H3K36me3, H3K79me2, H4K20me1, H2AFZ{"}"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Step 1: Grouping</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Individual annotation scores are grouped into major functional blocks based
            on a priori knowledge. Each block captures a specific aspect of variant
            biological function: protein function, conservation, epigenetics, local
            nucleotide diversity, proximity to coding, mutation density, transcription
            factors, mappability, and proximity to TSS/TES.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Step 2: Standardization</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            For each annotation block <em>k</em>, all pre-processed individual scores within the
            block are centered and standardized to obtain the standardized annotation score
            matrix <span className="font-mono font-semibold text-foreground">X&#x0302;<sub>k</sub></span> (each column has mean 0 and variance 1).
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Step 3: First principal component</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            For each block <em>k</em>, the aPC raw score is the first PC from the standardized scores:
          </p>
          <div className="mt-3 mb-2 bg-muted rounded-lg px-5 py-3 text-center">
            <span className="font-mono text-sm text-foreground">
              aPC.raw<sub>k</sub>
              <span className="mx-2 text-muted-foreground">=</span>
              X&#x0302;<sub>k</sub>
              <span className="mx-1">&middot;</span>
              <strong>e</strong><sub>k,1</sub>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            where <span className="font-mono font-semibold text-foreground">e<sub>k,1</sub></span> is the eigenvector
            corresponding to the largest eigenvalue
            of <span className="font-mono text-foreground">X&#x0302;<sub>k</sub><sup>T</sup> X&#x0302;<sub>k</sub></span>.
            The sign is flipped if necessary so that aPC.raw<sub>k</sub> is positively correlated
            with the individual scores in that block.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Step 4: PHRED scaling</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            The raw scores are transformed into PHRED-scaled scores for each variant across the genome:
          </p>
          <div className="mt-3 mb-2 bg-muted rounded-lg px-5 py-3 text-center">
            <span className="font-mono text-sm text-foreground">
              aPC.PHRED<sub>k</sub>
              <span className="mx-2 text-muted-foreground">=</span>
              &minus;10 &times; log<sub>10</sub>
              <span className="text-muted-foreground">(</span>
              rank(&minus;aPC.raw<sub>k</sub>) / <em>M</em>
              <span className="text-muted-foreground">)</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            where <em>M</em> is the total number of variants across the whole genome.
            PHRED scores express rank in order of magnitude:
          </p>
          <div className="mt-2 flex gap-4 text-sm">
            <span className="text-muted-foreground">Top 10% <span className="font-mono font-semibold text-foreground">= PHRED 10</span></span>
            <span className="text-muted-foreground">Top 1% <span className="font-mono font-semibold text-foreground">= PHRED 20</span></span>
            <span className="text-muted-foreground">Top 0.1% <span className="font-mono font-semibold text-foreground">= PHRED 30</span></span>
          </div>
        </div>
      </div>

      {/* ── Correlation heatmap ── */}
      <CorrelationSection />

      {/* ── Full annotation catalog ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="annotation-catalog">Full annotation catalog</h2>
          <p>
            Every variant in FAVOR carries annotations across the following
            categories. Fields marked <strong>NEW</strong> were added after the
            original FAVOR release.
          </p>
        </Prose>
      </div>

      <AnnotationCatalog />

      {/* ── Tissue-specific data packs ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="tissue-data">Tissue and cell-type specific data</h2>
          <p>
            In addition to the per-variant annotations above, FAVOR provides
            tissue and cell-type specific datasets as separate downloadable
            parquet packs. These cover regulatory signals, QTL associations,
            enhancer-gene linkages, and chromatin state maps across hundreds
            of tissues and cell types.
          </p>
        </Prose>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Category</th>
              <th className="text-left py-2.5 font-semibold text-foreground">Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              { category: "Tissue scores", description: "Per-variant tissue-specific activity scores, ChromBPNet base-pair resolution predictions, allelic imbalance, allelic methylation, chromatin loops" },
              { category: "eQTL", description: "Expression QTLs, splicing QTLs, and APA QTLs with effect sizes, p-values, and tissue labels. Includes SuSiE fine-mapped credible sets" },
              { category: "eQTL Catalogue", description: "Unified eQTL associations across studies and tissues" },
              { category: "Single-cell eQTL", description: "Cell-type-specific eQTLs from DICE (immune) and PsychENCODE (brain)" },
              { category: "Enhancer-gene linkages", description: "Enhancer-gene links from ENCODE cCRE computational screens, ChIA-PET, CRISPR experiments, RE2G, EpiMap, and EpiRAction" },
              { category: "Regulatory", description: "Tissue-resolved chromatin accessibility peaks, cCRE tissue signals, ChromHMM states per biosample, validated enhancers" },
              { category: "Polygenic scores", description: "Polygenic score weights and metadata from PGS Catalog" },
              { category: "Genotypes", description: "Genotype matrices for regional analysis" },
            ].map((row) => (
              <tr key={row.category} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.category}</td>
                <td className="py-3 text-muted-foreground leading-relaxed">{row.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Data sources ── */}
      <div className="mt-10">
        <Prose>
          <h2 id="data-sources">Data sources and versions</h2>
          <p>
            Annotations are drawn from the following sources, harmonized onto
            GRCh38 coordinates. This includes sources for both per-variant annotations
            and the tissue-specific data packs above. See the{" "}
            <Link href="/docs/data/changelog" className="text-primary hover:underline">
              data changelog
            </Link>{" "}
            for the history of source bumps and pipeline changes across releases.
          </p>
        </Prose>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Source</th>
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Version</th>
              <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Data provided</th>
              <th className="text-left py-2.5 font-semibold text-foreground">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {[
              { source: "dbNSFP", version: "v5.2", data: "28 missense variant predictors", coverage: "REVEL, BayesDel, ClinPred, MPC, ESM-1b, MetaRNN, PrimateAI, VEST4, and more" },
              { source: "gnomAD", version: "v4.1.1", data: "Allele frequencies, constraint scores", coverage: "Genome + exome, 9 ancestry groups" },
              { source: "ClinVar", version: "2025-04", data: "Clinical significance, disease associations", coverage: "Reviewed pathogenic/benign classifications" },
              { source: "dbSNP", version: "b156", data: "rsID cross-references", coverage: "All known variant identifiers" },
              { source: "GENCODE", version: "v47", data: "Gene annotations, consequence predictions", coverage: "Comprehensive human gene set" },
              { source: "RefSeq", version: "r226", data: "Gene annotations, consequence predictions", coverage: "NCBI curated transcript models" },
              { source: "ENCODE cCREs", version: "v4", data: "Candidate cis-regulatory elements, tissue signals", coverage: "Enhancers, promoters, insulators, CTCF" },
              { source: "SpliceAI", version: "v1.3.1", data: "Splice-altering predictions", coverage: "Donor/acceptor gain/loss probabilities" },
              { source: "GTEx", version: "", data: "eQTLs, sQTLs", coverage: "Tissue-specific expression and splicing QTLs" },
              { source: "eQTL Catalogue", version: "", data: "Unified eQTL associations", coverage: "Cross-study, cross-tissue eQTL compendium" },
              { source: "DICE", version: "", data: "Single-cell eQTLs", coverage: "Immune cell type eQTLs" },
              { source: "PsychENCODE", version: "", data: "Single-cell eQTLs", coverage: "Brain cell type eQTLs" },
              { source: "EpiMap", version: "", data: "Chromatin state annotations, enhancer-gene links", coverage: "Epigenomic maps across biosamples" },
              { source: "EpiRAction", version: "", data: "Enhancer-gene regulatory interactions", coverage: "Tissue-specific regulatory links" },
              { source: "ENCODE RE2G", version: "", data: "Enhancer-gene predictions", coverage: "Regulation-to-gene linkages" },
              { source: "ChromBPNet", version: "", data: "Base-pair resolution chromatin predictions", coverage: "Tissue-specific variant effect predictions" },
              { source: "PGS Catalog", version: "", data: "Polygenic score weights", coverage: "Published polygenic scores and metadata" },
              { source: "ENCODE", version: "", data: "Histone marks, DNase, RNA", coverage: "13 signals across 127 reference epigenomes" },
              { source: "COSMIC", version: "", data: "Somatic mutations in cancer", coverage: "Gene, transcript, protein change, sample count" },
              { source: "CADD", version: "", data: "Combined Annotation Dependent Depletion", coverage: "Integrative deleteriousness score" },
              { source: "AlphaMissense", version: "", data: "Missense pathogenicity prediction", coverage: "All possible missense substitutions" },
              { source: "GPN-MSA", version: "", data: "Genomic Pre-trained Network scores", coverage: "Genome-wide pathogenicity prediction" },
              { source: "BRAVO / TOPMed", version: "", data: "Allele frequencies", coverage: "705M variants from 132K whole genomes" },
              { source: "1000 Genomes", version: "", data: "Global and population frequencies", coverage: "5 superpopulations" },
              { source: "PhastCons / PhyloP", version: "", data: "Evolutionary conservation", coverage: "Primate, mammalian, vertebrate clades" },
              { source: "ReMap", version: "", data: "Transcription factor binding", coverage: "TF and cell line overlap counts" },
              { source: "GeneHancer", version: "", data: "Enhancer-gene links", coverage: "Regulatory element to target gene scores" },
            ].map((row) => (
              <tr key={row.source} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.source}</td>
                <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap align-top">{row.version}</td>
                <td className="py-3 pr-4 text-muted-foreground align-top">{row.data}</td>
                <td className="py-3 text-muted-foreground leading-relaxed">{row.coverage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <Prose>
          <Callout variant="tip" title="Programmatic access">
            All annotation data is available through the FAVOR API. See the{" "}
            <Link href="/docs/search" className="text-primary hover:underline">Search & Explore</Link> guide for interactive
            queries, or the{" "}
            <Link href="/docs/batch-annotation" className="text-primary hover:underline">Batch Annotation</Link>{" "}
            guide for large-scale retrieval.
          </Callout>
        </Prose>
      </div>
    </div>
  );
}
