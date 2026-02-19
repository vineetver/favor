# FAVOR-GPT Agent — Complete Architecture Document

> **Purpose:** Self-contained reference for an LLM to understand the full FAVOR-GPT agent system and suggest improvements.

---

## 1. High-Level Overview

FAVOR-GPT is a **single autonomous AI agent** (not multi-agent) that helps biomedical researchers explore a genomic knowledge graph and variant annotation database through natural language. It is built as a Next.js 14+ App Router application using the **Vercel AI SDK** (`ai` package) with **OpenAI GPT-4o** as the LLM.

### Architecture Pattern
```
User (browser) → Next.js API Route (/api/chat) → Vercel AI SDK ToolLoopAgent → GPT-4o
                                                        ↓
                                                  14 custom tools
                                                        ↓
                                              Backend APIs (FastAPI)
                                                   ↙        ↘
                                          Kuzu Graph DB    ClickHouse + RocksDB
                                          (Knowledge Graph)  (Variant Annotations)
```

### Data Scale
- **Knowledge Graph (Kuzu):** ~14.8M nodes, ~191M edges, 13 entity types, 67 relationship types
- **Variant Database (ClickHouse + RocksDB):** 8.9 billion human variants with 50+ annotation fields

---

## 2. Agent Configuration

**File:** `src/features/agent/agent.ts`

```typescript
import { ToolLoopAgent, stepCountIs, wrapLanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";

const baseModel = openai("gpt-4o");
// Dev mode wraps with devToolsMiddleware for inspection

export const favorAgent = new ToolLoopAgent({
  model,
  instructions: buildSystemPrompt(),  // ~6,000 token system prompt
  maxOutputTokens: 8000,
  stopWhen: stepCountIs(15),           // Max 15 agentic steps per conversation turn
  tools: { /* 14 tools registered */ },
});
```

### Key Agent Parameters
| Parameter | Value | Notes |
|-----------|-------|-------|
| Model | `gpt-4o` | OpenAI |
| Max output tokens | 8,000 | Per step |
| Max steps per turn | 15 | Hard stop |
| Budget guidance | <10 tool calls | System prompt soft limit |
| Typical calls | 2-4 | Per question |

### API Route

**File:** `src/app/api/chat/route.ts`

```typescript
export const maxDuration = 120; // 2 minute timeout

export async function POST(req: Request) {
  const { messages } = await req.json();
  return createAgentUIStreamResponse({
    agent: favorAgent,
    uiMessages: messages,
  });
}
```

- Single POST endpoint at `/api/chat`
- Uses `createAgentUIStreamResponse` for streaming UI updates
- 120s max duration (Vercel serverless limit)

---

## 3. System Prompt Structure

**File:** `src/features/agent/lib/system-prompt.ts`

The system prompt is composed of 7 concatenated sections:

### 3.1 IDENTITY
- Defines the agent as an "expert biomedical research agent"
- Enforces autonomous behavior: "You are NOT a chatbot"
- Mandates a 4-phase workflow: **PLAN → EXECUTE → EVALUATE → SYNTHESIZE**

### 3.2 DATA_SOURCES
Documents the two data backends:
1. **Knowledge Graph (Kuzu):** 13 entity types, 67 relationship types
2. **Variant Annotation Database:** 8.9B variants, 50+ annotation fields

### 3.3 EDGE_CATALOG (~100 lines)
Complete catalog of all 67+ edge types with:
- Direction (e.g., `Gene→Disease`)
- Available **score fields** (numeric, for ranking)
- Available **filter fields** (categorical, for filtering)
- Explicit warnings: "NEVER pass a filter field as scoreField"

### 3.4 ENTITY_IDS
ID format reference table (Gene=Ensembl, Disease=Mondo/EFO, Drug=ChEMBL, etc.)

### 3.5 SCORE_COLUMNS
36 score columns for cohort analysis: CADD, REVEL, AlphaMissense, SpliceAI, gnomAD AF, conservation scores, APC composites, etc.

