import type { Variant } from "@/features/variant/types";
import { createColumns, cell, tooltip, categories } from "@/lib/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

const filterValue = categories([
  { label: "Low", match: /^Low$/i, color: "red", description: "Low quality regions: Mappability < 0.5, overlap with >50nt simple repeat, ReadPosRankSum > 1, 0 SNVs in 100bp window" },
  { label: "SFS bump", match: /SFS_bump/i, color: "yellow", description: "Pentamer context with abnormal site frequency spectrum. High-frequency SNVs exceed 1.5× mutation rate controlled average" },
  { label: "TFBS", match: /^TFBS$/i, color: "blue", description: "Transcription factor binding site determined by overlap with ChIP-seq peaks" },
]);

export const mutationDensityColumns = [
  apcColumns.mutationDensity,

  // Mutation rate estimates
  col.accessor("filter_value", {
    accessor: "filter_value",
    header: "Filter Value",
    description: tooltip({
      title: "Filter Value",
      description: "Quality assessment categories for genomic regions based on various sequencing and genomic metrics.",
      categories: filterValue,
    }),
    cell: cell.badge(filterValue),
  }),

  col.accessor("pn", {
    accessor: "pn",
    header: "Pentanucleotide",
    description: tooltip({
      title: "Pentanucleotide Context",
      description: "The 5-nucleotide sequence context surrounding the variant position, important for understanding mutation patterns and rates.",
      guides: [
        { threshold: "Context dependency", meaning: "Mutation rates vary significantly based on surrounding nucleotide sequence" },
        { threshold: "Format", meaning: "5-base sequence with variant position in center" },
      ],
    }),
    cell: cell.text(),
  }),

  col.accessor("mr", {
    accessor: "mr",
    header: "Roulette Mutation Rate",
    description: tooltip({
      title: "Roulette Mutation Rate",
      description: "Roulette mutation rate estimate based on sequence context and evolutionary patterns.",
      guides: [
        { threshold: "Higher rates", meaning: "More mutagenic sequence contexts" },
        { threshold: "Lower rates", meaning: "More stable sequence contexts" },
        { threshold: "Application", meaning: "Helps distinguish pathogenic variants from benign polymorphisms" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("ar", {
    accessor: "ar",
    header: "Adjusted Mutation Rate",
    description: tooltip({
      title: "Adjusted Roulette Mutation Rate",
      description: "Adjusted Roulette mutation rate estimate that accounts for additional genomic factors beyond basic sequence context.",
      guides: [
        { threshold: "Higher rates", meaning: "Contexts prone to higher mutation frequency" },
        { threshold: "Lower rates", meaning: "More evolutionarily stable regions" },
        { threshold: "Adjustment factors", meaning: "Incorporates chromatin structure and replication timing" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("mg", {
    accessor: "mg",
    header: "gnomAD Mutation Rate",
    description: tooltip({
      title: "gnomAD Mutation Rate",
      description: "Mutation rate estimate from the gnomAD consortium based on large-scale population genomic data.",
      citation: "Karczewski et al. 2020",
      guides: [
        { threshold: "Population-based", meaning: "Derived from analysis of >140,000 genomes and exomes" },
        { threshold: "Higher rates", meaning: "Regions with elevated mutation burden" },
        { threshold: "Clinical relevance", meaning: "Helps calibrate variant interpretation frameworks" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("mc", {
    accessor: "mc",
    header: "Carlson Mutation Rate",
    description: tooltip({
      title: "Carlson De Novo Mutation Rate",
      description: "Mutation rate estimate from Carlson et al. based on de novo mutation patterns in families.",
      citation: "Carlson et al. 2018",
      guides: [
        { threshold: "De novo focus", meaning: "Based on analysis of new mutations in parent-offspring trios" },
        { threshold: "Higher rates", meaning: "Sequence contexts with increased de novo mutation frequency" },
        { threshold: "Complementary approach", meaning: "Provides independent validation of mutation rate patterns" },
      ],
    }),
    cell: cell.decimal(6),
  }),

  // Common variant counts (MAF > 0.05)
  col.accessor("freq100bp", {
    accessor: "freq100bp",
    header: "Common 100bp",
    description: tooltip({
      title: "Common Variants (100bp)",
      description: "Number of common variants (MAF > 0.05) from BRAVO dataset within a 100bp window around the variant.",
      range: "[0, 13]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>3)", meaning: "Mutation-prone region for common variants" },
        { threshold: "Lower counts (0-1)", meaning: "Less mutated or more constrained region" },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("freq1000bp", {
    accessor: "freq1000bp",
    header: "Common 1kb",
    description: tooltip({
      title: "Common Variants (1kb)",
      description: "Number of common variants (MAF > 0.05) from BRAVO dataset within a 1000bp window around the variant.",
      range: "[0, 73]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>20)", meaning: "High mutation density in local region" },
        { threshold: "Lower counts (0-5)", meaning: "Lower regional mutation rate" },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("freq10000bp", {
    accessor: "freq10000bp",
    header: "Common 10kb",
    description: tooltip({
      title: "Common Variants (10kb)",
      description: "Number of common variants (MAF > 0.05) from BRAVO dataset within a 10kb window around the variant.",
      range: "[0, 443]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>100)", meaning: "Very high regional mutation density" },
        { threshold: "Lower counts (0-20)", meaning: "Lower broad regional mutation rate" },
      ],
    }),
    cell: cell.integer(),
  }),

  // Rare variant counts (MAF < 0.05)
  col.accessor("rare100bp", {
    accessor: "rare100bp",
    header: "Rare 100bp",
    description: tooltip({
      title: "Rare Variants (100bp)",
      description: "Number of rare variants (MAF < 0.05) from BRAVO dataset within a 100bp window around the variant.",
      range: "[0, 31]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>5)", meaning: "High rare variant density, potential mutation hotspot" },
        { threshold: "Lower counts (0-2)", meaning: "Lower mutation rate or stronger selection against variants" },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("rare1000bp", {
    accessor: "rare1000bp",
    header: "Rare 1kb",
    description: tooltip({
      title: "Rare Variants (1kb)",
      description: "Number of rare variants (MAF < 0.05) from BRAVO dataset within a 1000bp window around the variant.",
      range: "[0, 74]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>20)", meaning: "High rare variant density in region" },
        { threshold: "Lower counts (0-5)", meaning: "Lower regional rare variant burden" },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("rare10000bp", {
    accessor: "rare10000bp",
    header: "Rare 10kb",
    description: tooltip({
      title: "Rare Variants (10kb)",
      description: "Number of rare variants (MAF < 0.05) from BRAVO dataset within a 10kb window around the variant.",
      range: "[0, 355]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>80)", meaning: "Very high regional rare variant density" },
        { threshold: "Lower counts (0-20)", meaning: "Lower broad regional rare variant burden" },
      ],
    }),
    cell: cell.integer(),
  }),

  // Singleton variant counts (AC=1)
  col.accessor("sngl100bp", {
    accessor: "sngl100bp",
    header: "Singleton 100bp",
    description: tooltip({
      title: "Singleton Variants (100bp)",
      description: "Number of singleton variants (observed only once) from BRAVO dataset within a 100bp window around the variant.",
      range: "[0, 99]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>10)", meaning: "Very high recent mutation activity" },
        { threshold: "Lower counts (0-3)", meaning: "Lower mutation rate, potentially more constrained" },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("sngl1000bp", {
    accessor: "sngl1000bp",
    header: "Singleton 1kb",
    description: tooltip({
      title: "Singleton Variants (1kb)",
      description: "Number of singleton variants (observed only once) from BRAVO dataset within a 1000bp window around the variant.",
      range: "[0, 658]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>50)", meaning: "Very high regional mutation activity" },
        { threshold: "Lower counts (0-10)", meaning: "Lower regional mutation rate" },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("sngl10000bp", {
    accessor: "sngl10000bp",
    header: "Singleton 10kb",
    description: tooltip({
      title: "Singleton Variants (10kb)",
      description: "Number of singleton variants (observed only once) from BRAVO dataset within a 10kb window around the variant.",
      range: "[0, 4749]",
      defaultValue: "0",
      guides: [
        { threshold: "Higher counts (>500)", meaning: "Extremely high broad regional mutation activity" },
        { threshold: "Lower counts (0-50)", meaning: "Lower broad regional mutation rate" },
      ],
    }),
    cell: cell.integer(),
  }),
];

export const mutationDensityGroup = col.group(
  "expected-rate-of-de-novo-mutation",
  "Expected Rate of De Novo Mutation",
  mutationDensityColumns
);
