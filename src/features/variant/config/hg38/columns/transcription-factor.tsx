import type { Variant } from "../../../types/types";
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
      description: "Number of different transcription factors with evidence of binding to this genomic region from the ReMap database.",
      range: "[1, 350]",
      citation: "Chèneby et al., 2020",
      guides: [
        { threshold: "Higher values (>50)", meaning: "Highly regulatory region with many TF binding sites" },
        { threshold: "Lower values", meaning: "Fewer transcription factors bind here" },
      ],
    }),
    cell: cell.text(),
  }),

  col.accessor("remap_overlap_cl", {
    accessor: "remap_overlap_cl",
    header: "RemapOverlapCL",
    description: tooltip({
      title: "ReMap Cell Line Overlap",
      description: "Number of TF-cell line combinations showing binding evidence at this position. Reflects both TF diversity and tissue specificity.",
      range: "[1, 1068]",
      citation: "Chèneby et al., 2020",
      guides: [
        { threshold: "Higher values (>100)", meaning: "Broadly active regulatory region across cell types" },
        { threshold: "Lower values", meaning: "More cell-type specific regulation" },
      ],
    }),
    cell: cell.text(),
  }),
];

export const transcriptionFactorGroup = col.group("transcription-factors", "Transcription Factor", transcriptionFactorColumns);
