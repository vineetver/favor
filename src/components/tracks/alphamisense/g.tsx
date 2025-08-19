import { Track } from "@/components/gosling";

const alphamisense_g_URL =
  "http://hgdownload.soe.ucsc.edu/gbdb/hg38/alphaMissense/g.bw";

export const alphamisense_gTrack: Track = {
  alignment: "overlay",
  title: "AlphaMissense (Mutation is G)",
  data: {
    url: alphamisense_g_URL,
    type: "bigwig",
    column: "position",
    value: "value",
    aggregation: "sum",
    binSize: 4,
  },
  tracks: [
    {
      dataTransform: [
        {
          type: "filter",
          inRange: [0.34, 0.564],
          field: "value",
          not: true,
        },
      ],
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      y: { field: "value", type: "quantitative", axis: "right" },
      color: { value: "#FF5733" }, // Example color
      stroke: { value: "#FF5733" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
    },
    {
      dataTransform: [
        {
          type: "filter",
          inRange: [0.564, 1],
          field: "value",
          not: true,
        },
      ],
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      y: { field: "value", type: "quantitative", axis: "right" },
      color: { value: "#FFB300" }, // Example color
      stroke: { value: "#FFB300" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        {
          field: "start",
          type: "genomic",
          alt: "Genomic Position",
        },
        {
          field: "value",
          type: "quantitative",
          alt: "AlphaMissense Score: Mutation is G",
        },
      ],
    },
    {
      dataTransform: [
        {
          type: "filter",
          inRange: [0, 0.34],
          field: "value",
          not: true,
        },
      ],
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      y: { field: "value", type: "quantitative", axis: "right" },
      color: {
        value: "#33FF57",
      },
      stroke: { value: "#33FF57" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        {
          field: "start",
          type: "genomic",
          alt: "Genomic Position",
        },
        {
          field: "value",
          type: "quantitative",
          alt: "AlphaMissense Score (Mutation is G): Likely Benign (score ≤ 0.34)",
        },
      ],
    },
  ],
  tooltip: [
    {
      field: "start",
      type: "genomic",
      alt: "Genomic Position",
    },
    {
      field: "value",
      type: "quantitative",
      alt: "AlphaMissense Score: Mutation is G",
    },
  ],
  width: 800,
  height: 60,
};
