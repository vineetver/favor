import { Track } from "@/components/gosling";

export const gennochiTrack: Track = {
  alignment: "overlay",
  title:
    "Gnocchi: Genome Aggregation Database (gnomAD) non-coding constraint of haploinsufficient variation",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=genocchi-hg38",
    type: "vector",
  },
  tracks: [
    {
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      xe: { field: "end", type: "genomic" },
      y: { field: "value", type: "quantitative" },
      color: { value: "blue" },
      stroke: { value: "blue" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        { field: "start", type: "genomic", alt: "Start Position" },
        { field: "end", type: "genomic", alt: "End Position" },
        { field: "value", type: "quantitative", alt: "Gnocchi Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};
