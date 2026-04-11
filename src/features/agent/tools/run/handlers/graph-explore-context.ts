/**
 * explore mode: context — rich entity context via /graph/context.
 *
 * Fixed response shape to match actual API:
 *   summary: { description, keyFacts[], totalConnections, connectedTypes[] }
 *   neighbors: { <type>: { count, top: [{ entity, score?, edgeType? }] } }
 *   evidence: { sourceCount, topSources[], edgeTypeCount, topEdgeTypes[] }
 *   ontology: { parentCount, childCount }
 */

import { agentFetch } from "../../../lib/api-client";
import { resolveSeeds } from "../resolve-seeds";
import { catchToResult, okResult, TraceCollector } from "../run-result";
import type { EntityRef, RunCommand, RunResult } from "../types";
import { errorResult } from "./graph";

type ExploreCmd = Extract<RunCommand, { command: "explore" }>;

interface ContextSummary {
  description?: string;
  keyFacts?: string[];
  totalConnections?: number;
  connectedTypes?: string[];
}

interface ContextNeighborGroup {
  count: number;
  top: Array<{
    entity: { type: string; id: string; label: string };
    score?: number;
    edgeType?: string;
    direction?: string;
  }>;
}

interface ContextEvidence {
  sourceCount?: number;
  topSources?: string[];
  edgeTypeCount?: number;
  topEdgeTypes?: string[];
}

interface ContextOntology {
  parentCount?: number;
  childCount?: number;
}

interface ContextEntity {
  entity: { type: string; id: string; label: string };
  summary?: ContextSummary;
  neighbors?: Record<string, ContextNeighborGroup>;
  evidence?: ContextEvidence;
  ontology?: ContextOntology;
}

export async function handleExploreContext(
  cmd: ExploreCmd,
  resolvedCache?: Record<string, EntityRef>,
): Promise<RunResult> {
  const tc = new TraceCollector();

  try {
    const resolved = await resolveSeeds(cmd.seeds, resolvedCache);
    if (resolved.length === 0) {
      return errorResult("Could not resolve any seed entities.", tc);
    }

    tc.add({
      step: "fetchContext",
      kind: "call",
      message: `POST /graph/context for ${resolved.length} entities`,
    });

    const data = await agentFetch<{
      data: {
        textSummary?: string;
        entities: ContextEntity[];
      };
      meta?: { requestId?: string; resolved?: unknown; warnings?: unknown[] };
    }>("/graph/context", {
      method: "POST",
      body: {
        entities: resolved.map((e) => ({ type: e.type, id: e.id })),
        sections: cmd.sections ?? ["summary", "neighbors"],
        depth: cmd.context_depth ?? "standard",
      },
    });

    tc.mergeApiWarnings(data.meta?.warnings);
    const resolvedInfo = tc.extractResolvedInfo(data.meta);

    const entities = data.data?.entities ?? [];
    const names = resolved.map((e) => e.label).join(", ");

    // Build a compact text summary from structured data
    const compactSummaries = entities.map((ent) => {
      const parts: string[] = [];

      // Summary section
      if (ent.summary?.description) {
        parts.push(ent.summary.description);
      }
      if (ent.summary?.keyFacts?.length) {
        const facts = ent.summary.keyFacts.slice(0, 6).join("; ");
        parts.push(`Key facts: ${facts}`);
      }

      // Neighbor types
      if (ent.neighbors) {
        const neighborSummary = Object.entries(ent.neighbors)
          .filter(([, g]) => g.count > 0)
          .map(([type, g]) => {
            const topLabels = g.top
              .slice(0, 3)
              .map((t) => t.entity.label)
              .join(", ");
            return `${g.count} ${type}${topLabels ? ` (top: ${topLabels})` : ""}`;
          })
          .join("; ");
        if (neighborSummary) parts.push(`Neighbors: ${neighborSummary}`);
      }

      // Evidence
      if (ent.evidence?.sourceCount) {
        parts.push(`${ent.evidence.sourceCount} evidence sources`);
      }

      // Ontology
      if (ent.ontology) {
        const onto: string[] = [];
        if (ent.ontology.parentCount)
          onto.push(`${ent.ontology.parentCount} parents`);
        if (ent.ontology.childCount)
          onto.push(`${ent.ontology.childCount} children`);
        if (onto.length) parts.push(`Ontology: ${onto.join(", ")}`);
      }

      return parts.join(". ");
    });

    const textSummary =
      data.data?.textSummary ??
      (compactSummaries.length === 1
        ? `Context for ${names}: ${compactSummaries[0]}`
        : `Context for ${names}: ${entities.length} entity profiles`);

    return okResult({
      text_summary: textSummary,
      data: {
        _mode: "context" as const,
        entities: entities.map((ent) => ({
          entity: ent.entity,
          ...(ent.summary ? { summary: ent.summary } : {}),
          ...(ent.neighbors ? { neighbors: ent.neighbors } : {}),
          ...(ent.evidence ? { evidence: ent.evidence } : {}),
          ...(ent.ontology ? { ontology: ent.ontology } : {}),
        })),
      },
      state_delta: { pinned_entities: resolved },
      tc,
      resolved_info: resolvedInfo,
    });
  } catch (err) {
    return catchToResult(err, tc);
  }
}

/** Extract entities from context result data for pipeline forwarding. */
export function extractContextEntities(
  data: Record<string, unknown>,
): EntityRef[] {
  const entities = data.entities as
    | Array<{
        entity?: Record<string, unknown>;
        neighbors?: Record<
          string,
          { top?: Array<{ entity?: Record<string, unknown> }> }
        >;
      }>
    | undefined;
  if (!entities) return [];
  const out: EntityRef[] = [];
  for (const item of entities) {
    // The context entity itself
    const ent = item.entity;
    if (ent?.type && ent.id && ent.label) {
      out.push({
        type: String(ent.type),
        id: String(ent.id),
        label: String(ent.label),
      });
    }
    // Top neighbors per type
    if (item.neighbors) {
      for (const group of Object.values(item.neighbors)) {
        for (const n of group.top ?? []) {
          const ne = n.entity;
          if (ne?.type && ne.id && ne.label) {
            out.push({
              type: String(ne.type),
              id: String(ne.id),
              label: String(ne.label),
            });
          }
        }
      }
    }
  }
  return out;
}
