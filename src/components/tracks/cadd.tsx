import type { Track } from "@/components/gosling";

const caddAURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=cadd-a-hg38";
const caddCURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=cadd-c-hg38";
const caddGURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=cadd-g-hg38";
const caddTURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=cadd-t-hg38";

export const caddATrack: Track = {
  alignment: "overlay",
  title: "CADD 1.7 (Mutation A)",
  data: {
    url: caddAURL,
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
        { field: "value", type: "quantitative", alt: "CADD 1.7 (Mutation A)" },
      ],
    },
  ],
  width: 800,
  height: 60,
};

export const caddCTrack: Track = {
  alignment: "overlay",
  title: "CADD 1.7 (Mutation C)",
  data: {
    url: caddCURL,
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
        { field: "value", type: "quantitative", alt: "CADD 1.7 (Mutation C)" },
      ],
    },
  ],
  width: 800,
  height: 60,
};

export const caddGTrack: Track = {
  alignment: "overlay",
  title: "CADD 1.7 (Mutation G)",
  data: {
    url: caddGURL,
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
        { field: "value", type: "quantitative", alt: "CADD 1.7 (Mutation G)" },
      ],
    },
  ],
  width: 800,
  height: 60,
};

export const caddTTrack: Track = {
  alignment: "overlay",
  title: "CADD 1.7 (Mutation T)",
  data: {
    url: caddTURL,
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
        { field: "value", type: "quantitative", alt: "CADD 1.7 (Mutation T)" },
      ],
    },
  ],
  width: 800,
  height: 60,
};