### 3.6 AGENT_RULES
Structured rules in three categories:

**Planning rules:**
- Decide full plan before calling tools
- Resolve all entities first (parallel searchEntities)
- Create cohort first for cohort questions

**Tool selection rules (priority order):**
1. Always resolve first with `searchEntities`
2. Start minimal with `getEntityContext(depth="minimal")`
3. Stats before detail — `getGeneVariantStats` is pre-aggregated
4. Cohort for lists — 2+ variants → `createCohort`
5. Filter with derive — `analyzeCohort(operation="derive")`
6. Bridge KG and variants — use top genes to cross-reference
7. Prefer `getRankedNeighbors` over `graphTraverse`
8. `lookupVariant` = single variant only
9. `graphTraverse` = last resort

**Execution rules:**
- Chain intelligently, read textSummary first
- Know when to stop — don't over-fetch
- Budget <10 tool calls
- Recover from errors with alternatives

**Response rules:**
- Markdown with headers and compact lists
- Cite sources (ClinGen, GWAS Catalog, etc.)
- Concise summaries, not raw data dumps
- Explain scores in biological context

### 3.7 DECISION_TREES
7 pre-defined decision trees for common query patterns:
1. "Tell me about [entity]" → search → context → (optional stats)
2. "Look up [variant]" → lookupVariant → getGwasAssociations
3. "[List of variants]" → createCohort → analyze → bridge to KG
4. "Filter my cohort" → analyzeCohort(derive)
5. "What genes for [disease]?" → search → getRankedNeighbors
6. "Compare [A] and [B]" → parallel search → compareEntities
7. "How connected?" → parallel search → findPaths

---

## 4. Complete Tool Inventory (14 Tools)

### 4.1 searchEntities
**Purpose:** Full-text search across the knowledge graph. ALWAYS used first to resolve names to typed IDs.
- **Input:** `query` (string), `types?` (string[]), `limit?` (default 10, max 20)
- **Output:** `CompressedSearchResult[]` — `{type, id, label, subtitle, score, matchTier}`
- **API:** `GET /graph/search?q=...&limit=...&types=...`
- **Compression:** Takes top 10 results, extracts only `type/id/label/score/matchTier`

### 4.2 getEntityContext
**Purpose:** Detailed context for a resolved entity (properties, relationships, summary).
- **Input:** `type` (string), `id` (string), `depth` ("minimal" | "standard" | "detailed")
- **Output:** Structured context object or truncated text (2000 chars per section)
- **API:** `POST /graph/context` with `{entities, depth}`

### 4.3 compareEntities
**Purpose:** Compare 2-5 entities of the same type. Shows shared/unique neighbors per edge type.
- **Input:** `entities` (2-5 `{type, id}` objects)
- **Output:** `{entities, overallSimilarity, comparisons: {[edgeType]: {sharedCount, sharedSample, uniqueCounts, uniqueSamples}}, rawCounts}`
- **API:** `POST /graph/compare`
- **Compression:** Extracts counts + top 5 shared labels + top 3 unique labels per entity per edge type

### 4.4 getRankedNeighbors
**Purpose:** Get neighbors ranked by a numeric edge score. Preferred over graphTraverse for simple lookups.
- **Input:** `type`, `id`, `edgeType`, `direction?` ("in"|"out"|"both", default "out"), `limit?` (default 20), `scoreField?` (numeric only), `expandOntology?`
- **Output:** `{scoreField, scoreMeaning, totalReturned, neighbors: [{entity, rank, score, explanation}]}`
- **API:** `POST /graph/ranked-neighbors`
- **Key detail:** Direction matters — Gene→Disease means use direction="in" when starting from Disease

