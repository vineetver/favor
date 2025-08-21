import { chord, ribbon } from "d3-chord";
import { arc } from "d3-shape";
import type { ChordData, NetworkNode } from "@/components/features/gene/ppi/shared/types";
import type { ChordConfig, ChordArc } from "@/components/features/gene/ppi/visualizations/chord/chord-types";

export function createChordLayout(data: ChordData, config: ChordConfig) {
  const chordLayout = chord()
    .padAngle(config.padAngle)
    .sortSubgroups((a: number, b: number) => b - a);

  const chords = chordLayout(data.matrix);

  const arcGenerator = arc<any>()
    .innerRadius(config.innerRadius)
    .outerRadius(config.outerRadius);

  const ribbonGenerator = ribbon<any, any>().radius(config.innerRadius);

  return {
    chords,
    arcGenerator,
    ribbonGenerator,
  };
}

export function getChordColors(
  nodeData: Record<string, NetworkNode>,
  queryGene?: string,
): string[] {
  const colors: string[] = [];

  Object.values(nodeData).forEach((node) => {
    if (node.isQueryGene || (queryGene && node.id === queryGene)) {
      colors.push("#ef4444"); // red for query gene
    } else if (node.degree && node.degree >= 5) {
      colors.push("#f59e0b"); // amber for highly connected
    } else {
      colors.push("#3b82f6"); // blue for regular nodes
    }
  });

  return colors;
}

export function getDefaultChordConfig(
  width: number,
  height: number,
): ChordConfig {
  const size = Math.min(width, height);
  const outerRadius = size * 0.4;
  const innerRadius = outerRadius - 20;

  return {
    innerRadius,
    outerRadius,
    padAngle: 0.05,
    colors: [],
  };
}

export function formatChordTooltip(
  nodeLabel: string,
  nodeData: NetworkNode,
  value: number,
): string {
  const geneType = nodeData.isQueryGene
    ? "Query Gene"
    : nodeData.degree && nodeData.degree >= 5
      ? "Highly Connected"
      : "Interacting Gene";

  return `${nodeLabel}\n${geneType}\nConnections: ${value}\nDegree: ${nodeData.degree || 0}`;
}

export function formatRibbonTooltip(
  sourceLabel: string,
  targetLabel: string,
  value: number,
): string {
  return `${sourceLabel} ↔ ${targetLabel}\nInteraction Strength: ${value}`;
}

export function getNodeAtPosition(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  arcs: ChordArc[],
  outerRadius: number,
): string | null {
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > outerRadius) return null;

  let angle = Math.atan2(dy, dx);
  if (angle < 0) angle += 2 * Math.PI;

  // Adjust for SVG coordinate system (0 degrees is at top)
  angle = (angle + Math.PI / 2) % (2 * Math.PI);

  for (const arc of arcs) {
    if (angle >= arc.startAngle && angle <= arc.endAngle) {
      return arc.nodeData.id;
    }
  }

  return null;
}
