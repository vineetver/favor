import { AssayInfo } from "@/lib/variant/ccre/tissue-config";
import { TrackMetadata } from "@/lib/tracks/types";

export interface DynamicTrack extends TrackMetadata {
  isDynamic: true;
  tissueSource: {
    tissue: string;
    subtissue: string;
    assay: string;
  };
}

// Color mapping for different assay types
const assayColorMap: { [key: string]: string } = {
  dnase: "#2563eb", // Blue
  ctcf: "#dc2626", // Red
  h3k4me3: "#16a34a", // Green
  h3k27ac: "#ca8a04", // Yellow/Gold
  atac: "#7c3aed", // Purple
  h3k4me1: "#ea580c", // Orange
  h3k27me3: "#0891b2", // Cyan
  ccres: "#ec4899", // Pink
};

// Generate unique track ID for tissue-specific tracks
export function assayTrackId(
  assayName: string,
  selectedSubtissue: string,
): string {
  const sanitizedSubtissue = selectedSubtissue
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `dynamic_${assayName}_${sanitizedSubtissue}`;
}

// Extract tissue and subtissue display names
function extractTissueDisplayName(tissue: string): string {
  return tissue.charAt(0).toUpperCase() + tissue.slice(1);
}

function extractSubtissueDisplayName(subtissue: string): string {
  // Take the first part before comma and capitalize
  const firstPart = subtissue.split(",")[0];
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
}

function createTrackDisplayName(
  tissue: string,
  subtissue: string,
  assayName: string,
): string {
  const tissueDisplay = extractTissueDisplayName(tissue);
  const subtissueDisplay = extractSubtissueDisplayName(subtissue);
  const signalDisplay = assayName.toUpperCase();

  return `${tissueDisplay} - ${subtissueDisplay} — ${signalDisplay}`;
}

// Generate dynamic track from tissue config assay
export function generateDynamicTrack(
  tissue: string,
  subtissue: string,
  assay: AssayInfo,
): DynamicTrack | null {
  // Skip assays without bigwig data
  if (!assay.bigwig) {
    return null;
  }

  const assayName = assay.name.toLowerCase();
  const trackId = assayTrackId(assayName, subtissue);
  const color = assayColorMap[assayName] || "#6b7280"; // Default gray

  const trackDisplayName = createTrackDisplayName(
    tissue,
    subtissue,
    assay.name,
  );
  const tissueDisplayName = extractTissueDisplayName(tissue);
  const subtissueDisplayName = extractSubtissueDisplayName(subtissue);

  return {
    id: trackId,
    name: trackDisplayName,
    description: `${assay.name.toUpperCase()} signal data for ${tissueDisplayName} - ${subtissueDisplayName}`,
    category: "tissue-specific",
    visible: true,
    isDynamic: true,
    tissueSource: {
      tissue,
      subtissue,
      assay: assay.name,
    },
    color: color,
    order: 1000,
    enabled: true,
    version: "1.0",
    authors: ["Favor Team"],
    documentation: {
      dataSource: `Assay data for ${assay.name} in ${tissue} - ${subtissue}`,
      overview: `This track displays ${assay.name.toUpperCase()} signal for the ${tissueDisplayName} - ${subtissueDisplayName}`,
      methodology: `Data is sourced from ${assay.name} assays, visualized as a bar chart.`,
      interpretation: `The ${assay.name.toUpperCase()} signal indicates the level of ${assay.name} activity in the specified tissue and subtissue.`,
      references: [
        "https://example.com/reference1",
        "https://example.com/reference2",
      ],
      lastUpdated: new Date().toISOString(),
    },
    interactions: {
      supportedViewTypes: ["overlay"],
      linkingSupported: true,
      zoomBehavior: "adaptive",
    },
    performance: {
      renderTime: "fast",
      memoryUsage: "low",
      dataSize: "medium",
    },
    customization: {
      colorable: true,
      heightAdjustable: true,
      filtersAvailable: ["start", "end", "value"],
    },
    height: 80,
    track: {
      alignment: "overlay",
      title: trackDisplayName,
      data: {
        url: assay.bigwig,
        type: "bigwig",
        column: "position",
        value: "value",
        aggregation: "mean",
        binSize: 1,
      },
      tracks: [
        {
          mark: "bar",
          x: { field: "start", type: "genomic", linkingId: "link1" },
          xe: { field: "end", type: "genomic" },
          y: { field: "value", type: "quantitative", axis: "right" },
          color: { value: color },
          stroke: { value: color },
          strokeWidth: { value: 0.8 },
          opacity: { value: 0.7 },
          tooltip: [
            {
              field: "value",
              type: "quantitative",
              alt: `${assay.name.toUpperCase()} signal`,
            },
            {
              field: "start",
              type: "genomic",
              alt: "Start position",
            },
            {
              field: "end",
              type: "genomic",
              alt: "End position",
            },
          ],
        },
      ],
      width: 800,
      height: 80,
    },
  };
}

// Generate all available dynamic tracks for a tissue/subtissue combination
export function generateTissueSpecificTracks(
  tissue: string,
  subtissue: string,
  assays: AssayInfo[],
): DynamicTrack[] {
  return assays
    .map((assay) => generateDynamicTrack(tissue, subtissue, assay))
    .filter((track): track is DynamicTrack => track !== null);
}
