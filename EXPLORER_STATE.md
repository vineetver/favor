1) One source of truth: normalize everything into a GraphStore
A. Canonical IDs everywhere

Use one canonical key format across the whole frontend:

NodeKey = "${type}:${id}"

EdgeKey = "${edgeType}:${fromKey}->${toKey}"

Important nuance: many edges can exist between the same endpoints (different source, different evidence rows). So don’t pretend “one edge” is one thing.

B. Store “edge instances” + “relationship groups”

This is the big unlock for “Find Diseases (OpenTargets)” style provenance + evidence layering.

EdgeInstance = a single returned edge row (has edgeType, fields, maybe evidence, and crucially a source or other provenance)

RelationshipGroup = “these two nodes are related; here are all the EdgeInstances we’ve seen between them”

So you store:

nodesByKey: Map<NodeKey, NodeEntity>

edgeInstancesByKey: Map<EdgeKey, EdgeInstance> (unique per returned edge; if backend can return duplicates, include a stable edgeRowId or hash fields+source into the key)

relationshipGroupsByPair: Map<PairKey, RelationshipGroup>

Where:

PairKey = "${fromKey}->${toKey}" (direction matters if your edges are directed)

Why this matters

Graph rendering can show a single visual edge (the group), while the inspector can show all underlying evidence edges.

You can “fetch more evidence for this relationship” without adding nodes, and without exploding the canvas.

2) Provenance should be a first-class citizen (the “Find Diseases (OpenTargets)” label)

Every node/edge should carry why it exists in the current session.

Create a small ProvenanceEvent type:

kind: "lens" | "expand_button" | "search" | "bfs_expand" | "evidence_enrich"

label: e.g. "Find Diseases (OpenTargets)", "Clinical lens step 1"

lensId, stepIndex (optional)

queryHash (hash of request body so you can dedupe/caching)

timestamp

sourceHint: e.g. "OpenTargets", "ClinVar", "CIViC" (if you can infer)

Then store:

provenanceByNode: Map<NodeKey, ProvenanceEvent[]>

provenanceByRelationshipGroup: Map<PairKey, ProvenanceEvent[]>

provenanceByEdgeInstance: Map<EdgeKey, ProvenanceEvent[]>

UI payoff

Inspector can show: “Added by: Clinical lens → Find Diseases (OpenTargets)”

You can debug merges + avoid “how did this get here?” confusion.

3) Avoid invalid states via “derived view” only (don’t store computed stuff)

Store only:

canonical nodes, edges (instances + groups)

minimal UI state (selection, active lens, filters, layout)

request cache / history

Compute via selectors (pure functions):

visible nodes/edges after filters

cytoscape elements

depth calculations

“is orphan” flags

legend counts

This is how you stop state from turning into soup.

Hard invariants (enforced in merge):

No edge instance is stored unless both endpoint nodes exist.

No relationship group exists unless both endpoints exist.

Selection always points to something that exists; otherwise it becomes none.

4) State management that feels like Linus-level “no nonsense”

You don’t need a monster framework, but you do need:

a single reducer-like “event pipeline”

pure merge functions with invariants

predictable actions

Recommended pattern (simple, strong)

Use Zustand (or Redux Toolkit if you prefer) with a strict action API:

Actions like:

resetSession({ seeds, entryContext })

applyQueryResult({ result, provenance })

applySubgraphResult({ result, provenance })

enrichRelationship({ pairKey, edgeTypes, provenance })

setFilters(...), setLayout(...)

selectNode(nodeKey), selectEdge(pairKey|edgeKey)

And the important part:

applyQueryResult calls mergeGraph(result) which is pure and enforces invariants.

Optional god-tier add-on

Add an action log (event sourcing-lite):

eventLog.push({action, payload, timestamp})

This enables:

undo/redo

“share link reproducing exact session”

replay debugging

5) Make lenses seed-type-agnostic with a “Lens Compiler”

Right now your lenses are basically hardcoded for Gene. Generalize to:

A. Lens definition = program + compile()

A lens should not be “Gene → Disease → Drug”.
It should be “Given a seed type, produce a query plan”.

Example mental model:

Lens has:

id, name, description

supportedSeedTypes: NodeType[]

compile(ctx) -> GraphQueryRequest

Where ctx includes:

seeds: NodeRef[]

seedType

