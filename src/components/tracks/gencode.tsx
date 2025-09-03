import type { Track } from "@/components/gosling";

const gencodeURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=gencode-hg38";

export const gencodeTrack: Track = {
  alignment: "overlay",
  title: "GENCODE",
  data: {
    url: gencodeURL,
    type: "beddb",
    genomicFields: [
      { index: 1, name: "start" },
      { index: 2, name: "end" },
    ],
    valueFields: [
      { index: 0, name: "chromosome", type: "nominal" },
      { index: 1, name: "start_position", type: "quantitative" },
      { index: 2, name: "end_position", type: "quantitative" },
      { index: 5, name: "strand", type: "nominal" },
      { index: 19, name: "geneType", type: "nominal" },
      { index: 17, name: "geneName", type: "nominal" },
    ],
  },
  tracks: [
    {
      dataTransform: [
        {
          type: "filter",
          field: "geneType",
          oneOf: [
            "protein_coding",
            "TR_C_gene",
            "TR_D_gene",
            "TR_J_gene",
            "TR_V_gene",
            "IG_C_gene",
            "IG_D_gene",
            "IG_J_gene",
            "IG_V_gene",
          ],
        },
        { type: "filter", field: "strand", oneOf: ["+"] },
        {
          type: "replace",
          field: "geneType",
          replace: [
            { from: "protein_coding", to: "Protein coding" },
            { from: "TR_C_gene", to: "Protein coding" },
            { from: "TR_D_gene", to: "Protein coding" },
            { from: "TR_J_gene", to: "Protein coding" },
            { from: "TR_V_gene", to: "Protein coding" },
            { from: "IG_C_gene", to: "Protein coding" },
            { from: "IG_D_gene", to: "Protein coding" },
            { from: "IG_J_gene", to: "Protein coding" },
            { from: "IG_V_gene", to: "Protein coding" },
          ],
          newField: "gene_type",
        },
        {
          type: "concat",
          separator: "-",
          newField: "region",
          fields: ["chromosome", "start_position", "end_position"],
        },
      ],
      mark: "triangleRight",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      size: { value: 15 },
      color: { value: "purple" },
      tooltip: [
        { field: "region", type: "nominal", alt: "Actual location" },
        { field: "geneName", type: "nominal", alt: "Gene Name" },
        { field: "gene_type", type: "nominal", alt: "Gene Type" },
      ],
    },
    {
      dataTransform: [
        {
          type: "filter",
          field: "geneType",
          oneOf: [
            "protein_coding",
            "TR_C_gene",
            "TR_D_gene",
            "TR_J_gene",
            "TR_V_gene",
            "IG_C_gene",
            "IG_D_gene",
            "IG_J_gene",
            "IG_V_gene",
          ],
        },
        {
          type: "concat",
          separator: "-",
          newField: "region",
          fields: ["chromosome", "start_position", "end_position"],
        },
        { type: "filter", field: "strand", oneOf: ["-"] },
        {
          type: "replace",
          field: "geneType",
          replace: [
            { from: "protein_coding", to: "Protein coding" },
            { from: "TR_C_gene", to: "Protein coding" },
            { from: "TR_D_gene", to: "Protein coding" },
            { from: "TR_J_gene", to: "Protein coding" },
            { from: "TR_V_gene", to: "Protein coding" },
            { from: "IG_C_gene", to: "Protein coding" },
            { from: "IG_D_gene", to: "Protein coding" },
            { from: "IG_J_gene", to: "Protein coding" },
            { from: "IG_V_gene", to: "Protein coding" },
          ],
          newField: "gene_type",
        },
      ],
      mark: "triangleLeft",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      size: { value: 15 },
      color: { value: "purple" },
    },
  ],

  row: {
    field: "strand",
    type: "nominal",
    domain: ["+", "-"],
  },
  width: 800,
  height: 120,
};

// // Non-Coding Transcripts
// {
//     "dataTransform": [
//         {
//             "type": "filter",
//             "field": "geneType",
//             "oneOf": [
//                 "lncRNA", "miRNA", "misc_RNA", "rRNA",
//                 "snRNA", "snoRNA", "scaRNA", "vault_RNA",
//                 "Mt_rRNA", "Mt_tRNA", "scRNA", "sRNA",
//                 "ribozyme"
//             ]
//         }
//     ],
//     "mark": "triangleRight",
//     "x": { "field": "start", "type": "genomic" },
//     "xe": { "field": "end", "type": "genomic" },
//     "color": { "value": "green" },
//     "size": { "value": 15 },
//     "tooltip": [
//         { "field": "geneName", "type": "nominal", "alt": "Gene Name" },
//         { "field": "geneType", "type": "nominal", "alt": "Gene Type" }
//     ]
// },
// // Pseudogenes
// {
//     "dataTransform": [
//         {
//             "type": "filter",
//             "field": "geneType",
//             "oneOf": [
//                 "processed_pseudogene", "pseudogene", "unprocessed_pseudogene",
//                 "transcribed_processed_pseudogene", "transcribed_unitary_pseudogene",
//                 "transcribed_unprocessed_pseudogene", "translated_processed_pseudogene",
//                 "unitary_pseudogene", "IG_C_pseudogene", "IG_J_pseudogene",
//                 "IG_V_pseudogene", "TR_J_pseudogene", "TR_V_pseudogene",
//                 "rRNA_pseudogene", "IG_pseudogene"
//             ]
//         }
//     ],
//     "mark": "point",
//     "x": { "field": "start", "type": "genomic" },
//     "xe": { "field": "end", "type": "genomic" },
//     "color": { "value": "orange" },
//     "size": { "value": 15 },
//     "tooltip": [
//         { "field": "geneName", "type": "nominal", "alt": "Gene Name" },
//         { "field": "geneType", "type": "nominal", "alt": "Gene Type" }
//     ]
// },
// // Problem Transcripts
// {
//     "dataTransform": [
//         {
//             "type": "filter",
//             "field": "geneType",
//             "oneOf": ["TEC", "artifact"]
//         }
//     ],
//     "mark": "rect",
//     "x": { "field": "start", "type": "genomic" },
//     "xe": { "field": "end", "type": "genomic" },
//     "color": { "value": "red" },
//     "size": { "value": 15 },
//     "opacity": { "value": 0.7 },
//     "tooltip": [
//         { "field": "geneName", "type": "nominal", "alt": "Gene Name" },
//         { "field": "geneType", "type": "nominal", "alt": "Gene Type" }
//     ]
// }
