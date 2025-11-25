import { Track } from "@/components/gosling";

const alphamisense_g_URL =
  "http://hgdownload.soe.ucsc.edu/gbdb/hg38/alphaMissense/g.bw";

export const alphamisense_gTrack: Track = {
  title: "AlphaMissense (Mutation G)",
  data: {
    url: alphamisense_g_URL,
    type: "bigwig",
    column: "position",
    value: "value",
    aggregation: "sum",
    binSize: 4,
  },
  mark: "bar",
  x: { field: "start", type: "genomic", linkingId: "link1" },
  xe: { field: "end", type: "genomic" },
  y: { field: "value", type: "quantitative", axis: "right" },
  color: {
    field: "value",
    type: "quantitative",
    domain: [0, 0.34, 0.34, 0.564, 0.564, 1],
    range: ["#10b981", "#10b981", "#f59e0b", "#f59e0b", "#dc2626", "#dc2626"],
    legend: true,
  },
  stroke: {
    field: "value",
    type: "quantitative",
    domain: [0, 0.34, 0.34, 0.564, 0.564, 1],
    range: ["#10b981", "#10b981", "#f59e0b", "#f59e0b", "#dc2626", "#dc2626"],
  },
  strokeWidth: { value: 0.8 },
  opacity: { value: 0.7 },
  tooltip: [
    {
      field: "value",
      type: "quantitative",
      alt: "Score",
      format: ".3f",
    },
    {
      field: "start",
      type: "genomic",
      alt: "Region Start",
    },
    {
      field: "end",
      type: "genomic",
      alt: "Region End",
    },
  ],
  width: 800,
  height: 80,
};
