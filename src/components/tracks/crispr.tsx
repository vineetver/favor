import { Track } from "@/components/gosling";

const crisprTrackUrl =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=crispr-hg38";
//     chr3	127573910	127574259	EH38E3537652	ENSG00000058262	SEC61A1 	protein_coding	chr3_127573842_127574362	CRISPRi-FlowFISH	ENCSR760TSA	K562	-0.00996866	0.9109741284291061	chr3	128052436	128071682
export const crisprTrack: Track = {
  alignment: "overlay",
  title: "CRISPR",
  data: {
    url: crisprTrackUrl,
    type: "beddb",
    genomicFields: [
      { index: 1, name: "start" },
      { index: 2, name: "end" },
      { index: 14, name: "start2" },
      { index: 15, name: "end2" },
    ],
    valueFields: [
      { index: 0, name: "chromosome", type: "nominal" },
      { index: 3, name: "accession", type: "nominal" },
      { index: 4, name: "ensembleID", type: "nominal" },
      { index: 5, name: "gene_name", type: "nominal" },
      { index: 6, name: "gene_type", type: "nominal" },
      { index: 7, name: "gRNA_id", type: "nominal" },
      { index: 8, name: "assay_type", type: "nominal" },
      { index: 9, name: "experiment_id", type: "nominal" },
      { index: 10, name: "biosample", type: "nominal" },
      { index: 11, name: "effect_size", type: "nominal" },
      { index: 12, name: "p_value", type: "quantitative" },
      { index: 13, name: "chromosome2", type: "nominal" },
      { index: 16, name: "sig", type: "nominal" },
    ],
  },
  tracks: [
    {
      dataTransform: [{ type: "filter", field: "sig", oneOf: ["unknown"] }],
      mark: "withinLink",
      x: { field: "start", type: "genomic" },
      x1: { field: "start2", type: "genomic" },
      x1e: { field: "end2", type: "genomic" },
      y: { flip: true },
      strokeWidth: { value: 1 },
      color: { value: "none" },
      stroke: {
        value: "black",
      },
      style: { linePattern: { type: "triangleLeft", size: 5 } },
      opacity: { value: 0.1 },
    },
    // Track for "significant"
    {
      dataTransform: [{ type: "filter", field: "sig", oneOf: ["significant"] }],
      mark: "withinLink",
      x: { field: "start", type: "genomic" },
      x1: { field: "start2", type: "genomic" },
      x1e: { field: "end2", type: "genomic" },
      y: { flip: true },
      color: { value: "none" },
      strokeWidth: { value: 2 },
      stroke: {
        value: "black",
      },
      opacity: { value: 0.9 },
    },
    {
      dataTransform: [
        { type: "filter", field: "sig", oneOf: ["insignificant"] },
      ],
      mark: "withinLink",
      x: { field: "start", type: "genomic" },
      x1: { field: "start2", type: "genomic" },
      x1e: { field: "end2", type: "genomic", linkingId: "link1" },
      y: { flip: true },
      color: { value: "none" },
      strokeWidth: { value: 1 },
      stroke: {
        value: "black",
      },
      opacity: { value: 0.1 },
    },
  ],
  tooltip: [
    { field: "start", type: "genomic", alt: "Position" },
    { field: "gene_name", type: "nominal", alt: "Linked To" },
    { field: "accession", type: "nominal", alt: "Accession" },
    { field: "gene_type", type: "nominal", alt: "Gene Type" },
    { field: "biosample", type: "nominal", alt: "Biosample" },
    { field: "p_value", type: "quantitative", alt: "P-value" },
  ],
  width: 900,
  height: 180,
};
