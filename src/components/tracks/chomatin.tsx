import type { Track } from "@/components/gosling";

const chromatinTrackUrl =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=chromatin-hg38";

export const chromatinTrack: Track = {
  alignment: "overlay",
  title: "ChIA-PET & Intact-HiC",
  data: {
    url: chromatinTrackUrl,
    type: "beddb",
    genomicFields: [
      { index: 1, name: "start" },
      { index: 2, name: "end" },
      { index: 13, name: "start2" },
      { index: 14, name: "end2" },
    ],
    valueFields: [
      { index: 0, name: "chromosome", type: "nominal" },
      { index: 1, name: "start_position", type: "quantitative" },
      { index: 2, name: "end_position", type: "quantitative" },
      { index: 3, name: "accession", type: "nominal" },
      { index: 4, name: "ensembleID", type: "nominal" },
      { index: 5, name: "gene_name", type: "nominal" },
      { index: 6, name: "gene_type", type: "nominal" },
      { index: 7, name: "assay_type", type: "nominal" },
      { index: 8, name: "experiment_id", type: "nominal" },
      { index: 9, name: "biosample", type: "nominal" },
      { index: 10, name: "score", type: "nominal" },
      { index: 11, name: "p_value", type: "quantitative" },
      { index: 12, name: "chromosome2", type: "nominal" },
      { index: 15, name: "sig", type: "nominal" },
    ],
  },
  tracks: [
    {
      dataTransform: [{ type: "filter", field: "sig", oneOf: ["unknown"] }],
      mark: "withinLink",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      x1: { field: "start2", type: "genomic" },
      x1e: { field: "end2", type: "genomic" },
      y: { flip: true },
      strokeWidth: { value: 1 },
      color: { value: "none" },
      stroke: {
        field: "assay_type",
        type: "nominal",
        domain: ["Intact-HiC", "RNAPII-ChIAPET"],
        range: ["red", "blue"],
      },
      style: { linePattern: { type: "triangleLeft", size: 5 } },
      opacity: { value: 0.1 },
    },
    // Track for "significant"
    {
      dataTransform: [{ type: "filter", field: "sig", oneOf: ["significant"] }],
      mark: "withinLink",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      x1: { field: "start2", type: "genomic" },
      x1e: { field: "end2", type: "genomic", linkingId: "link1" },
      y: { flip: true },
      color: { value: "none" },
      strokeWidth: { value: 2 },
      stroke: {
        field: "assay_type",
        type: "nominal",
        domain: ["Intact-HiC", "RNAPII-ChIAPET"],
        range: ["red", "blue"],
      },
      opacity: { value: 0.9 },
    },
    {
      dataTransform: [
        { type: "filter", field: "sig", oneOf: ["insignificant"] },
      ],
      mark: "withinLink",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      x1: { field: "start2", type: "genomic" },
      x1e: { field: "end2", type: "genomic" },
      y: { flip: true },
      color: { value: "none" },
      strokeWidth: { value: 1 },
      stroke: {
        field: "assay_type",
        type: "nominal",
        domain: ["Intact-HiC", "RNAPII-ChIAPET"],
        range: ["red", "blue"],
      },
      opacity: { value: 0.1 },
    },
  ],

  tooltip: [
    { field: "accession", type: "nominal", alt: "Accession" },
    { field: "gene_name", type: "nominal", alt: "Linked to" },
    { field: "assay_type", type: "nominal", alt: "Assay Type" },
    { field: "p_value", type: "quantitative", alt: "P-value" },
    { field: "sig", type: "nominal", alt: "Significance" },
  ],
  width: 900,
  height: 180,
};
