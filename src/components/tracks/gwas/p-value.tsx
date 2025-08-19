import type { Track } from "@/components/gosling";

const GWASPVALUEURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=gwas-hg38";

const GWASPVALUEURL2 =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=gwas-catalog-clipped2";

export const gwasPValueTrack: Track = {
  title: "GWAS Manhattan Plot with Semantic Zoom (-log₁₀ scale)",
  alignment: "overlay", // enable overlay of multiple sub-tracks
  data: {
    url: GWASPVALUEURL,
    type: "beddb",
    genomicFields: [
      { index: 1, name: "start" },
      { index: 2, name: "end" },
    ],
    valueFields: [
      { index: 6, name: "variant_vcf", type: "nominal" },
      { index: 7, name: "DATE ADDED TO CATALOG", type: "nominal" },
      { index: 8, name: "pubmedid", type: "nominal" },
      { index: 9, name: "FIRST AUTHOR", type: "nominal" },
      { index: 10, name: "date", type: "nominal" },
      { index: 11, name: "journal", type: "nominal" },
      { index: 12, name: "link", type: "nominal" },
      { index: 13, name: "study", type: "nominal" },
      { index: 14, name: "DISEASE/TRAIT", type: "nominal" },
      { index: 15, name: "INITIAL SAMPLE SIZE", type: "nominal" },
      { index: 16, name: "REPLICATION SAMPLE SIZE", type: "nominal" },
      { index: 17, name: "region", type: "nominal" },
      { index: 18, name: "REPORTED GENE(S)", type: "nominal" },
      { index: 19, name: "mapped_gene", type: "nominal" },
      { index: 20, name: "upstream_gene_id", type: "nominal" },
      { index: 21, name: "downstream_gene_id", type: "nominal" },
      { index: 22, name: "snp_gene_ids", type: "nominal" },
      { index: 23, name: "upstream_gene_distance", type: "nominal" },
      { index: 24, name: "downstream_gene_distance", type: "nominal" },
      { index: 25, name: "STRONGEST SNP-RISK ALLELE", type: "nominal" },
      { index: 26, name: "snps", type: "nominal" },
      { index: 27, name: "merged", type: "nominal" },
      { index: 28, name: "snp_id_current", type: "nominal" },
      { index: 29, name: "context", type: "nominal" },
      { index: 30, name: "intergenic", type: "nominal" },
      { index: 31, name: "RISK ALLELE FREQUENCY", type: "nominal" },
      { index: 32, name: "P-VALUE", type: "quantitative" },
      { index: 33, name: "pvalue_mlog", type: "quantitative" },
      { index: 34, name: "P-VALUE (TEXT)", type: "nominal" },
      { index: 35, name: "OR or BETA", type: "nominal" },
      { index: 36, name: "95% CI (TEXT)", type: "nominal" },
      { index: 37, name: "PLATFORM [SNPS PASSING QC]", type: "nominal" },
      { index: 38, name: "cnv", type: "nominal" },
    ],
  },
  width: 800,
  height: 200,
  // The "tracks" array here contains two overlaid layers
  tracks: [
    // 1. Aggregated view layer (e.g. a binned bar chart) – shown when zoomed out

    // {
    //   mark: "bar",
    //   // Bin the genomic coordinate if supported (this reduces the number of rendered marks)
    //   x: { field: "start", type: "genomic", linkingId: "link1", aggregate: "bin" },
    //   // Use the -log10(p-value) and aggregate (e.g. using max to show the highest significance per bin)
    //   y: { field: "pvalue_mlog", type: "quantitative", axis: "left", aggregate: "max" },
    //   color: {
    //     field: "pvalue_mlog",
    //     type: "quantitative",
    //     legend: true,
    //     axis: "left"
    //   },
    //   tooltip: [
    //     { field: "variant_vcf",            type: "nominal", alt: "Variant VCF" },
    //     { field: "P-VALUE",                type: "nominal", title: "P-Value" },
    //     { field: "RISK ALLELE FREQUENCY",  type: "nominal", title: "Risk Allele Freq." },
    //     { field: "DISEASE/TRAIT",          type: "nominal", title: "Disease Trait" },
    //     { field: "study",                  type: "nominal", title: "Study" }
    //   ],
    //   opacity: { value: 0.5 },
    //   // Show this aggregated layer only when the zoom level is “high” (i.e. when the view spans ≥1,000,000 bp)
    //   visibility: [
    //     {
    //       operation: "greater-than-or-equal-to",
    //       measure: "zoomLevel",
    //       threshold: 250000,
    //       target: "track"
    //     }
    //   ]
    // },
    // 2. Detailed view layer (individual point marks) – shown when zoomed in
    {
      mark: "point",
      stroke: { value: "red" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      x: { field: "start", type: "genomic", linkingId: "link1" },
      y: { field: "pvalue_mlog", type: "quantitative", axis: "left" },
      color: {
        field: "pvalue_mlog",
        type: "quantitative",
        legend: true,
        axis: "left",
      },
      tooltip: [
        { field: "variant_vcf", type: "nominal", alt: "Variant VCF" },
        { field: "P-VALUE", type: "nominal", title: "P-Value" },
        {
          field: "RISK ALLELE FREQUENCY",
          type: "nominal",
          title: "Risk Allele Freq.",
        },
        { field: "DISEASE/TRAIT", type: "nominal", title: "Disease Trait" },
        { field: "study", type: "nominal", title: "Study" },
        {
          field: "pvalue_mlog",
          type: "quantitative",
          title: "-log₁₀(P-Value)",
        },
      ],
      // Show detailed points only when zoomed in (i.e. when the view spans <1,000,000 bp)
      visibility: [
        {
          operation: "less-than",
          measure: "zoomLevel",
          threshold: 250000,
          target: "track",
        },
      ],
    },
  ],
};

export const gwasPValueTrack2 = {
  title: "GWAS Manhattan Plot with Semantic Zoom (-log₁₀ scale) (Clipped)",
  alignment: "overlay", // enable overlay of multiple sub-tracks
  data: {
    url: GWASPVALUEURL2,
    type: "beddb",
    genomicFields: [
      { index: 1, name: "start" },
      { index: 2, name: "end" },
    ],
    valueFields: [
      { index: 6, name: "variant_vcf", type: "nominal" },
      { index: 7, name: "DATE ADDED TO CATALOG", type: "nominal" },
      { index: 8, name: "pubmedid", type: "nominal" },
      { index: 9, name: "FIRST AUTHOR", type: "nominal" },
      { index: 10, name: "date", type: "nominal" },
      { index: 11, name: "journal", type: "nominal" },
      { index: 12, name: "link", type: "nominal" },
      { index: 13, name: "study", type: "nominal" },
      { index: 14, name: "DISEASE/TRAIT", type: "nominal" },
      { index: 15, name: "INITIAL SAMPLE SIZE", type: "nominal" },
      { index: 16, name: "REPLICATION SAMPLE SIZE", type: "nominal" },
      { index: 17, name: "region", type: "nominal" },
      { index: 18, name: "REPORTED GENE(S)", type: "nominal" },
      { index: 19, name: "mapped_gene", type: "nominal" },
      { index: 20, name: "upstream_gene_id", type: "nominal" },
      { index: 21, name: "downstream_gene_id", type: "nominal" },
      { index: 22, name: "snp_gene_ids", type: "nominal" },
      { index: 23, name: "upstream_gene_distance", type: "nominal" },
      { index: 24, name: "downstream_gene_distance", type: "nominal" },
      { index: 25, name: "STRONGEST SNP-RISK ALLELE", type: "nominal" },
      { index: 26, name: "snps", type: "nominal" },
      { index: 27, name: "merged", type: "nominal" },
      { index: 28, name: "snp_id_current", type: "nominal" },
      { index: 29, name: "context", type: "nominal" },
      { index: 30, name: "intergenic", type: "nominal" },
      { index: 31, name: "RISK ALLELE FREQUENCY", type: "nominal" },
      { index: 32, name: "P-VALUE", type: "quantitative" },
      { index: 33, name: "pvalue_mlog", type: "quantitative" },
      { index: 34, name: "P-VALUE (TEXT)", type: "nominal" },
      { index: 35, name: "OR or BETA", type: "nominal" },
      { index: 36, name: "95% CI (TEXT)", type: "nominal" },
      { index: 37, name: "PLATFORM [SNPS PASSING QC]", type: "nominal" },
      { index: 38, name: "cnv", type: "nominal" },
      { index: 39, name: "clipped", type: "quantitative" },
    ],
  },
  width: 800,
  height: 250,
  // The "tracks" array here contains two overlaid layers
  tracks: [
    // 1. Aggregated view layer (e.g. a binned bar chart) – shown when zoomed out

    // {
    //   mark: "bar",
    //   // Bin the genomic coordinate if supported (this reduces the number of rendered marks)
    //   x: { field: "start", type: "genomic", linkingId: "link1", aggregate: "bin" },
    //   // Use the -log10(p-value) and aggregate (e.g. using max to show the highest significance per bin)
    //   y: { field: "pvalue_mlog", type: "quantitative", axis: "left", aggregate: "max" },
    //   color: {
    //     field: "pvalue_mlog",
    //     type: "quantitative",
    //     legend: true,
    //     axis: "left"
    //   },
    //   tooltip: [
    //     { field: "variant_vcf",            type: "nominal", alt: "Variant VCF" },
    //     { field: "P-VALUE",                type: "nominal", title: "P-Value" },
    //     { field: "RISK ALLELE FREQUENCY",  type: "nominal", title: "Risk Allele Freq." },
    //     { field: "DISEASE/TRAIT",          type: "nominal", title: "Disease Trait" },
    //     { field: "study",                  type: "nominal", title: "Study" }
    //   ],
    //   opacity: { value: 0.5 },
    //   // Show this aggregated layer only when the zoom level is “high” (i.e. when the view spans ≥1,000,000 bp)
    //   visibility: [
    //     {
    //       operation: "greater-than-or-equal-to",
    //       measure: "zoomLevel",
    //       threshold: 250000,
    //       target: "track"
    //     }
    //   ]
    // },
    // 2. Detailed view layer (individual point marks) – shown when zoomed in
    {
      mark: "point",
      stroke: { value: "red" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      x: { field: "start", type: "genomic", linkingId: "link1" },
      y: { field: "clipped", type: "quantitative", axis: "left" },
      color: {
        field: "pvalue_mlog_clipped",
        type: "quantitative",
        axis: "left",
      },
      tooltip: [
        { field: "variant_vcf", type: "nominal", alt: "Variant VCF" },
        { field: "P-VALUE", type: "nominal", title: "P-Value" },
        {
          field: "RISK ALLELE FREQUENCY",
          type: "nominal",
          title: "Risk Allele Freq.",
        },
        { field: "DISEASE/TRAIT", type: "nominal", title: "Disease Trait" },
        { field: "study", type: "nominal", title: "Study" },
        {
          field: "pvalue_mlog",
          type: "quantitative",
          title: "-log₁₀(P-Value)",
        },
      ],
      // Show detailed points only when zoomed in (i.e. when the view spans <1,000,000 bp)
      visibility: [
        {
          operation: "less-than",
          measure: "zoomLevel",
          threshold: 250000,
          target: "track",
        },
      ],
    },
  ],
};