### 4.5 runEnrichment
**Purpose:** Over-representation analysis on a gene list (3+ genes required).
- **Input:** `genes` (3+ `{type:"Gene", id}` objects), `targetType` (e.g., "Pathway"), `edgeType` (e.g., "PARTICIPATES_IN"), `pValueCutoff?` (default 0.05), `limit?`
- **Output:** `CompressedEnrichment[]` — `{entity, overlap, pValue, adjustedPValue, foldEnrichment}`
- **API:** `POST /graph/enrichment`

### 4.6 findPaths
**Purpose:** Shortest paths between two entities in the knowledge graph.
- **Input:** `from` ("Type:ID" format), `to` ("Type:ID" format), `maxHops?` (default 3, max 5), `limit?` (default 3, max 5)
- **Output:** `CompressedPath[]` — `{rank, length, pathText, nodes: [{type, id, label}]}`
- **API:** `GET /graph/paths?from=...&to=...`

### 4.7 getSharedNeighbors
**Purpose:** Find entities shared as neighbors of multiple input entities.
- **Input:** `entities` (2+ `{type, id}` objects), `edgeType`, `direction?`, `limit?`
- **Output:** `{totalShared, neighbors: [{neighbor, supportCount}]}`
- **API:** `POST /graph/intersect`

### 4.8 lookupVariant
**Purpose:** Detailed annotation for a SINGLE variant. Never call more than once per turn.
- **Input:** `identifier` (rsID or VCF notation)
- **Output:** Rich text prompt built via `buildVariantPrompt()` — includes clinical significance, pathogenicity scores, population frequencies, functional predictions. Or `{ambiguous: true, candidates}` if rsID maps to multiple variants.
- **API:** `GET /variants/{identifier}`
- **Special:** Uses shared `buildVariantPrompt` utility from the variant feature module

### 4.9 getGeneVariantStats
**Purpose:** Pre-aggregated variant statistics per gene. Instant (pre-computed).
- **Input:** `gene` (symbol or Ensembl ID)
- **Output:** `CompressedGeneStats` — `{gene, totalVariants, snvCount, indelCount, clinvar: {pathogenic, likelyPathogenic, benign, vus}, consequence: {missense, nonsense, frameshift, splice, synonymous}, frequency: {common, lowFreq, rare, ultraRare, unknown}, scores: {highCadd, highRevel, highAlphaMissense}}`
- **API:** `GET /statistics/gene/{gene}`

### 4.10 getGwasAssociations
**Purpose:** GWAS Catalog associations for a variant.
- **Input:** `variant` (rsID or VCF), `pvalueMlogMin?`, `traitContains?`, `limit?` (default 50)
- **Output:** `CompressedGwasAssociation[]` or `{totalHits, uniqueTraits, topStudy, topAssociations}` (if >10 results)
- **API:** `GET /gwas/{variant}?...`
- **Compression:** Sorts by p-value, returns top 5-10 depending on total count

### 4.11 createCohort
**Purpose:** Create a persistent cohort from variant identifiers (1-5,000 variants).
- **Input:** `variants` (string[], 1-5000), `label?`
- **Output:** `CompressedCohort` — `{cohortId, variantCount, resolution: {total, resolved, notFound}, summary}`
- **API:** `POST /cohorts?tenant_id=default-tenant` (60s timeout)
- **Key:** Returns `cohortId` needed for subsequent `analyzeCohort` calls

### 4.12 analyzeCohort
**Purpose:** Analyze an existing cohort with three operations.
- **Input:** `cohortId`, `operation` ("topk"|"aggregate"|"derive"), plus operation-specific params:
  - **topk:** `score` (36 score column enum), `k` (default 20)
  - **aggregate:** `field` ("gene"|"consequence"|"clinical_significance"|"frequency"|"chromosome"), `limit`
  - **derive:** `filters` (discriminated union array with AND logic), `label`
- **Filter types for derive:**
  - Categorical: `chromosome`, `gene`, `consequence`, `clinical_significance`
  - Numeric: `score_above` / `score_below` with any of 36 score columns
