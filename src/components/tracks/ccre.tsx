import { Track } from "@/components/gosling";

const cCRETrackUrl =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=ccre-updated-hg38";

// Define the cCRE color mapping based on your specified values
export const ccreColorMapping = {
  PLS: "#dc2626",
  pELS: "#ea580c",
  dELS: "#fddc69",
  "CA-CTCF": "#0053DB",
  "CA-H3K4me3": "#ea580c",
  "CA-TF": "#9333ea",
  CA: "#62DF7D",
  TF: "#ec4899",
};

export const cCRETrack: Track = {
  alignment: "overlay",
  title: "cCREs",
  data: {
    url: cCRETrackUrl,
    type: "beddb",
    genomicFields: [
      { index: 1, name: "start" },
      { index: 2, name: "end" },
    ],
    valueFields: [
      { index: 0, name: "chromosome", type: "nominal" },
      { index: 1, name: "start_position", type: "nominal" },
      { index: 2, name: "end_position", type: "nominal" },
      { index: 3, name: "elementId", type: "nominal" },
      { index: 4, name: "accession", type: "nominal" },
      { index: 5, name: "ccre", type: "nominal" },
      { index: 6, name: "ccre_full", type: "nominal" },
    ],
  },
  tracks: [
    {
      dataTransform: [
        {
          type: "concat",
          separator: "-",
          newField: "region",
          fields: ["chromosome", "start_position", "end_position"],
        },
      ],
      mark: "rect",
      size: {
        value: 10,
      },
      x: { field: "start", type: "genomic", linkingId: "link1" },
      xe: { field: "end", type: "genomic" },
      row: {
        field: "ccre",
        type: "nominal",
        domain: [
          "PLS",
          "pELS",
          "dELS",
          "CA-CTCF",
          "CA-H3K4me3",
          "CA-TF",
          "CA",
          "TF",
        ],
        padding: 1,
      },
      color: {
        field: "ccre_full",
        type: "nominal",
        domain: [
          "Promoter",
          "Proximal enhancer",
          "Distal enhancer",
          "Chromatin Accessible with CTCF",
          "Chromatin Accessible with H3K4me3",
          "Chromatin Accessible with TF",
          "Chromatin Accessible Only",
          "TF Only",
        ],
        range: [
          ccreColorMapping["PLS"],
          ccreColorMapping["pELS"],
          ccreColorMapping["dELS"],
          ccreColorMapping["CA-CTCF"],
          ccreColorMapping["CA-H3K4me3"],
          ccreColorMapping["CA-TF"],
          ccreColorMapping["CA"],
          ccreColorMapping["TF"],
        ],
        legend: true,
      },
      opacity: { value: 0.8 },
    },
  ],
  mouseEvents: {
    mouseOver: true,
    rangeSelect: true,
    groupMarksByField: "name",
  },
  tooltip: [
    { field: "ccre_full", type: "nominal", alt: "cCRE Type" },
    { field: "accession", type: "nominal", alt: "Accession" },
  ],
  width: 900,
  height: 190,
};
