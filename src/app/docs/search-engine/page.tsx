import type { Metadata } from "next";
import Link from "next/link";
import { Prose, Callout } from "../_components/doc-primitives";
import { StatBanner } from "../_components/stat-banner";
import { DataFlowDiagram } from "../_components/data-flow-diagram";
import {
  FlowDiagram,
  FlowNode,
  FlowConnector,
} from "../_components/flow-diagram";

export const metadata: Metadata = {
  title: "Search Engine | FAVOR Docs",
  description:
    "How FAVOR resolves messy human queries to normalized entity IDs across 16 types and 14.8M entities in under 50ms.",
};

export default function SearchEngineDocsPage() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <div>
        <Prose>
          <h1>Search Engine</h1>
          <p>
            Resolves messy human queries &mdash; misspelled gene names, mixed
            identifier formats, disease ontology codes &mdash; to exact entity
            IDs across 14.8M entities in &lt;50ms. Every UI typeahead, pivot
            explorer, and{" "}
            <Link href="/docs/agent-system">agent</Link> disambiguation
            routes through this system.
          </p>
          <p>
            <strong>
              Every resolution includes why it matched and how confident we
              are, so downstream systems never guess.
            </strong>
          </p>
        </Prose>
        <div className="mt-6">
          <StatBanner
            stats={[
              { value: "<50ms", label: "Latency", detail: "P95 typeahead response" },
              { value: "14.8M", label: "Entities", detail: "Indexed across 16 types" },
              { value: "6", label: "Confidence Tiers", detail: "Exact ID to discovery pivot (0–5)" },
              { value: "50", label: "Batch Inputs", detail: "Resolved per single call" },
            ]}
          />
        </div>
      </div>

      {/* Smart query parsing */}
      <section>
        <Prose>
          <h2>Smart query parsing</h2>
          <p>
            The parser classifies every query before it touches Elasticsearch.
            Three outcomes, in order of preference:
          </p>
        </Prose>
        <div className="mt-4">
          <FlowDiagram>
            <FlowNode
              icon="crosshair"
              title="Structured → deterministic"
              subtitle="VCF coordinates (chr:pos:ref:alt), rsIDs, ChEMBL IDs, ontology codes (MONDO, HPO, OMIM, etc.) resolve directly. No Elasticsearch, no ambiguity."
              index={0}
            />
            <FlowConnector label="no pattern match" />
            <FlowNode
              icon="dna"
              title="Ambiguous → ranked options"
              subtitle="Short uppercase tokens (2–6 chars) classified as likely gene symbols and routed to symbol-first matching with ranked results."
              index={1}
            />
            <FlowConnector label="no heuristic match" />
            <FlowNode
              icon="search"
              title="Free text → Elasticsearch"
              subtitle="Multi-field search with n-gram tokenization and fuzziness. Each result carries a confidence tier (0–5)."
              index={2}
            />
          </FlowDiagram>
        </div>
        <div className="mt-6">
          <Callout variant="tip" title="40% of queries skip Elasticsearch entirely">
            A VCF coordinate has exactly one correct resolution. Pre-routing
            eliminates ambiguity and drops latency to near-zero for structured
            identifiers.
          </Callout>
        </div>
      </section>

      {/* Matching cascade */}
      <section>
        <Prose>
          <h2>Matching cascade</h2>
          <p>
            Priority-ordered matching across 6 tiers (0&ndash;5).
            Higher-confidence strategies execute first. Every result carries a
            numeric <code>match_tier</code> and a categorical{" "}
            <code>match_reason</code> so consumers know exactly why a result
            appeared.
          </p>
        </Prose>
        <div className="mt-4">
          <FlowDiagram>
            <FlowNode
              icon="fingerprint"
              title="Tier 0 — Exact ID"
              subtitle="Direct identifier lookup. rsID, ChEMBL, ontology code. Zero ambiguity."
              index={0}
            />
            <FlowConnector label="no match → try next" />
            <FlowNode
              icon="check-circle"
              title="Tier 1 — Exact name / alias"
              subtitle="Case-insensitive match on primary label and known aliases."
              index={1}
            />
            <FlowConnector label="no match → try next" />
            <FlowNode
              icon="search"
              title="Tier 2–3 — Prefix / partial"
              subtitle="Partial inputs and compound names. Scored by coverage and position."
              index={2}
            />
            <FlowConnector label="no match → try next" />
            <FlowNode
              icon="compass"
              title="Tier 4 — Typo-tolerant"
              subtitle='Edit-distance matching. Catches "BRAC1" → BRCA1. Only fires when higher tiers return empty.'
              index={3}
            />
            <FlowConnector label="entity resolved → optionally" />
            <FlowNode
              icon="network"
              title="Tier 5 — Discovery pivot"
              subtitle="Graph-backed expansion discovers connected entities. Lowest confidence, highest discovery value."
              index={4}
            />
          </FlowDiagram>
        </div>
      </section>

      {/* Three search modes — clean table */}
      <section>
        <Prose>
          <h2>Three search modes</h2>
          <p>
            Same matching cascade and index infrastructure, three consumers
            with different latency targets and result shapes.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Mode</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Used by</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">Latency goal</th>
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Returns</th>
                <th className="text-left py-2.5 font-semibold text-foreground whitespace-nowrap">Cache policy</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  mode: "Typeahead",
                  usedBy: "Search bar, all text inputs",
                  latency: "<50ms P95",
                  returns: "Top 5 per entity type, grouped and ranked",
                  cache: "no-store (always fresh)",
                },
                {
                  mode: "Pivot / Anchor",
                  usedBy: "Entity explorer, graph UI",
                  latency: "<200ms",
                  returns: "Link counts per type, 5→50 on expand",
                  cache: "5-min stale-while-revalidate",
                },
                {
                  mode: "Batch Resolution",
                  usedBy: "Agent, bulk imports",
                  latency: "<100ms",
                  returns: "1–50 inputs → entity IDs with tier + reason",
                  cache: "per-request",
                },
              ].map((row) => (
                <tr key={row.mode} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.mode}</td>
                  <td className="py-3 pr-4 text-muted-foreground align-top">{row.usedBy}</td>
                  <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap align-top">{row.latency}</td>
                  <td className="py-3 pr-4 text-muted-foreground align-top">{row.returns}</td>
                  <td className="py-3 text-muted-foreground align-top whitespace-nowrap">{row.cache}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Response structure */}
      <section>
        <Prose>
          <h2>Response structure</h2>
          <p>
            Every result is a structured record. The agent uses{" "}
            <code>match_tier</code> to decide whether to proceed or
            disambiguate. The UI uses <code>link_counts</code> for connection
            density.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Field</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                { field: "Entity type", purpose: "One of 16 types (gene, variant, disease, drug, pathway, phenotype, etc.)" },
                { field: "Display name", purpose: "Render-ready label and subtitle. No post-processing needed." },
                { field: "Match tier (0–5)", purpose: "Numeric confidence. Tier 0: certain. Tier 4+: guessing. Sets auto-accept thresholds." },
                { field: "Match reason", purpose: "How the match was made: id_exact, name_exact, prefix, ngram, fuzzy, alias, pivot." },
                { field: "Link counts", purpose: 'Outgoing edges by relationship type. Powers "why this result" explanations and the pivot UI.' },
                { field: "Portal scope", purpose: "Which graph portal (BioKG, LipidKG, custom) the result belongs to. Enables multi-graph deployments without changing clients." },
              ].map((row) => (
                <tr key={row.field} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.field}</td>
                  <td className="py-3 text-muted-foreground">{row.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Performance — top 3 prominent, rest collapsible */}
      <section>
        <Prose>
          <h2>Performance engineering</h2>
          <p>
            Sub-50ms latency from deliberate engineering at every layer.
          </p>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground whitespace-nowrap">Technique</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Impact</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tech: "AbortController dedup", impact: "Each keystroke aborts the previous in-flight request. Fast typists eliminate most wasted round-trips." },
                { tech: "Request ID versioning", impact: "Monotonic counter ensures stale responses are silently discarded, even if they arrive out of order." },
                { tech: "Incremental expansion + cache", impact: "Start with 5 results per type, expand to 50 on demand. Typeahead: no-store. Pivot: 5-min stale-while-revalidate." },
              ].map((row) => (
                <tr key={row.tech} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.tech}</td>
                  <td className="py-3 text-muted-foreground">{row.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="mt-4 rounded-xl border border-border bg-card">
          <summary className="px-4 py-3 text-sm font-medium text-foreground cursor-pointer hover:bg-accent/50 rounded-xl transition-colors">
            More performance details
          </summary>
          <div className="px-4 pb-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  { tech: "Callback ref debounce", impact: "Prevents debounce timer reset on re-renders. 150ms interval stays stable across component lifecycles." },
                  { tech: "Best-match dedup", impact: 'Top result promoted to "best match" position, removed from grouped results below.' },
                ].map((row) => (
                  <tr key={row.tech} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.tech}</td>
                    <td className="py-3 text-muted-foreground">{row.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      {/* Agent integration — consolidated, references cascade */}
      <section>
        <Prose>
          <h2>Agent integration</h2>
          <p>
            The{" "}
            <Link href="/docs/agent-system">agent</Link> converts natural
            language entity references to graph-ready IDs through batch
            resolution &mdash; same cascade, same tiers, same quality.
            Improvements to search benefit both human users and agent accuracy.
          </p>
        </Prose>
        <div className="mt-4">
          <DataFlowDiagram
            title="Agent entity resolution"
            steps={[
              { label: "Natural language", detail: "\"BRCA1\", \"breast cancer\", \"Trastuzumab\"" },
              { label: "Batch resolve", detail: "All references in one call" },
              { label: "Confidence check", detail: "Tier 0–1: auto-proceed. Tier 2+: evaluate or ask user." },
              { label: "Graph-ready IDs", detail: "Exact entity IDs for traversal" },
            ]}
          />
        </div>
      </section>

      {/* Design decisions */}
      <section>
        <Prose>
          <h2>Design decisions</h2>
        </Prose>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2.5 pr-4 font-semibold text-foreground">Decision</th>
                <th className="text-left py-2.5 font-semibold text-foreground">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {[
                { dec: "Cascade over single-pass", rat: "Interpretable confidence tiers for downstream decision-making. Always know WHY something matched." },
                { dec: "Pre-route before Elasticsearch", rat: "Structured identifiers have deterministic resolutions. 40% of queries skip full-text entirely." },
                { dec: "Separate typeahead from pivot", rat: "Typeahead: speed problem. Pivot: discovery problem. Each optimizes independently." },
              ].map((row) => (
                <tr key={row.dec} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap align-top">{row.dec}</td>
                  <td className="py-3 text-muted-foreground">{row.rat}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <section>
        <Callout variant="info" title="Deep dive, not user guide">
          This page covers the engineering behind search. For a practical
          guide, see the{" "}
          <Link href="/docs/search" className="text-primary hover:underline">
            Search &amp; Explore
          </Link>{" "}
          portal guide.
        </Callout>
      </section>
    </div>
  );
}
