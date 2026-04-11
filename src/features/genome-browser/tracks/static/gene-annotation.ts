// src/features/genome-browser/tracks/static/gene-annotation.ts
// GENCODE gene annotation track from the public Gosling tileset server.
// Renders strand-aware gene bodies (rule + triangle markers), exon boxes,
// and gene name labels. Identical structure to the master implementation.

import { Dna } from "lucide-react";
import type { GoslingTrackSpec, StaticTrack } from "../../types/tracks";
import { LINKING_ID } from "../constants";

const GENE_ANNOTATION_URL =
  "https://server.gosling-lang.org/api/v1/tileset_info/?d=gene-annotation";

const geneAnnotationSpec: GoslingTrackSpec = {
  id: "gene-annotation",
  alignment: "overlay",
  title: "Gene Annotation (GENCODE)",
  data: {
    url: GENE_ANNOTATION_URL,
    type: "beddb",
    genomicFields: [
      { index: 1, name: "start" },
      { index: 2, name: "end" },
    ],
    valueFields: [
      { index: 5, name: "strand", type: "nominal" },
      { index: 3, name: "name", type: "nominal" },
    ],
    exonIntervalFields: [
      { index: 12, name: "start" },
      { index: 13, name: "end" },
    ],
  },
  tracks: [
    // Forward-strand triangle marker at the gene end
    {
      dataTransform: [
        { type: "filter", field: "type", oneOf: ["gene"] },
        { type: "filter", field: "strand", oneOf: ["+"] },
      ],
      mark: "triangleRight",
      x: { field: "end", type: "genomic", axis: "top", linkingId: LINKING_ID },
      size: { value: 15 },
    },
    // Gene name labels
    {
      dataTransform: [{ type: "filter", field: "type", oneOf: ["gene"] }],
      mark: "text",
      text: { field: "name", type: "nominal" },
      x: { field: "start", type: "genomic", linkingId: LINKING_ID },
      xe: { field: "end", type: "genomic" },
      style: { dy: -15 },
    },
    // Reverse-strand triangle marker at the gene start
    {
      dataTransform: [
        { type: "filter", field: "type", oneOf: ["gene"] },
        { type: "filter", field: "strand", oneOf: ["-"] },
      ],
      mark: "triangleLeft",
      x: { field: "start", type: "genomic", linkingId: LINKING_ID },
      size: { value: 15 },
      style: { align: "right" },
    },
    // Exon rectangles
    {
      dataTransform: [{ type: "filter", field: "type", oneOf: ["exon"] }],
      mark: "rect",
      x: { field: "start", type: "genomic", linkingId: LINKING_ID },
      size: { value: 15 },
      xe: { field: "end", type: "genomic" },
    },
    // Forward-strand directional rule
    {
      dataTransform: [
        { type: "filter", field: "type", oneOf: ["gene"] },
        { type: "filter", field: "strand", oneOf: ["+"] },
      ],
      mark: "rule",
      x: { field: "start", type: "genomic", linkingId: LINKING_ID },
      strokeWidth: { value: 3 },
      xe: { field: "end", type: "genomic" },
      style: { linePattern: { type: "triangleRight", size: 5 } },
    },
    // Reverse-strand directional rule
    {
      dataTransform: [
        { type: "filter", field: "type", oneOf: ["gene"] },
        { type: "filter", field: "strand", oneOf: ["-"] },
      ],
      mark: "rule",
      x: { field: "start", type: "genomic", linkingId: LINKING_ID },
      strokeWidth: { value: 3 },
      xe: { field: "end", type: "genomic" },
      style: { linePattern: { type: "triangleLeft", size: 5 } },
    },
  ],
  row: { field: "strand", type: "nominal", domain: ["+", "-"] },
  color: {
    field: "strand",
    type: "nominal",
    domain: ["+", "-"],
    range: ["#7585FF", "#FF8A85"],
  },
  visibility: [
    {
      operation: "less-than",
      measure: "width",
      threshold: "|xe-x|",
      transitionPadding: 10,
      target: "mark",
    },
  ],
  tooltip: [
    { field: "start", type: "genomic", alt: "Start Position" },
    { field: "end", type: "genomic", alt: "End Position" },
    { field: "name", type: "nominal", alt: "Gene Name" },
    { field: "strand", type: "nominal", alt: "Strand" },
  ],
  opacity: { value: 0.8 },
  width: 350,
  height: 100,
};

export const geneAnnotationTrack: StaticTrack = {
  kind: "static",
  id: "gene-annotation",
  name: "Gene Annotation",
  description:
    "GENCODE gene annotations: gene bodies, exons, strand orientation, and labels.",
  category: "annotation",
  defaultHeight: 100,
  icon: Dna,
  curated: true,
  specs: [geneAnnotationSpec],
};
