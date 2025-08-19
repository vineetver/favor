const chromURL = "https://dataverse.harvard.edu/api/access/datafile/10872288";
const chromIndexURL =
  "https://dataverse.harvard.edu/api/access/datafile/10872287";

export const chromHMMTrack = {
  alignment: "overlay",
  title: "Chromatin State Discovery and Characterization from Roadmap",
  data: {
    url: chromURL,
    indexUrl: chromIndexURL,
    type: "bed",
    customFields: ["fullname"],
  },
  tracks: [
    {
      mark: "rect",
      size: { value: 10 },
      x: { field: "chromStart", type: "genomic", linkingId: "link1" },
      xe: { field: "chromEnd", type: "genomic" },
      y: { field: "fullname", type: "nominal" },
      row: {
        field: "fullname",
        type: "nominal",
        domain: [
          "Active TSS",
          "Flanking TSS",
          "Upstream Flanking TSS",
          "Downstream Flanking TSS",
          "Transcription",
          "Weak Transcription",
          "Active Enhancer 1",
          "Active Enhancer 2",
          "Genic Enhancer 1",
          "Genic Enhancer 2",
          "Weak Enhancer",
          "Bivalent Enhancer",
          "ZNF Genes & Repeats",
          "Heterochromatin",
          "Bivalent TSS",
          "Repressed Polycomb",
          "Weak Repressed Polycomb",
          "Quiescent",
        ],
      },
      color: {
        field: "fullname",
        type: "nominal",
        domain: [
          "Active TSS",
          "Flanking TSS",
          "Upstream Flanking TSS",
          "Downstream Flanking TSS",
          "Transcription",
          "Weak Transcription",
          "Active Enhancer 1",
          "Active Enhancer 2",
          "Genic Enhancer 1",
          "Genic Enhancer 2",
          "Weak Enhancer",
          "Bivalent Enhancer",
          "ZNF Genes & Repeats",
          "Heterochromatin",
          "Bivalent TSS",
          "Repressed Polycomb",
          "Weak Repressed Polycomb",
          "Quiescent",
        ],
        range: [
          "#FF0000", // Active TSS - Red
          "#FF4500", // Flanking TSS - OrangeRed
          "#FFA07A", // Upstream Flanking TSS - LightSalmon
          "#FF6347", // Downstream Flanking TSS - Tomato
          "#006400", // Transcription - LimeGreen
          "#32CD32", // Weak Transcription - DarkGreen
          "#ADFF2F", // Active Enhancer 1 - GreenYellow
          "#9ACD32", // Active Enhancer 2 - YellowGreen
          "#7FFF00", // Genic Enhancer 1 - Chartreuse
          "#76EE00", // Genic Enhancer 2 - Green2
          "#FFFF00", // Weak Enhancer - Yellow
          "#BDB76B", // Bivalent Enhancer - DarkKhaki
          "#66CDAA", // ZNF Genes & Repeats - MediumAquamarine
          "#AFEEEE", // Heterochromatin - PaleTurquoise
          "#CD5C5C", // Bivalent TSS - IndianRed
          "#C0C0C0", // Repressed Polycomb - Silver
          "#DCDCDC", // Weak Repressed Polycomb - Gainsboro
          "#FFFFFF", // Quiescent - White
        ],
        legend: true,
      },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        { field: "fullname", type: "nominal", alt: "chromHMM State" },
        { field: "chromStart", type: "genomic", alt: "Start" },
        { field: "chromEnd", type: "genomic", alt: "End" },
      ],
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
  width: 800,
  height: 410,
};
