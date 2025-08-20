import type { GWAS, EfoNode } from "@/lib/variant/gwas/api";
import type {
  ProcessedGwasData,
  CategoryProcessingResult,
  JitterConfig,
} from "@/lib/variant/gwas/types";
import {
  GWAS_CONSTANTS,
  KEYWORD_PATTERNS,
  CATEGORY_COLOR_MAP,
} from "@/lib/variant/gwas/constants";

export function getKeywordCategory(trait: string): string {
  for (const [category, pattern] of Object.entries(KEYWORD_PATTERNS)) {
    if (pattern.test(trait)) {
      return category;
    }
  }
  return "Other";
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLOR_MAP[category] || GWAS_CONSTANTS.COLORS.DEFAULT_POINT;
}

function traverseForLevel(
  node: EfoNode,
  currentLevel: number,
  targetLevel: number,
): string | null {
  if (currentLevel === targetLevel) {
    return node.label;
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const result = traverseForLevel(child, currentLevel + 1, targetLevel);
      if (result) {
        return result;
      }
    }
  }
  return null;
}

export function getEfoLabelAtLevel(
  efoNodes: EfoNode[],
  targetLevel: number,
): string {
  let label: string | null = null;
  for (const node of efoNodes) {
    label = traverseForLevel(node, 1, targetLevel);
    if (label !== null) break;
  }
  if (label) {
    return label;
  }

  let deepestLabel = "";
  let maxDepth = 0;

  function traverseDeep(node: EfoNode, depth: number) {
    if (depth > maxDepth) {
      maxDepth = depth;
      deepestLabel = node.label;
    }
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => traverseDeep(child, depth + 1));
    }
  }

  efoNodes.forEach((node) => traverseDeep(node, 1));
  return deepestLabel || "Other";
}

export function calculateEffectSizeRadius(effectSizeValue: number): number {
  const { MIN, MAX, DEFAULT, SCALE_FACTOR } = GWAS_CONSTANTS.EFFECT_SIZE_RADIUS;

  if (effectSizeValue === 0) {
    return DEFAULT;
  }

  return Math.max(
    MIN,
    Math.min(MAX, MIN + Math.log(effectSizeValue + 1) * SCALE_FACTOR),
  );
}

export function generateUniqueKey(gwasItem: GWAS, index: number): string {
  return `${gwasItem.rsid}-${index}`;
}

export function calculateStaggeredYPosition(
  originalYValue: number,
  rsid: string,
  trait: string,
): number {
  const {
    Y_AXIS_CUTOFF_THRESHOLD,
    TRIANGLE_STAGGER_MIN,
    TRIANGLE_STAGGER_MAX,
  } = GWAS_CONSTANTS;

  if (originalYValue <= Y_AXIS_CUTOFF_THRESHOLD) {
    return originalYValue;
  }

  const staggerSeed = (rsid.charCodeAt(rsid.length - 1) + trait.length) % 100;
  const staggerRange = TRIANGLE_STAGGER_MAX - TRIANGLE_STAGGER_MIN;
  const staggerOffset = (staggerSeed / 100) * staggerRange;

  return TRIANGLE_STAGGER_MIN + staggerOffset;
}

export function calculateJitteredPosition(
  categoryIndex: number,
  pointIndex: number,
  rsid: string,
  trait: string,
  jitterConfig: JitterConfig,
): { xValue: number; yOffset: number } {
  const rsidNum = parseInt(rsid.replace(/\D/g, "")) || pointIndex;
  const seed1 = rsidNum % 1000;
  const seed2 = trait.length * 17;
  const seed3 = pointIndex * 23;

  const jitterSeed = (seed1 + seed2 + seed3) % 2000;
  const normalizedJitter = jitterSeed / 2000 - 0.5;

  const xOffset = normalizedJitter * jitterConfig.xSpread;
  const xValue = categoryIndex + xOffset;

  const yJitterSeed = (seed1 * 3 + seed2 * 7) % 500;
  const yOffset = (yJitterSeed / 500 - 0.5) * jitterConfig.ySpread;

  return { xValue, yOffset };
}

export function processGwasDataForChart(
  data: GWAS[],
  targetEfoLevel: number = 3,
  jitterConfig: JitterConfig = {
    amount: GWAS_CONSTANTS.DEFAULT_JITTER_AMOUNT,
    xSpread: 0.9,
    ySpread: 0.15,
  },
): CategoryProcessingResult {
  const processed = data
    .map((d, index) => {
      let category = "Other";
      if (d.efo_hierarchy && d.efo_hierarchy.length > 0) {
        category = getEfoLabelAtLevel(d.efo_hierarchy, targetEfoLevel);
      } else {
        category = getKeywordCategory(d.gwas_disease_trait);
      }

      const effectSizeValue = d.gwas_or_or_beta
        ? Math.abs(Number(d.gwas_or_or_beta))
        : 0;
      const radius = calculateEffectSizeRadius(effectSizeValue);

      const originalYValue = Number(d.gwas_p_value_mlog);
      if (isNaN(originalYValue)) return null;

      const isAboveCutoff =
        originalYValue > GWAS_CONSTANTS.Y_AXIS_CUTOFF_THRESHOLD;
      const yValue = isAboveCutoff
        ? calculateStaggeredYPosition(
            originalYValue,
            d.rsid,
            d.gwas_disease_trait,
          )
        : originalYValue;

      return {
        ...d,
        category,
        xValue: 0,
        yValue,
        originalYValue,
        isAboveCutoff,
        radius,
        effectSize: effectSizeValue,
        uniqueKey: generateUniqueKey(d, index),
      };
    })
    .filter((item): item is ProcessedGwasData => item !== null);

  const categories = Array.from(
    new Set(processed.map((d) => d.category)),
  ).sort();
  const categoryIndexMap = new Map(categories.map((cat, idx) => [cat, idx]));

  const categoryPointCounts = new Map<string, number>();
  categories.forEach((cat) => categoryPointCounts.set(cat, 0));

  processed.forEach((d, index) => {
    const catIndex = categoryIndexMap.get(d.category) ?? 0;
    const pointsInCategory = categoryPointCounts.get(d.category) ?? 0;
    categoryPointCounts.set(d.category, pointsInCategory + 1);

    const { xValue, yOffset } = calculateJitteredPosition(
      catIndex,
      pointsInCategory,
      d.rsid,
      d.gwas_disease_trait,
      jitterConfig,
    );

    d.xValue = xValue;
    d.yValue = Math.max(GWAS_CONSTANTS.Y_AXIS_MIN, d.yValue + yOffset);
  });

  return { processed, categories };
}
