const epimapAdiposeURL =
  "https://dataverse.harvard.edu/api/access/datafile/10846090";

export const epimapAdiposeTrack = {
  alignment: "overlay",
  title: "Epimap Adipose",
  data: {
    url: epimapAdiposeURL,
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
        { field: "value", type: "quantitative", alt: "Epimap Adipose" },
      ],
    },
  ],
  width: 800,
  height: 150,
};
