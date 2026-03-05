import type { Metadata } from "next";
import { ApiEndpoint } from "../_components/api-doc-blocks";
import { MediaSlot } from "../_components/media-slot";

export const metadata: Metadata = {
  title: "Search & Explore | FAVOR Docs",
  description:
    "How to search and explore variants, genes, diseases, and drugs in FAVOR.",
};

export default function SearchAndExploreDocsPage() {
  return (
    <div className="max-w-5xl">
      <header className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Unified Search API
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Search & Explore (Backend-Accurate)
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          This page documents the exact behavior of <code>/typeahead</code> and{" "}
          <code>/pivot</code> from <code>../new-api</code>, including parameter
          rules and response packets consumed by the frontend search system.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">Execution model</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Keystrokes call <code>GET /typeahead</code>.</li>
          <li>
            Full search calls <code>GET /pivot</code> in text mode (<code>q</code>)
            or pivot mode (<code>anchor_id + anchor_type</code>).
          </li>
          <li>
            Backend enforces exclusive mode selection and validates query length.
          </li>
          <li>UI renders grouped/entity-typed packets directly from API response.</li>
        </ol>
      </section>

      <section className="mt-8 space-y-5">
        <ApiEndpoint
          method="GET"
          path="/typeahead"
          auth="Public"
          summary="Autocomplete suggestions grouped by entity type."
          requestFields={[
            { name: "q", type: "string", required: true, notes: "Minimum 2 chars." },
            { name: "types", type: "string", notes: "Comma-separated entity types." },
            { name: "limit", type: "number", notes: "Clamped to 1..50." },
            { name: "include_links", type: "boolean" },
            { name: "include_linked", type: "boolean" },
          ]}
          responseFields={[
            { name: "groups", type: "TypeaheadGroup[]" },
            { name: "exact_present", type: "boolean" },
            { name: "total_count", type: "number" },
          ]}
          notes={["Empty q returns 400.", "Unsupported entity type returns 400."]}
        />

        <ApiEndpoint
          method="GET"
          path="/pivot"
          auth="Public"
          summary="Text search or anchor-based pivot expansion."
          requestFields={[
            { name: "q", type: "string", notes: "Text mode only; min 2 chars." },
            { name: "anchor_id", type: "string", notes: "Pivot mode only." },
            { name: "anchor_type", type: "string", notes: "Pivot mode only." },
            { name: "types", type: "string", notes: "Comma-separated entity filter." },
            { name: "limit", type: "number", notes: "Clamped to 1..50." },
            { name: "expand", type: "boolean" },
            { name: "cursor", type: "string" },
            { name: "include_links", type: "boolean" },
            { name: "include_linked", type: "boolean" },
            { name: "match_mode", type: "exact_first | balanced" },
            { name: "debug", type: "boolean" },
          ]}
          responseFields={[
            { name: "results", type: "Record<entity_type, entity[]>" },
            { name: "total", type: "number" },
            { name: "cursor", type: "string?" },
            { name: "took_ms", type: "number" },
            { name: "debug", type: "object?" },
          ]}
          notes={[
            "Cannot combine q with anchor params (400).",
            "Pivot mode requires both anchor_id and anchor_type.",
          ]}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <MediaSlot
          type="image"
          title="Screenshot slot: search results anatomy"
          description="Add annotated screenshot explaining result panels and key actions."
        />
        <MediaSlot
          type="video"
          title="Video slot: search-to-insight walkthrough"
          description="Add a short guided flow from search to interpretation."
        />
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">
          Frontend integration notes
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <code>fetchTypeahead</code> uses <code>cache: no-store</code> for
            keystroke responsiveness.
          </li>
          <li>
            <code>fetchSearch</code> targets <code>/pivot</code> for both text and
            anchor modes.
          </li>
          <li>
            <code>fetchPivotExpansion</code> always sets <code>expand=true</code>{" "}
            and <code>include_links=true</code>.
          </li>
        </ul>
      </section>
    </div>
  );
}
