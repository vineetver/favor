export const EPIGENETICS_CHART_CONFIG = {
  title: "Chromatin Landscape",
  subtitle: "Epigenetic regulatory activity scores",
  keys: ["value"],
  colors: ["#4ade80", "#fbbf24", "#818cf8", "#f87171", "#c084fc", "#60a5fa", "#9ca3af"],
  yLabel: "PHRED Epigenetics Score",
  height: 550,
  margin: { top: 5, right: 10, bottom: 30, left: 10 },
} as const;