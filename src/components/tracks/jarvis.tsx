import { Track } from "@/components/gosling";

const jarvisURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=jarvis-hg38";

export const jarvisTrack: Track = {
  alignment: "overlay",
  title: "JARVIS: score to prioritize non-coding regions for disease relevance",
  data: {
    url: jarvisURL,
    type: "vector",
    binSize: 4,
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
        { field: "value", type: "quantitative", alt: "Jarvis" },
      ],
    },
  ],
  width: 800,
  height: 60,
};