- **API:** `POST /cohorts/{cohortId}/{operation}?tenant_id=default-tenant` (60s timeout)

### 4.13 graphTraverse
**Purpose:** LAST RESORT — multi-step graph traversal for complex multi-hop queries.
- **Input:** `seeds` (1-10 entities), `steps` (1-5 steps, each with `edgeTypes`, `direction`, `limit`, `sort`, `filters`, `overlayOnly`), `nodeFields?` (max 20), `edgeFields?` (max 20)
- **Output:** `{nodeCount, edgeCount, steps, nodes (max 100), edges (max 200), warnings}`
- **API:** `POST /graph/query` with limits `{maxNodes: 500, maxEdges: 2000}` (45s timeout)
- **Note:** `overlayOnly: true` on steps means edges only to existing nodes, no new nodes, frontier unchanged

### 4.14 variantBatchSummary
**Purpose:** Quick LLM-optimized summary for up to 200 variants without creating a persistent cohort.
- **Input:** `variants` (1-200 strings), `highlightLimit?` (default 10)
- **Output:** `{textSummary, resolution, byGene, byConsequence, byClinicalSignificance, byFrequency, highlights}`
- **API:** `POST /variants/batch/summary` (45s timeout)

---

## 5. API Client Layer

**File:** `src/features/agent/lib/api-client.ts`

### AgentToolError
Custom error class with `toToolResult()` method that returns LLM-readable error objects:
```typescript
{ error: true, status: number, message: string, hint?: string }
```

### Error Recovery Hints
- 400 → Check score column / filter format / entity ID
- 404 → Resource not found
- 429 → Rate limited
- 500+ → Server error
- Timeout (408) → "Try a simpler query or reduce the limit"

### Fetch Configuration
- Default timeout: 30s
- Cohort operations: 60s timeout
- Graph traverse: 45s timeout
- All requests: `cache: "no-store"`
- Cohort endpoints append `?tenant_id=default-tenant`

---

## 6. Compressed Output Types

**File:** `src/features/agent/types.ts`

All tool outputs are compressed before returning to the LLM to minimize token usage:

| Type | Fields | Used By |
|------|--------|---------|
| `CompressedSearchResult` | type, id, label, subtitle, score, matchTier | searchEntities |
| `CompressedGeneStats` | gene, totalVariants, snvCount, indelCount, clinvar{}, consequence{}, frequency{}, scores{} | getGeneVariantStats |
| `CompressedGwasAssociation` | trait, pValueMlog, effectSize, studyAccession | getGwasAssociations |
| `CompressedNeighbor` | entity{type,id,label}, rank, score, explanation | getRankedNeighbors |
| `CompressedEnrichment` | entity{type,id,label}, overlap, pValue, adjustedPValue, foldEnrichment | runEnrichment |
| `CompressedPath` | rank, length, pathText, nodes[] | findPaths |
| `CompressedCohort` | cohortId, variantCount, resolution{}, summary | createCohort |

---

## 7. Frontend Architecture

### 7.1 Page & Layout

**Route:** `/agent` → `src/app/agent/page.tsx` → `<ChatPage />`

**Layout:**
```
┌──────────────┬──────────────────────────────────┐
│  Workspace   │          Chat Area               │
│  Sidebar     │  ┌────────────────────────────┐  │
│  (300px)     │  │   Messages (scrollable)     │  │
│              │  │   - User messages            │  │
│  - Active    │  │   - Assistant messages       │  │
│    Jobs      │  │     - Reasoning blocks       │  │
│  - Completed │  │     - Tool cards (collapsed) │  │
│    Jobs      │  │     - Text responses         │  │
│  - Cohorts   │  │   - Thinking indicator       │  │
│  - Variant   │  │                              │  │
│    Submit    │  └────────────────────────────┘  │
│    Panel     │  ┌────────────────────────────┐  │
│              │  │   Prompt Input              │  │
│              │  │   (paste detection chip)    │  │
└──────────────┴──┴────────────────────────────┘──┘
```

