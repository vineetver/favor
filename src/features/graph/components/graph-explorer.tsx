"use client";

import { ExplorerProvider } from "../state";
import { GraphExplorerView } from "./graph-explorer-view";
import type { GraphExplorerProps } from "../types/props";
import { cn } from "@infra/utils";

/**
 * Generic graph explorer component. Wraps ExplorerProvider + GraphExplorerView.
 *
 * Usage:
 * ```tsx
 * <GraphExplorer
 *   seed={{ type: "Gene", id: geneId, label: geneSymbol }}
 *   config={GENE_EXPLORER_CONFIG}
 *   initialSubgraph={subgraph}
 *   schema={schema}
 *   stats={stats}
 * />
 * ```
 */
export function GraphExplorer({
  seed,
  config,
  initialSubgraph,
  schema,
  stats,
  className,
}: GraphExplorerProps) {
  return (
    <ExplorerProvider>
      <GraphExplorerView
        seed={seed}
        config={config}
        initialSubgraph={initialSubgraph}
        initialTemplateId={config.defaultTemplateId}
        schema={schema}
        stats={stats}
        className={className}
      />
    </ExplorerProvider>
  );
}
