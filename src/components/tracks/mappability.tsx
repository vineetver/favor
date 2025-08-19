import type { Track } from "@/components/gosling";

export const mappabilityk24BismapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k24 Bismap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k24-bismap-hg38",
    type: "vector",
    binSize: 4,
  },
  tracks: [
    {
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      xe: { field: "end", type: "genomic" },
      y: { field: "value", type: "quantitative" },
      color: { value: "red" },
      stroke: { value: "red" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};

export const mappabilityk24UmapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k24 Umap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k24-umap-hg38",
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
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};

export const mappabilityk36BismapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k36 Bismap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k36-bismap-hg38",
    type: "vector",
    binSize: 4,
  },
  tracks: [
    {
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      xe: { field: "end", type: "genomic" },
      y: { field: "value", type: "quantitative" },
      color: { value: "red" },
      stroke: { value: "red" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};

export const mappabilityk36UmapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k36 Umap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k36-umap-hg38",
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
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};

export const mappabilityk50BismapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k50 Bismap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k50-bismap-hg38",
    type: "vector",
    binSize: 4,
  },
  tracks: [
    {
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      xe: { field: "end", type: "genomic" },
      y: { field: "value", type: "quantitative" },
      color: { value: "red" },
      stroke: { value: "red" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};

export const mappabilityk50UmapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k50 Umap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k50-umap-hg38",
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
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};

export const mappabilityk100BismapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k100 Bismap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k100-bismap-hg38",
    type: "vector",
    binSize: 4,
  },
  tracks: [
    {
      mark: "bar",
      x: { field: "start", type: "genomic", linkingId: "link1" },
      xe: { field: "end", type: "genomic" },
      y: { field: "value", type: "quantitative" },
      color: { value: "red" },
      stroke: { value: "red" },
      strokeWidth: { value: 0.8 },
      opacity: { value: 0.7 },
      tooltip: [
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};

export const mappabilityk100UmapTrack: Track = {
  alignment: "overlay",
  title: "Mappability (k100 Umap)",
  data: {
    url: "https://higlass.genohub.org/api/v1/tileset_info/?d=mappability-k100-umap-hg38",
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
        { field: "value", type: "quantitative", alt: "Mappability Score" },
      ],
    },
  ],
  width: 900,
  height: 60,
};