- **Desktop:** Sidebar permanently visible (300px), chat takes remaining space
- **Mobile:** Sidebar in a Sheet (slide-out panel), mobile header with menu button
- Max chat content width: `max-w-3xl` (768px)

### 7.2 Chat Hook

**File:** `src/features/agent/hooks/use-agent-chat.ts`

Uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` to `/api/chat`.

**Features:**
- **Variant paste detection:** When user pastes 10+ lines matching `rs\d+` or VCF notation, shows a "Create cohort" chip
- **Auto-cohort creation:** Converts pasted variants into a `createCohort` message
- **State tracking:** `isStreaming`, `isSubmitted`, `pastedVariantCount`
- **Methods:** `submit(message)`, `send(text)`, `onPaste`, `createCohortFromPaste`, `dismissPaste`, `newChat`

### 7.3 Message Rendering

**File:** `src/features/agent/components/chat-page.tsx` → `ChatMessageRenderer`

Each message renders:
1. **Assistant header:** FAVOR-GPT icon + label
2. **Reasoning blocks:** Consolidated into single collapsible `<Reasoning>` component
3. **Text parts:** Rendered as streaming Markdown via `<MessageResponse>` (uses `streamdown` library)
4. **Tool parts:** Rendered as collapsible `<Tool>` cards with:
   - `<ToolHeader>` showing tool title and state (loading/done/error)
   - `<ToolContent>` with input params and output
5. **Message actions:** Copy, thumbs up, thumbs down (visible on hover)

### 7.4 Tool Output Renderers

**File:** `src/features/agent/components/tool-renderers.tsx`

Custom React renderers for 7 tool outputs:

| Tool | Renderer | Visual |
|------|----------|--------|
| searchEntities | `SearchResultsRenderer` | Table with Type badge, Name, ID, Score |
| getRankedNeighbors | `NeighborsRenderer` | Table with Rank, Entity, Type, Score, Explanation |
| runEnrichment | `EnrichmentRenderer` | Table with Term, Type, Overlap, P-value, Adj P, Fold |
| getGwasAssociations | `GwasRenderer` | Table with Trait, -log10(P), Effect Size, Study |
| getGeneVariantStats | `GeneStatsRenderer` | 4 stat cards (ClinVar, Consequence, Frequency, Pathogenicity) |
| findPaths | `PathsRenderer` | Path cards with node chain (Type badges + arrows) |
| createCohort | `CohortRenderer` | Summary card with cohort ID, variant count, resolution |

Tools without custom renderers (compareEntities, getEntityContext, getSharedNeighbors, lookupVariant, analyzeCohort, graphTraverse, variantBatchSummary) fall back to the default `<ToolOutput>` JSON display.

### 7.5 Workspace Sidebar

**File:** `src/features/agent/components/workspace-sidebar.tsx`

Sections:
1. **Variant Submit Panel** — Toggle-able panel with Paste and Upload tabs
2. **Active Jobs** — From shared batch feature `localStorage`, polls every 5s
3. **Completed Jobs** — Links to batch annotation results page
4. **Cohorts** — localStorage-backed list with Analyze and Remove actions

**Cohort Store** (`lib/cohort-store.ts`): Simple localStorage persistence, max 50 cohorts.

### 7.6 Variant Submit Panel

**File:** `src/features/agent/components/variant-submit-panel.tsx`

Two input modes:
- **Paste tab:** Textarea for pasting variant IDs (rsIDs or VCF), auto-detects variants, creates cohort via API, max 5000 variants
- **Upload tab:** Drag-and-drop or file picker for .csv/.tsv/.txt/.vcf files

Both create cohorts directly via the backend API (not through the agent) and trigger analysis via the chat.

### 7.7 Shared AI Element Components

Located in `src/shared/components/ai-elements/`:

| Component | Purpose |
|-----------|---------|
| `conversation.tsx` | Scroll container, empty state wrapper, scroll-to-bottom button |
| `message.tsx` | Message layout, content wrapper, actions, branching support, Markdown response |
| `tool.tsx` | Collapsible tool card with header, input display, output display |
| `reasoning.tsx` | Collapsible reasoning/thinking block |
| `prompt-input.tsx` | Chat input with textarea, submit button, footer |
| `markdown.tsx` | Standalone Markdown renderer using `streamdown` |
| `shimmer.tsx` | Animated shimmer text effect for loading states |
| `code-block.tsx` | Syntax-highlighted code blocks |

### 7.8 Error Handling

**File:** `src/features/agent/components/error-boundary.tsx`

React class component `AgentErrorBoundary` wraps:
- The workspace sidebar
- The chat conversation area
- Displays error message with "Try again" button that resets the error state

---

## 8. Data Flow Walkthrough

### Example: "What genes are associated with Type 2 Diabetes?"

1. **User types** → `useAgentChat.submit()` → POST to `/api/chat`
2. **API route** → `createAgentUIStreamResponse({ agent: favorAgent, uiMessages })`
3. **Agent Step 1:** GPT-4o reads system prompt, plans: "Need to resolve 'Type 2 Diabetes' to an ID first"
4. **Tool call:** `searchEntities({ query: "Type 2 Diabetes", types: ["Disease"] })`
   - Backend: `GET /api/v1/graph/search?q=Type+2+Diabetes&types=Disease&limit=10`
   - Returns: `[{type: "Disease", id: "MONDO_0005148", label: "type 2 diabetes mellitus", score: 0.98}]`
5. **Agent Step 2:** "Got the ID. Now get ranked genes."
6. **Tool call:** `getRankedNeighbors({ type: "Disease", id: "MONDO_0005148", edgeType: "ASSOCIATED_WITH_DISEASE", direction: "in", scoreField: "overall_score" })`
   - Backend: `POST /api/v1/graph/ranked-neighbors`
   - Returns: Top 20 genes ranked by overall_score
7. **Agent Step 3:** Synthesizes a Markdown response with headers, gene list, scores, and biological context
8. **Streamed to UI** → Messages render with tool cards (collapsible) and final Markdown response

---

## 9. Key Design Decisions & Trade-offs

### What's Working Well
1. **Compressed outputs** reduce token usage — tools strip unnecessary fields before returning to LLM
2. **Structured error recovery** — every tool returns `{error, message, hint}` that the LLM can reason about
3. **Decision trees in system prompt** — reduces wasted tool calls for common patterns
4. **Score vs filter field distinction** — explicit in the edge catalog to prevent type errors
5. **Paste detection** — auto-detects bulk variant pastes and offers cohort creation
6. **Dual cohort creation paths** — sidebar panel (direct API) and chat (through agent tool)

### Current Limitations / Areas for Improvement
1. **No conversation persistence** — `useChat` state is in-memory only, lost on page refresh
2. **No streaming tool results** — tools complete fully before UI shows output
3. **No multi-turn cohort tracking** — agent doesn't remember which cohorts were created across turns (only through system prompt context window)
4. **7 of 14 tools lack custom UI renderers** — fall back to raw JSON display
5. **No tool call parallelism in UI** — tools appear to execute sequentially even when independent
6. **Thumbs up/down buttons are non-functional** — no backend to capture feedback
7. **No rate limiting** — no client-side throttling of API calls
8. **Single-tenant** — hardcoded `default-tenant` for cohort operations
9. **No caching** — `cache: "no-store"` on all API requests, even for stable data like gene stats
10. **System prompt is large** (~6K tokens) — the edge catalog alone is ~100 lines; could be RAG-retrieved
11. **No abort/cancel** — user cannot cancel an in-flight agent execution
12. **lookupVariant uses buildVariantPrompt** — returns a large text blob instead of structured data for the LLM
13. **No tool output size limits** — some tools (graphTraverse) could return very large responses

---

## 10. Entity Types & Relationship Catalog

### 13 Entity Types
Gene, Disease, Drug, Variant, Trait, Pathway, Phenotype, Study, SideEffect, GOTerm, OntologyTerm, cCRE, Metabolite

### Entity ID Formats
| Type | Format | Example |
|------|--------|---------|
| Gene | Ensembl | ENSG00000012048 |
| Disease | Mondo/EFO | MONDO_0005148 |
| Drug | ChEMBL | CHEMBL25 |
| Variant | rsID or VCF | rs7412, 19-44908822-C-T |
| Pathway | Reactome | R-HSA-69278 |
| Trait | EFO | EFO_0004340 |
| Phenotype | HP | HP_0000001 |
| Study | GCST | GCST000001 |
| GOTerm | GO | GO_0006915 |

### 67+ Edge Types (Grouped)

**Gene ↔ Disease (10 types):** ASSOCIATED_WITH_DISEASE, CURATED_FOR, CAUSES, CIVIC_EVIDENCED_FOR, INHERITED_CAUSE_OF, THERAPEUTIC_TARGET_IN, SCORED_FOR_DISEASE, BIOMARKER_FOR, PGX_ASSOCIATED, ASSERTED_FOR_DISEASE

**Drug ↔ Gene (5 types):** TARGETS, TARGETS_IN_CONTEXT, HAS_PGX_INTERACTION, HAS_CLINICAL_DRUG_EVIDENCE, ASSERTED_FOR_DRUG

**Drug → Disease/SideEffect (3 types):** INDICATED_FOR, HAS_SIDE_EFFECT, HAS_ADVERSE_REACTION

**Variant → Gene (7 types):** PREDICTED_TO_AFFECT, POSITIONALLY_LINKED_TO, ENHANCER_LINKED_TO, PREDICTED_REGULATORY_TARGET, MISSENSE_PATHOGENIC_FOR, CLINVAR_ANNOTATED_IN, SOMATICALLY_MUTATED_IN

**Variant → Trait/Disease/Study/Drug/SideEffect (10 types):** GWAS_ASSOCIATED_WITH, CLINVAR_ASSOCIATED, PGX_DISEASE_ASSOCIATED, REPORTED_IN, PGX_RESPONSE_FOR, PGX_CLINICAL_RESPONSE, AFFECTS_RESPONSE_TO, STUDIED_FOR_DRUG_RESPONSE, FUNCTIONALLY_ASSAYED_FOR, LINKED_TO_SIDE_EFFECT

**Gene ↔ Gene (4 types):** INTERACTS_WITH, FUNCTIONALLY_RELATED, REGULATES, INTERACTS_IN_PATHWAY

**Gene → Other (8 types):** SCORED_FOR_TRAIT, ASSOCIATED_WITH_TRAIT, PARTICIPATES_IN, MANIFESTS_AS, MOUSE_MANIFESTS_AS, ANNOTATED_WITH, ASSOCIATED_WITH_SIDE_EFFECT, HAS_GWAS_VARIANT

**Cross-ontology (4 types):** MAPS_TO, TRAIT_PRESENTS_WITH, PRESENTS_WITH, SE_MAPS_TO

**Regulatory/cCRE (3 types):** OVERLAPS, EXPERIMENTALLY_REGULATES, COMPUTATIONALLY_REGULATES

**Metabolic (2 types):** CONTAINS_METABOLITE, METABOLITE_IS_A

**Study (1 type):** INVESTIGATES

**Ontology hierarchies (10 types):** SUBCLASS_OF, ANCESTOR_OF (Disease, Phenotype, Trait, GOTerm, Pathway variants)

---

## 11. Score Columns (36 Total)

Available for `analyzeCohort` topk and derive filters:

**Pathogenicity/Functional:** cadd_phred, cadd_raw, revel, alpha_missense, sift_val, polyphen_val, polyphen2_hdiv, polyphen2_hvar, mutation_taster, mutation_assessor, fathmm_xf, linsight

**Splicing:** spliceai_ds_max, pangolin_largest_ds

**Conservation:** gerp_rs, priphcons, mamphcons, verphcons, priphylop, mamphylop, verphylop

**Population frequency:** gnomad_af, gnomad_exome_af, bravo_af, tg_all

**APC Composite:** apc_conservation, apc_epigenetics, apc_protein_function, apc_proximity_to_coding, apc_local_nucleotide_diversity, apc_mutation_density, apc_transcription_factor, apc_mappability, apc_micro_rna

**Other:** recombination_rate, nucdiv

---

## 12. Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| AI SDK | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) |
| LLM | OpenAI GPT-4o |
| Agent Pattern | `ToolLoopAgent` (Vercel AI SDK) |
| Schema Validation | Zod |
| UI Components | shadcn/ui (custom theme) |
| Markdown | `streamdown` (streaming Markdown renderer) |
| Styling | Tailwind CSS with semantic design tokens |
| State | React hooks + localStorage (cohorts, jobs) |
| Transport | `DefaultChatTransport` → `/api/chat` |
| Backend | FastAPI (assumed) |
| Graph DB | Kuzu |
| Variant DB | ClickHouse + RocksDB |

---

## 13. File Tree

```
src/
├── app/
│   ├── agent/
│   │   └── page.tsx                    # Route entry point
│   └── api/
│       └── chat/
│           └── route.ts                # POST handler, streams agent response
├── features/
│   └── agent/
│       ├── agent.ts                    # ToolLoopAgent definition
│       ├── types.ts                    # Compressed output type definitions
│       ├── lib/
│       │   ├── system-prompt.ts        # System prompt builder (7 sections)
│       │   ├── api-client.ts           # agentFetch, cohortFetch, AgentToolError
│       │   ├── cohort-store.ts         # localStorage cohort persistence
│       │   └── compress.ts             # Shared compression utilities
│       ├── hooks/
│       │   └── use-agent-chat.ts       # Chat hook with paste detection
│       ├── tools/
│       │   ├── index.ts                # Re-exports all 14 tools
│       │   ├── search-entities.ts      # searchEntities
│       │   ├── entity-context.ts       # getEntityContext
│       │   ├── compare-entities.ts     # compareEntities
│       │   ├── ranked-neighbors.ts     # getRankedNeighbors
│       │   ├── enrichment.ts           # runEnrichment
│       │   ├── find-paths.ts           # findPaths
│       │   ├── shared-neighbors.ts     # getSharedNeighbors
│       │   ├── lookup-variant.ts       # lookupVariant
│       │   ├── gene-variant-stats.ts   # getGeneVariantStats
│       │   ├── gwas-lookup.ts          # getGwasAssociations
│       │   ├── cohort-create.ts        # createCohort
│       │   ├── cohort-analyze.ts       # analyzeCohort
│       │   ├── graph-traverse.ts       # graphTraverse
│       │   └── variant-batch-summary.ts# variantBatchSummary
│       └── components/
│           ├── chat-page.tsx           # Main chat UI (messages, input, layout)
│           ├── tool-renderers.tsx      # Custom React renderers for tool outputs
│           ├── workspace-sidebar.tsx   # Sidebar with jobs, cohorts, submit panel
│           ├── variant-submit-panel.tsx # Paste/upload variant input
│           ├── cohort-list-item.tsx     # Cohort row in sidebar
│           ├── job-list-item.tsx        # Job row in sidebar
│           └── error-boundary.tsx       # React error boundary
└── shared/
    └── components/
        └── ai-elements/                # Reusable AI chat UI primitives
            ├── conversation.tsx
            ├── message.tsx
            ├── tool.tsx
            ├── reasoning.tsx
            ├── prompt-input.tsx
            ├── markdown.tsx
            ├── shimmer.tsx
            └── code-block.tsx
```