entryPageType (Gene page vs Drug page, etc.)

intent (lens switch vs expansion)

optional selectedNodeKey (for running lens from selection)

B. Clinical lens should exist for every relevant seed

Concrete lens expansions (same “Clinical” lens name, different compile logic):

If seed is Gene:

Gene → Disease (ASSOCIATED_WITH_DISEASE; sorted) → Drug (INDICATED_FOR in)

If seed is Disease:

Disease ← Gene (ASSOCIATED_WITH_DISEASE; sorted) → Drug (TARGETS in) OR Disease ← Drug (INDICATED_FOR)

If seed is Drug:

Drug → Gene (TARGETS) → Disease (ASSOCIATED_WITH_DISEASE) + Drug → Disease (INDICATED_FOR)

If seed is Variant:

Variant → Gene (PREDICTED_TO_AFFECT / MISSENSE_PATHOGENIC_FOR) → Disease (ASSOCIATED_WITH_DISEASE)

Same lens label, different compiled steps. UX stays consistent.

6) Evidence overlay without expanding the graph (relationship enrichment)

You mentioned: “we can fetch more edges as evidence instead of expanding”.

That’s exactly what RelationshipGroup enrichment is for.

When you already have endpoints A and B:

you can fetch additional edge types between them (curated overlays) and attach as EdgeInstances into the existing RelationshipGroup

no new nodes added

no canvas clutter

Example: between a Gene and Disease currently connected by ASSOCIATED_WITH_DISEASE,
you enrich the same pair with:

CURATED_FOR, CAUSES, INHERITED_CAUSE_OF, ASSERTED_FOR_DISEASE, CIVIC_EVIDENCED_FOR

UI effect:

the visual edge stays one thing

inspector becomes a “stack” of evidence types and sources

users can trust what they’re seeing

Implementation note
If your backend doesn’t have a “get edges between these two nodes” endpoint, you can still do it with /graph/query by seeding one endpoint and filtering to the other in the step (or add a lightweight endpoint later).

7) Make “entry from any entity page” a first-class session concept

Define an ExplorerSession object:

entry: { seeds: NodeRef[], entryType: NodeType, entryId: string }

activeLensId

graphStore (normalized truth)

viewState (filters/layout)

selection

Then every page (Gene/Drug/Disease/etc.) just does:

build seeds (1–N)

pick default lens for that seed type

run resetSession() + initial query

This makes “Drug page starts from Drug” basically free.

8) Other “one of a kind KG explorer” capabilities you’ll want (and your model supports)
A. Relationship-centric view mode (not just node-centric)

Let users click a relationship group and see:

strongest evidence edge instance

all supporting evidence types

provenance timeline (“added by lens”, “enriched by evidence overlay”)

This makes the explorer feel like a knowledge tool, not a drawing.

B. “Why is this here?” everywhere

Every node + relationship group shows:

added by (lens/expand/search)

which step produced it

from which seed

This reduces cognitive load massively.

C. Schema-driven expansions (future-proof)

Instead of hardcoding expansions per node type forever:

fetch /graph/schema hints

generate “Expand…” actions dynamically from the edge catalog

keep curated ones pinned at top; dynamic ones go under “More”

D. Multi-seed workflows

Seeds aren’t always 1 thing:

compare two diseases

intersect drug targets

find shared phenotypes

Your state model should treat seeds as NodeRef[] always, not singletons.

E. Evidence weight/quality badges

Across the app: show quick badges like:

“Curated”

“High confidence”

“Multiple sources”

“ClinVar reviewed”
These are computed from edge instance fields.

9) Folder organization that stays clean as the app grows

A structure that prevents spaghetti:

core/graph/

types.ts (NodeRef, NodeKey, EdgeInstance, RelationshipGroup, ProvenanceEvent)

keys.ts (makeNodeKey, makeEdgeKey, makePairKey)

merge.ts (pure merge + invariants)

selectors.ts (derive visible graph, cytoscape elements, counts)

cache.ts (queryHash -> result cache)

core/lenses/

registry.ts (list lenses, supported types)

clinical.ts (compile(ctx))

regulatory.ts

…

state/explorerStore.ts (Zustand/RTK store, actions call core funcs)

ui/explorer/ (view components that consume selectors)

The key rule: UI never “edits” graph truth directly. It dispatches actions.