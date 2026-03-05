# FAVOR Agent (`src/features/agent`)

This module implements the AI SDK-powered agent used by the `/agent` experience.
It combines:

- A streaming chat UI
- A `ToolLoopAgent` orchestration loop
- A 5-tool surface (`State`, `Read`, `Search`, `Run`, `AskUser`)
- Stateful session memory + artifact compaction
- Deterministic visualization generation from tool outputs

If you are new to this agent, start with:

1. [How to use the agent (for end users)](#how-to-use-the-agent-for-end-users)
2. [Quick start (for developers)](#quick-start-for-developers)
3. [Architecture](#architecture-full-system)

---

## How to use the agent (for end users)

Open the app at `/agent` and ask directly in natural language.

Good starting prompts:

- "Create a cohort from these variants: ... "
- "Set cohort `<id>` and show top hits by CADD."
- "Show QC summary for my active cohort."
- "Find diseases connected to BRCA1."
- "Compare BRCA1 and TP53 neighbors."
- "Run PCA on numeric features in this cohort."

### Recommended user workflow

1. **Create or select a cohort**
   - Paste variants and use the "Create cohort" flow, or ask the agent to `set_cohort`.
2. **Orient**
   - Ask for cohort schema/QC summary to understand available fields.
3. **Run analysis**
   - Ranking (`top_hits`), QC (`qc_summary`), GWAS (`gwas_minimal`), analytics (`analytics`), graph exploration (`explore`, `traverse`, `query`).
4. **Iterate**
   - Ask follow-up questions. The agent can route explanation-only follow-ups without extra tool calls when possible.
5. **Use visual outputs**
   - Charts/plots/networks are generated deterministically from tool outputs.

### Tips for best results

- Be explicit about goals ("rank by X", "compare A vs B", "find paths from X to Y").
- If referring to cohort columns, use exact names when possible (the agent also does auto-correction for close matches).
- For graph queries with fuzzy names, plain labels (e.g. `"BRCA1"`) are enough.

---

## Quick start (for developers)

### Primary entrypoints

- Page: `src/app/agent/page.tsx`
- Chat API route: `src/app/api/chat/route.ts`
- Agent factory: `src/features/agent/agent.ts`
- Chat UI + orchestration hook: `src/features/agent/components/chat-page.tsx`, `src/features/agent/hooks/use-agent-chat.ts`

### Runtime flow at a glance

1. UI sends messages to `POST /api/chat` (AI SDK React transport).
2. Route classifies query:
   - `explanation_only` -> single-step no-tool synthesis path
   - `full_agent` -> full `ToolLoopAgent` loop
3. Agent runs tools, updates state, generates viz specs, streams response.
4. User and assistant messages are persisted by session.
5. Large tool outputs are compacted into artifact references for storage efficiency.

---

## Architecture (full system)

### Layered view

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Presentation Layer                                                     │
│  - /agent page                                                          │
│  - ChatPage + WorkspaceSidebar + ActivityTimeline + VizSpecPanel        │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ useChat(DefaultChatTransport)
┌───────────────────────────────▼──────────────────────────────────────────┐
│  Transport / API Layer                                                  │
│  - POST /api/chat (App Router route)                                    │
│  - Query classification (explanation_only vs full_agent)                │
│  - Message persistence (user + assistant compacted)                     │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ createFavorAgent(sessionId, model)
┌───────────────────────────────▼──────────────────────────────────────────┐
│  Agent Orchestration Layer (AI SDK)                                     │
│  - ToolLoopAgent                                                        │
│  - System prompt builder (state-aware + zero-trust policy)              │
│  - prepareStep control loop (budgets, stuck detection, synthesis gate)  │
│  - onStepFinish hooks (state update + viz generation + telemetry)        │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ calls tools
┌───────────────────────────────▼──────────────────────────────────────────┐
│  Tool Layer (5 tools)                                                   │
│  State | Read | Search | Run | AskUser                                  │
│  Run includes command DSL + validation + handlers + recovery            │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │ HTTP via agentFetch/cohortFetch
┌───────────────────────────────▼──────────────────────────────────────────┐
│  Backend APIs                                                           │
│  - /agent/sessions, /messages, /state, /artifacts, /memories           │
│  - /cohorts/* (schema, rows, groupby, analytics, status, derive, etc.) │
│  - /graph/* (search, resolve, context, query, traverse, schema, etc.)  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Turn execution sequence (full agent path)

```text
User -> ChatPage -> /api/chat route
  -> classifyQuery()
  -> createFavorAgent()
  -> ToolLoopAgent step loop:
       step 0: prepareStep loads session state + injects system prompt
       steps N: model chooses tools
         -> tool execute
         -> tool result (RunResult/JSON/etc)
         -> onStepFinish:
              - apply Run state_delta to in-memory context
              - generate VizSpecs from Run output
              - emit step telemetry
       stop on stepCount/budget/stuck/context-critical
  -> stream assistant response
  -> compact + persist assistant message
```

### Fast path: explanation-only follow-up

When query classifier marks a follow-up as explanation-only, `/api/chat` creates a single-step `ToolLoopAgent` configured not to call tools and synthesizes from prior conversation/tool results.

---

## Data movement

### 1) Message and session flow

- Client creates session lazily on first send (`createSessionClient`).
- User message is persisted (write-ahead style) from route.
- Assistant response is persisted at completion.
- Existing sessions can be loaded via `listMessagesClient`.

### 2) Session state flow

- Session state is fetched from `/agent/sessions/{id}/state`.
- `prepareStep` injects state snapshot into prompt on step 0.
- `Run` tool results may include `state_delta`:
  - `active_cohort_id`
  - `pinned_entities`
  - `new_artifact_ids`
  - `active_job_ids`
  - `derived_cohorts`
- `prepareStep` applies and asynchronously patches state with optimistic versioning.

### 3) Tool output + artifact compaction flow

- Large tool outputs in assistant messages are compacted:
  - Stored as `/agent/sessions/{id}/artifacts`
  - Message keeps lightweight `_artifact_ref` pointer + preview
- On session reload, UI can lazily resolve artifact refs via `/agent/artifacts/{id}`.

### 4) Visualization flow

- On each `Run` tool step, `generateVizSpecs()` inspects output and emits deterministic `VizSpec`s.
- Viz specs are embedded in persisted assistant messages (`_vizSpecs`) so charts survive reload.
- `VizSpecPanel` renders charts/networks/stat cards from specs.

---

## Tool surface

The agent exposes five top-level tools in `createAgentTools()`.

### 1) `State`

Purpose:

- Return workspace snapshot for orientation.

Includes:

- Active cohort metadata
- Schema digest + available methods (when active cohort exists)
- Pinned entities
- Active jobs
- Derived cohorts
- Graph portal mode

### 2) `Read`

Purpose:

- Read concrete resources by path.

Examples:

- `cohort/{id}/schema`
- `cohort/{id}/sample`
- `cohort/{id}/profile`
- `run/{cohort_id}/{run_id}`
- `run/{cohort_id}/{run_id}/viz/{chart_id}`
- `artifact/{id}`
- `entity/{type}/{id}`
- `entity/{type}/{id}/context`
- `variant/{query}`
- `graph/schema` / `graph/schema/{type}`

Notable behavior:

- Curates entity payloads for LLM efficiency.
- Compacts large run/artifact/entity responses for model context safety.

### 3) `Search`

Purpose:

- Search across entities, columns, methods, artifacts, memories, or all scopes.

Scopes:

- `entities`, `columns`, `methods`, `artifacts`, `memories`, `all`

Notable behavior:

- Uses active cohort schema for column/method search.
- Truncates long subtitle/content fields for context control.

### 4) `Run`

Purpose:

- Execute action commands across cohort analytics, graph exploration, and workspace state changes.

### Run command groups

- **Cohort**: `rows`, `groupby`, `correlation`, `derive`, `prioritize`, `compute`, `export`, `create_cohort`
- **Analytics**: `analytics`, `analytics.poll`, `viz`
- **Workflow macros**: `top_hits`, `qc_summary`, `gwas_minimal`, `variant_profile`, `compare_cohorts`
- **Graph primitives**:
  - `explore` (modes: `neighbors`, `compare`, `enrich`, `similar`, `context`, `aggregate`)
  - `traverse` (modes: `chain`, `paths`)
  - `query` (pattern-based graph matching)
- **Workspace**: `pin`, `set_cohort`, `remember`

### Run reliability pipeline

`validate -> preToolUse -> handler -> postToolUse -> escalateOnFailure`

- **Validation**
  - Zod-based discriminated command schema
  - analytics input normalization (`method`/`params.type` reconciliation + defaults)
- **Pre-gates**
  - Missing cohort detection
  - Schema prefetch and cache
  - Column auto-correction / disambiguation (`AskUser` when ambiguous)
  - Analytics feature-count guard
- **Post-processing**
  - Attach repair metadata for auto-corrected columns
  - Cohort fingerprint metadata
  - Empty-result probe recovery with actionable `next_actions`
- **Escalation**
  - Tracks repeated failures and progressively suggests:
    1) schema read / safer workflow
    2) direct user clarification

### Run output contract

Run handlers return canonical envelope (`RunResultEnvelope`) with:

- `status`: `ok | empty | needs_user | error | need_clarification | partial`
- `text_summary`
- `data`
- `state_delta`
- optional: `next_actions`, `repairs`, `warnings`, `trace`, `candidates`, etc.

### 5) `AskUser`

Purpose:

- Request clarifications when intent is ambiguous (column choice, entity disambiguation, under-specified goal, equivalent analysis branches).

---

## Core capabilities

The agent supports:

- Cohort creation from variant references
- Cohort querying, filtering, ranking, derivation
- Statistical analytics (regression, clustering, PCA, tests, GWAS QC helpers)
- Graph exploration, multi-hop traversal, and structural queries
- Cross-turn workspace continuity via session state
- Cross-session recall via memory search/write
- Visualization generation (bar, enrichment, network, distribution, comparison, scatter, QQ, heatmap, protein domain architecture)
- Follow-up explanation mode without extra tool calls when appropriate

---

## AI SDK integration details

### Agent construction

- Uses `ToolLoopAgent` from `ai`.
- Stop conditions:
  - hard step cap (`stepCountIs(8)`)
  - `prepareStep` budget/stuck/context checks
- Dev mode can wrap model with `@ai-sdk/devtools` middleware.

### Model strategy

- Synthesis model is user-selectable:
  - `fast` -> `gpt-5-nano`
  - `thinking` -> `gpt-5.2`
- Provider options are mode-specific and passed via `prepareStep`.

### Prompt strategy

- Base system prompt includes:
  - strict zero-trust data policy
  - tool reference + command patterns
  - behavioral rules (state-first orientation, concise evidence-based synthesis)
- Session state snippet is injected when available.

---

## Guardrails and reliability controls

- Context budgeting (`isContextHeavy`, `isContextCritical`)
- Forced synthesis on:
  - critical context pressure
  - tool-call budget reached
  - max-step reached
  - stuck-loop/error-loop detection
- API robustness:
  - deterministic idempotency keys
  - retries/backoff for retryable errors
  - timeout-to-structured error conversion
- Tool-level compaction for model context size control

---

## File map (high-value files)

- `agent.ts` — tool assembly + `ToolLoopAgent` factory + per-step hooks
- `lib/prompts/system.ts` — system prompt builder
- `lib/prepare-step.ts` — step controller, budgets, state patching
- `lib/session-state.ts` — state model + patch/apply helpers
- `lib/api-client.ts` — API transport, retries, timeout, polling helpers
- `lib/query-classifier.ts` — explanation-only fast-path classifier
- `lib/compact-message.ts` — artifact compaction for persistence
- `tools/state.ts` — workspace snapshot tool
- `tools/read.ts` — resource path reader + curation
- `tools/search.ts` — multi-scope search
- `tools/run/*` — Run DSL, handlers, validation, recovery
- `tools/ask-user.ts` — clarification tool
- `viz/generators.ts` — deterministic tool-output -> viz-spec generation
- `hooks/use-agent-chat.ts` — chat/session client orchestration
- `components/chat-page.tsx` — UX surface + timeline + chart rendering

---

## Extending the agent

### Add a new Run command

1. Add command schema in `tools/run/types.ts`.
2. Implement handler in `tools/run/handlers/*`.
3. Register handler in `tools/run/index.ts` (`COMMAND_HANDLERS`).
4. Add validation hints (and pre/post behavior if needed).
5. Optionally add viz generator mapping in `viz/generators.ts`.
6. Update prompt command reference in `lib/prompts/system.ts`.

### Add a new top-level tool

1. Create tool file in `tools/`.
2. Register in `createAgentTools()` (`agent.ts`).
3. Update tool reference section in system prompt.
4. Add timeline/UI handling if output needs special rendering.

---

## Known behavior notes

- `export` currently returns a not-implemented warning and points users to cohort UI export.
- `analytics` typically auto-submits, polls, and fetches charts in one command.
- Large tool outputs are intentionally compacted for persistence/context control.

