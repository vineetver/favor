# Backend Endpoint Improvement Proposals

Observations from hands-on testing of every `/api/v1/graph/*` endpoint against `localhost:8000`.
Each line is one concrete proposal. Priority: P0 = footgun, P1 = useful, P2 = nice-to-have.

## Error Handling & Validation

- P0: `POST /graph/ranked-neighbors` — passing wrong entity type for seed (e.g. `type:"Drug"` with a Gene ID) silently returns 0 neighbors with no error/warning. Should warn: "seed type 'Drug' does not match ID pattern" or "no entity found for Drug:ENSG00000012048".
- P0: `POST /graph/enrichment` — mismatched targetType + edgeType (e.g. `targetType:"Pathway"` + `edgeType:"GENE_ASSOCIATED_WITH_DISEASE"`) silently returns 0 enrichments. Should return a warning or error: "edgeType targets Disease, not Pathway".
- P1: `POST /graph/ranked-neighbors` — `limit:0` is accepted and returns empty results. Should reject with min=1.
- P1: `POST /graph/connections` — missing `from` field returns an empty response (no body). Should return a proper error like the other endpoints.

## textSummary Coverage

- P1: `POST /graph/intersect` — no `textSummary` field. Should have one like ranked-neighbors/connections/compare (e.g. "BRCA1 and TP53 share 47 Pathways via GENE_PARTICIPATES_IN_PATHWAY: Cell Cycle Checkpoints, ...").
- P1: `GET /graph/paths` — no `textSummary` field. Would be useful (e.g. "2 paths found: shortest is 1 hop via DRUG_INDICATED_FOR_DISEASE").
- P2: `GET /graph/edge` — no `textSummary` field. Lower priority since this is a drill-down tool.
- P2: `POST /graph/context` — no `textSummary` field. Lower priority since the description field partially covers this.

## Response Shape Improvements

- P1: `POST /graph/ranked-neighbors` — `explanation` field is always `{supportingSeeds: N, topSupportingSubtypes: []}` (an object, never a string despite the type hint). Consider either making it a string like "3 supporting seeds" or removing it when empty/trivial.
- P1: `GET /graph/paths` — `score` field is `{type: "shortest", value: 1.0}` (an object) instead of a flat number. Hard to use programmatically. Consider flattening to just the value, or removing if it's always == path length.
- P1: `GET /graph/paths` — `edges` array per path duplicates full entity objects with subtitles. Very heavy. The `pathText` field already captures this info concisely. Consider omitting edges by default or making them opt-in.
- P1: `POST /graph/intersect` — `support` array includes full edge props per supporting entity. Very heavy for LLM consumption. Consider a lighter format like `supportingEntityIds: string[]`.
- P2: `POST /graph/context` — `keyFacts` at minimal depth often just repeats entity name and total connections (e.g. `["BRCA1, DNA repair associated", "Type: Gene", "Total connections: 38137"]`). Could be more useful with actual biological facts.
- P2: `POST /graph/compare` — `comparisons[edgeType].shared` is a full array of entity objects. For high-degree nodes this can be huge. Consider returning only `sharedCount` + `sharedSample[0:5]` at the API level.

## New Capabilities

- P1: `POST /graph/enrichment` — add a `validateCombo` flag or auto-validate that edgeType schema's toType matches targetType. This is the #1 silent failure mode.
- P2: `GET /graph/search` — support `"trait"` type alias in the tool-facing schema (the endpoint accepts it but it's undocumented).
- P2: `POST /graph/ranked-neighbors` — when 0 neighbors are returned, include `resolved.edgeSchema` showing fromType/toType so the caller can see why the seed didn't match.
