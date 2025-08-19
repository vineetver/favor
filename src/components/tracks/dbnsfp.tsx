import type { Track } from "@/components/gosling";

const gerpnURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=dbnsfp-gerpn-hg38";
const gerprURL =
  "https://higlass.genohub.org/api/v1/tileset_info/?d=dbnsfp-gerpr-hg38";

export const gerpNTrack: Track = {
  alignment: "overlay",
  title: "GerpN",
  data: {
    url: gerpnURL,
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
        { field: "value", type: "quantitative", alt: "dbNSFP GerpN" },
      ],
    },
  ],
  width: 800,
  height: 60,
};

export const gerpRTrack: Track = {
  alignment: "overlay",
  title: "GerpR",
  data: {
    url: gerprURL,
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
        { field: "value", type: "quantitative", alt: "dbNSFP GerpR" },
      ],
    },
  ],
  width: 800,
  height: 60,
};

export const dbnsfpGerpRTrack = {
  alignment: "overlay",
  title: "GerpR",
  data: {
    url: gerprURL,
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
        { field: "value", type: "quantitative", alt: "dbNSFP GerpR" },
      ],
    },
  ],
  width: 800,
  height: 60,
};
