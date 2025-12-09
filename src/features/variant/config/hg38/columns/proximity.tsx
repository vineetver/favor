import type { Variant } from "../../../types/types";
import { createColumns, cell, tooltip } from "@/lib/table/column-builder";

const col = createColumns<Variant>();

export const proximityColumns = [
  col.accessor("min_dist_tss", {
    accessor: "min_dist_tss",
    header: "Min Distance to TSS",
    description: tooltip({
      title: "Minimum Distance to TSS",
      description: "Distance to closest Transcribed Sequence Start (TSS). Indicates proximity to gene transcription initiation sites.",
      range: "[1, 3604058]",
      defaultValue: "1e7",
      guides: [
        { threshold: "Close proximity (<1000bp)", meaning: "Near promoter region, potential regulatory impact" },
        { threshold: "Moderate distance (1-10kb)", meaning: "Proximal regulatory region" },
        { threshold: "Far distance (>10kb)", meaning: "Distal from transcription start" },
      ],
    }),
    cell: cell.integer(),
  }),

  col.accessor("min_dist_tse", {
    accessor: "min_dist_tse",
    header: "Min Distance to TSE",
    description: tooltip({
      title: "Minimum Distance to TSE",
      description: "Distance to closest Transcribed Sequence End (TSE). Indicates proximity to gene transcription termination sites.",
      range: "[1, 3610636]",
      defaultValue: "1e7",
      guides: [
        { threshold: "Close proximity (<1000bp)", meaning: "Near 3' end of gene, potential polyadenylation impact" },
        { threshold: "Moderate distance (1-10kb)", meaning: "Downstream regulatory region" },
        { threshold: "Far distance (>10kb)", meaning: "Distal from transcription end" },
      ],
    }),
    cell: cell.integer(),
  }),
];

export const proximityGroup = col.group(
  "proximity-table",
  "Proximity Table",
  proximityColumns
);
