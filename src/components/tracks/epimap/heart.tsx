const epimapHeartURL =
  "https://dataverse.harvard.edu/api/access/datafile/10846106";

export const epimapheartTrack = {
  alignment: "overlay",
  title: "Epimap Heart",
  data: {
    url: epimapHeartURL,
    type: "bigwig",
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
        { field: "value", type: "quantitative", alt: "Epimap Heart" },
      ],
    },
  ],
  width: 800,
  height: 150,
};
