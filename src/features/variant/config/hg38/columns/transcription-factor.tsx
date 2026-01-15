import type { Variant } from "@/features/variant/types";
import { createColumns, cell, tooltip } from "@/lib/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

export const transcriptionFactorColumns = [
  apcColumns.transcriptionFactor,

  col.accessor("remap_overlap_tf", {
    accessor: "remap_overlap_tf",
    header: "RemapOverlapTF",
    description: tooltip({
      title: "ReMap TF Overlap",
      description: "Number of different transcription factors that bind to this genomic region based on ChIP-seq data from the ReMap database. Indicates regulatory hotspots and complexity.",
      range: "[1, 350]",
      defaultValue: "-0.5",
      citation: "Chèneby et al., 2020",
      guides: [
        { threshold: "Higher counts (>10 TFs)", meaning: "High regulatory complexity, multiple TF binding" },
        { threshold: "Lower counts (1-5 TFs)", meaning: "Simpler regulatory context, fewer TF interactions" },
      ],
    }),
    cell: cell.text(),
  }),

  col.accessor("remap_overlap_cl", {
    accessor: "remap_overlap_cl",
    header: "RemapOverlapCL",
    description: tooltip({
      title: "ReMap Cell Line Overlap",
      description: "Number of different transcription factor-cell line combinations that show binding to this genomic region. Represents context-specific TF binding across diverse cellular conditions.",
      range: "[1, 1068]",
      defaultValue: "-0.5",
      citation: "Chèneby et al., 2020",
      guides: [
        { threshold: "Higher counts (>50)", meaning: "Broad regulatory activity across cell types" },
        { threshold: "Lower counts (<20)", meaning: "More cell-type specific or limited binding" },
      ],
    }),
    cell: cell.text(),
  }),
];

export const transcriptionFactorGroup = col.group("transcription-factors", "Transcription Factor", transcriptionFactorColumns);
