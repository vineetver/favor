import type { Track } from "@/components/gosling";

const recomb100gavgURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=recomb-1000g-avg-hg38";
const recombavgURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=recomb-avg-hg38";
const recombMatURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=recomb-mat-hg38";
const recombPatURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=recomb-pat-hg38";

export const recomb1000gAvgTrack: Track = {
  alignment: "overlay",
  title: "Recombination Rate (1000 Genomes Project) Avg",
  data: {
    url: recomb100gavgURL,
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
        { field: "value", type: "quantitative", alt: "Recombination Rate" },
      ],
    },
  ],
  width: 800,
  height: 70,
};

export const recombAvgTrack: Track = {
  alignment: "overlay",
  title: "Recombination Rate Avg",
  data: {
    url: recombavgURL,
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
        { field: "value", type: "quantitative", alt: "Recombination Rate" },
      ],
    },
  ],
  width: 800,
  height: 70,
};

export const recombMatTrack: Track = {
  alignment: "overlay",
  title: "Recombination Rate Maternal",
  data: {
    url: recombMatURL,
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
        { field: "value", type: "quantitative", alt: "Recombination Rate" },
      ],
    },
  ],
  width: 800,
  height: 70,
};

export const recombPatTrack: Track = {
  alignment: "overlay",
  title: "Recombination Rate Paternal",
  data: {
    url: recombPatURL,
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
        { field: "value", type: "quantitative", alt: "Recombination Rate" },
      ],
    },
  ],
  width: 800,
  height: 70,
};
