 ---
  Architecture Redesign: FAVOR-GPT → FAVOR Agent

  What You Have vs What You're Using
  ┌───────────────────────────────────┬────────────────┬───────────────────────────────────────────┐
  │            Backend API            │     Status     │            Impact if Wired Up             │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Sessions (CRUD)                   │ Unused         │ Conversation persistence across refreshes │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Messages (append/list)            │ Unused         │ Full history, incremental fetch           │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Memories (CRUD + semantic search) │ Unused         │ Cross-session learning, preference recall │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Feedback (thumbs up/down)         │ Unused         │ Your thumbs buttons finally work          │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Tool Calls (logging)              │ Unused         │ Audit trail, debugging, replay            │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Evidence (provenance)             │ Unused         │ Citation tracking, reproducibility        │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Jobs (SSE events)                 │ Partially used │ Real-time progress for long operations    │
  ├───────────────────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Artifacts                         │ Unused         │ Save reports, exports, CSVs               │
  └───────────────────────────────────┴────────────────┴───────────────────────────────────────────┘
  Your backend is built for a Claude Code-style agent. Your frontend is running a stateless chatbot. The gap is the ROI opportunity.

  ---
  Tier 1: Session Persistence + Memory Tools (Highest ROI)

  Pattern: Sequential Processing with Memory

  Right now every page refresh kills the conversation. The backend already has sessions/messages/memories APIs ready. This is the
  single highest-impact change.

  User opens /agent
      ↓
  POST /agent/sessions → get session_id
      ↓
  On each turn:
    1. POST /agent/sessions/{id}/messages (save user msg)
    2. POST /agent/memories/search (recall relevant memories)
    3. Inject memories into system prompt via prepareCall
    4. Agent runs tool loop
    5. POST /agent/sessions/{id}/messages (save assistant msg)
    6. Agent decides: save any new memories? → PUT /agent/memories

  New tools to add (2):
  ┌────────────────┬───────────────────────────────────────┬─────────────────────────────┐
  │      Tool      │              Description              │           Backend           │
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────┤
  │ recallMemories │ Semantic search across memories       │ POST /agent/memories/search │
  ├────────────────┼───────────────────────────────────────┼─────────────────────────────┤
  │ saveMemory     │ Store a fact, preference, or workflow │ PUT /agent/memories         │
  └────────────────┴───────────────────────────────────────┴─────────────────────────────┘
  The agent calls recallMemories automatically at the start of each turn (via prepareStep injecting relevant memories), and can call
   saveMemory when it discovers something worth remembering (e.g., "user's cohort coh_abc contains BRCA1 variants").

  AI SDK feature used: callOptionsSchema to pass sessionId and tenantId at runtime, prepareCall to inject recalled memories.

  ---
  Tier 2: Phase-Based Tool Control via prepareStep (High ROI, Low Effort)

  Pattern: Sequential Processing with Routing

  Your system prompt already defines PLAN → EXECUTE → EVALUATE → SYNTHESIZE but has no enforcement. All 14 tools are available at
  every step, so the model sometimes skips planning or calls the wrong tool first.

  Use prepareStep to enforce phases:

  prepareStep: async ({ stepNumber, steps }) => {
    const phase = determinePhase(stepNumber, steps);

    switch (phase) {
      case 'resolve':
        // Steps 0-2: Only entity resolution + memory recall
        return { activeTools: ['searchEntities', 'recallMemories'] };

      case 'explore':
        // Steps 3-8: Full tool access for data gathering
        return { activeTools: ALL_TOOLS };

      case 'analyze':
        // Steps 9-12: Cohort/enrichment focus
        return { activeTools: ['analyzeCohort', 'runEnrichment', 'getGeneVariantStats', 'variantBatchSummary'] };

      case 'synthesize':
        // Steps 13+: No tools, just write the answer
        return { activeTools: [] };
    }
  }

  This is ~30 lines of code with massive impact on tool call efficiency and answer quality.

  ---
  Tier 3: Routing by Query Type (High ROI, Medium Effort)

  Pattern: Routing

  Your system prompt has 7 decision trees, but they're all crammed into one ~6K token prompt. A classification step first would let
  you:

  1. Use a smaller/cheaper model for classification
  2. Load only the relevant decision tree + edge catalog subset
  3. Select the right tool subset

  User: "What drugs target BRCA1?"
      ↓
  Step 1: Classify → { type: "drug_discovery", entities: ["BRCA1"], complexity: "simple" }
      ↓
  Step 2: Route → load DRUG_DISCOVERY decision tree + Drug↔Gene edges only
      ↓
  Steps 3-N: Execute with focused context

  AI SDK feature used: prepareStep reads the classification from step 0's result and dynamically swaps the system prompt +
  activeTools for subsequent steps.

  The key insight: instead of spending ~6K tokens on the full edge catalog every turn, you spend ~1K tokens on classification + ~2K
  tokens on the relevant subset. Saves ~3K input tokens per turn and improves accuracy.

  ---
  Tier 4: Tool Call Logging + Evidence (Medium ROI, Very Low Effort)

  Pattern: Sequential side-effect in onStepFinish

  Wire up the existing backend APIs to log everything the agent does:

  new ToolLoopAgent({
    // ...
    onStepFinish: async ({ toolCalls, toolResults, usage }) => {
      for (const [call, result] of zip(toolCalls, toolResults)) {
        // Log tool call
        await fetch(`/agent/sessions/${sessionId}/tool-calls`, {
          method: 'POST',
          body: JSON.stringify({
            tool_name: call.toolName,
            input: call.args,
            output: result,
            status: result.error ? 'error' : 'ok',
            duration_ms: call.duration,
          })
        });

        // Log evidence for data-source tools
        if (DATA_SOURCE_TOOLS.includes(call.toolName)) {
          await fetch(`/agent/sessions/${sessionId}/evidence`, {
            method: 'POST',
            body: JSON.stringify({
              source: toolToSource(call.toolName),
              query: call.args,
            })
          });
        }
      }
    }
  });

  This makes thumbs-up/down meaningful (you can trace which tool calls led to good/bad answers), enables replay, and gives you an
  audit trail.

  ---
  Tier 5: Subagents for Heavy Exploration (Medium ROI, Medium Effort)

  Pattern: Orchestrator-Worker

  Two specific cases where subagents would shine:

  A. Graph Exploration Subagent
  When the user asks something like "How are BRCA1 and TP53 connected to breast cancer treatment?", the main agent currently tries
  to do multi-hop traversal in one shot. Instead:

  const graphExplorer = tool({
    description: 'Deep graph exploration for multi-hop questions',
    inputSchema: z.object({ task: z.string(), seeds: z.array(...) }),
    execute: async function* ({ task, seeds }, { abortSignal }) {
      const subagent = new ToolLoopAgent({
        model,
        instructions: GRAPH_EXPLORER_PROMPT, // Focused, smaller prompt
        tools: { graphTraverse, getRankedNeighbors, findPaths, getSharedNeighbors },
        stopWhen: stepCountIs(8),
      });

      const result = await subagent.stream({ prompt: task, abortSignal });
      for await (const msg of readUIMessageStream({ stream: result.toUIMessageStream() })) {
        yield msg; // User sees progress
      }
    },
    toModelOutput: ({ output }) => ({
      type: 'text',
      value: extractSummary(output) // Main agent gets concise summary
    })
  });

  B. Variant Analysis Subagent
  For cohort operations that might take many steps (create → analyze → derive → topk → bridge to KG):

  const variantAnalyzer = tool({
    description: 'Comprehensive variant/cohort analysis',
    inputSchema: z.object({ task: z.string(), cohortId: z.string().optional() }),
    execute: async function* ({ task, cohortId }) {
      const subagent = new ToolLoopAgent({
        model,
        instructions: VARIANT_ANALYST_PROMPT,
        tools: { createCohort, analyzeCohort, lookupVariant, getGeneVariantStats, variantBatchSummary, getGwasAssociations },
        stopWhen: stepCountIs(10),
      });
      // ... stream pattern same as above
    }
  });

  The main agent becomes an orchestrator with 3 execution paths:
  1. Simple queries → handle directly with searchEntities + getEntityContext
  2. Graph exploration → delegate to graphExplorer subagent
  3. Variant analysis → delegate to variantAnalyzer subagent

  This keeps the main agent's context clean and allows parallel exploration.

  ---
  Tier 6: Feedback Loop for Quality (Lower ROI, Higher Effort)

  Pattern: Evaluator-Optimizer

  After the agent generates its final response, add a self-evaluation step:

  stopWhen: ({ steps }) => {
    const lastStep = steps.at(-1);
    if (lastStep?.text?.includes('[FINAL_ANSWER]')) {
      // Agent marked its answer as final — evaluate it
      return false; // Continue to evaluation step
    }
    // ... other conditions
  }

  This is lower ROI for now because GPT-4o already produces decent answers for your domain. Worth adding later when you have
  feedback data showing specific failure modes.

  ---
  Recommended Implementation Order
  ┌──────────┬──────────────────────────────────────────────────────┬──────────┬──────────────────────────────────┐
  │ Priority │                        Change                        │  Effort  │              Impact              │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 1        │ Session persistence (wire up sessions/messages APIs) │ DONE     │ ✅ COMPLETED                     │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 2        │ prepareStep phase control                            │ DONE     │ ✅ COMPLETED                     │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 3        │ Memory tools (recallMemories + saveMemory)           │ DONE     │ ✅ COMPLETED                     │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 4        │ Tool call + evidence logging (onStepFinish)          │ 0.5 day  │ Audit trail, feedback works      │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 5        │ Query routing via classification step                │ DONE     │ ✅ COMPLETED                     │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 6        │ Subagents (graph explorer + variant analyzer)        │ DONE     │ ✅ COMPLETED                     │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 7        │ Feedback/thumbs wiring                               │ 0.5 day  │ Data collection for improvement  │
  └──────────┴──────────────────────────────────────────────────────┴──────────┴──────────────────────────────────┘
  Items 1-4 are the "Claude Code"-like foundation. Items 5-6 are the workflow sophistication. Item 7 is the data flywheel.


                                                                                                                                   │
│ Plan: Query Routing + Subagents + Task List UI (Priorities 5 & 6)                                                                │
│                                                                                                                                  │
│ Context                                                                                                                          │
│                                                                                                                                  │
│ The FAVOR agent currently sends its full ~6K token system prompt with all 16+ tools on every turn, regardless of query type.     │
│ Complex queries (multi-hop graph exploration, deep cohort analysis) run in the same flat tool loop as simple lookups, leading to │
│  unfocused tool usage and long chains. The user also has no visibility into what the agent is planning or doing.                 │
│                                                                                                                                  │
│ Goal: Add query classification that routes to focused tool subsets, subagent delegation for complex workflows, and a Claude      │
│ Code-style task list showing the agent's plan and progress.                                                                      │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ Architecture Overview                                                                                                            │
│                                                                                                                                  │
│ User message                                                                                                                     │
│     ↓                                                                                                                            │
│ Step 0-1 (RESOLVE): reportPlan + searchEntities + recallMemories (parallel)                                                      │
│     ↓                                                                                                                            │
│ prepareStep reads reportPlan → determines queryType                                                                              │
│     ↓                                                                                                                            │
│ Step 2+ (EXECUTE): Focused tool set based on queryType                                                                           │
│     ├─ Simple queries: direct tools (getEntityContext, getRankedNeighbors, etc.)                                                 │
│     ├─ graph_exploration/connection: graphExplorer subagent available                                                            │
│     └─ cohort_analysis/variant_analysis: variantAnalyzer subagent available                                                      │
│     ↓                                                                                                                            │
│ Steps 13+ (SYNTHESIZE): No tools, final answer                                                                                   │
│                                                                                                                                  │
│ The task list UI renders the reportPlan output as a live checklist that auto-updates as tool calls complete.                     │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ New Files                                                                                                                        │
│                                                                                                                                  │
│ 1. src/features/agent/tools/report-plan.ts                                                                                       │
│                                                                                                                                  │
│ Lightweight tool the model calls at step 0-1. No backend call — pure pass-through.                                               │
│                                                                                                                                  │
│ inputSchema: z.object({                                                                                                          │
│   queryType: z.enum([                                                                                                            │
│     "entity_lookup", "variant_analysis", "graph_exploration",                                                                    │
│     "cohort_analysis", "comparison", "connection", "drug_discovery", "general"                                                   │
│   ]),                                                                                                                            │
│   plan: z.array(z.object({                                                                                                       │
│     id: z.string(),     // e.g. "resolve", "get_stats"                                                                           │
│     label: z.string(),  // e.g. "Look up variant details"                                                                        │
│     tools: z.array(z.string()),  // expected tool names for this step                                                            │
│   })).min(1).max(8),                                                                                                             │
│ })                                                                                                                               │
│ execute: async (input) => input  // pass-through                                                                                 │
│                                                                                                                                  │
│ 2. src/features/agent/tools/subagents/graph-explorer.ts                                                                          │
│                                                                                                                                  │
│ For multi-hop graph exploration. Uses generateText() internally with a focused tool subset.                                      │
│                                                                                                                                  │
│ import { generateText, stepCountIs } from "ai";                                                                                  │
│ import { openai } from "@ai-sdk/openai";                                                                                         │
│                                                                                                                                  │
│ const GRAPH_TOOLS = {                                                                                                            │
│   searchEntities, getEntityContext, getRankedNeighbors,                                                                          │
│   findPaths, getSharedNeighbors, graphTraverse, compareEntities,                                                                 │
│ };                                                                                                                               │
│                                                                                                                                  │
│ inputSchema: z.object({                                                                                                          │
│   task: z.string(),                                                                                                              │
│   seedEntities: z.array(z.object({ type: z.string(), id: z.string(), label: z.string().optional() })).min(1),                    │
│   maxHops: z.number().optional().default(3),                                                                                     │
│ })                                                                                                                               │
│                                                                                                                                  │
│ execute: async ({ task, seedEntities, maxHops }) => {                                                                            │
│   const result = await generateText({                                                                                            │
│     model: openai("gpt-4o"),                                                                                                     │
│     system: GRAPH_EXPLORER_PROMPT,  // ~1.5K tokens, focused on graph traversal                                                  │
│     prompt: `Task: ${task}\nSeeds: ${JSON.stringify(seedEntities)}\nMax depth: ${maxHops}`,                                      │
│     tools: GRAPH_TOOLS,                                                                                                          │
│     stopWhen: stepCountIs(8),                                                                                                    │
│     maxOutputTokens: 4000,                                                                                                       │
│   });                                                                                                                            │
│   return {                                                                                                                       │
│     summary: result.text,                                                                                                        │
│     stepsUsed: result.steps.length,                                                                                              │
│     toolCallsMade: result.steps.reduce((s, step) => s + step.toolCalls.length, 0),                                               │
│     toolsUsed: [...new Set(result.steps.flatMap(s => s.toolCalls.map(tc => tc.toolName)))],                                      │
│   };                                                                                                                             │
│ }                                                                                                                                │
│                                                                                                                                  │
│ 3. src/features/agent/tools/subagents/variant-analyzer.ts                                                                        │
│                                                                                                                                  │
│ Same pattern for variant/cohort workflows.                                                                                       │
│                                                                                                                                  │
│ const VARIANT_TOOLS = {                                                                                                          │
│   searchEntities, lookupVariant, getGeneVariantStats,                                                                            │
│   getGwasAssociations, createCohort, analyzeCohort, variantBatchSummary,                                                         │
│ };                                                                                                                               │
│                                                                                                                                  │
│ inputSchema: z.object({                                                                                                          │
│   task: z.string(),                                                                                                              │
│   cohortId: z.string().optional(),                                                                                               │
│   variants: z.array(z.string()).optional(),                                                                                      │
│   geneSymbol: z.string().optional(),                                                                                             │
│ })                                                                                                                               │
│                                                                                                                                  │
│ // Same generateText pattern, stopWhen: stepCountIs(10)                                                                          │
│                                                                                                                                  │
│ 4. src/features/agent/tools/subagents/index.ts                                                                                   │
│                                                                                                                                  │
│ Barrel export for both subagents.                                                                                                │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ Modified Files                                                                                                                   │
│                                                                                                                                  │
│ 5. src/features/agent/agent.ts                                                                                                   │
│                                                                                                                                  │
│ Register 3 new tools:                                                                                                            │
│ import { graphExplorer, variantAnalyzer } from "./tools/subagents";                                                              │
│ // ...                                                                                                                           │
│ tools: {                                                                                                                         │
│   ...existing 16 tools,                                                                                                          │
│   reportPlan: tools.reportPlan,                                                                                                  │
│   graphExplorer,                                                                                                                 │
│   variantAnalyzer,                                                                                                               │
│ }                                                                                                                                │
│                                                                                                                                  │
│ Total: 19 tools registered, but prepareStep restricts to 8-12 per step.                                                          │
│                                                                                                                                  │
│ 6. src/features/agent/tools/index.ts                                                                                             │
│                                                                                                                                  │
│ Add export for reportPlan.                                                                                                       │
│                                                                                                                                  │
│ 7. src/features/agent/lib/prepare-step.ts                                                                                        │
│                                                                                                                                  │
│ Major enhancement — add query routing based on reportPlan result.                                                                │
│                                                                                                                                  │
│ New helper: extractPlan(steps) — scans steps for a reportPlan tool call result.                                                  │
│                                                                                                                                  │
│ New constant: TOOL_SETS — maps each queryType to a focused tool subset:                                                          │
│ queryType: entity_lookup                                                                                                         │
│ Tools Available: searchEntities, getEntityContext, getRankedNeighbors, getGeneVariantStats, getGwasAssociations, runEnrichment,  │
│   memory tools                                                                                                                   │
│ Subagent: none                                                                                                                   │
│ ────────────────────────────────────────                                                                                         │
│ queryType: variant_analysis                                                                                                      │
│ Tools Available: searchEntities, lookupVariant, getGeneVariantStats, getGwasAssociations, createCohort, analyzeCohort,           │
│   variantBatchSummary, memory tools                                                                                              │
│ Subagent: variantAnalyzer                                                                                                        │
│ ────────────────────────────────────────                                                                                         │
│ queryType: graph_exploration                                                                                                     │
│ Tools Available: searchEntities, getEntityContext, getRankedNeighbors, findPaths, getSharedNeighbors, graphTraverse,             │
│   compareEntities, runEnrichment, memory tools                                                                                   │
│ Subagent: graphExplorer                                                                                                          │
│ ────────────────────────────────────────                                                                                         │
│ queryType: cohort_analysis                                                                                                       │
│ Tools Available: searchEntities, createCohort, analyzeCohort, variantBatchSummary, getGeneVariantStats, runEnrichment,           │
│   getEntityContext, getRankedNeighbors, memory tools                                                                             │
│ Subagent: variantAnalyzer                                                                                                        │
│ ────────────────────────────────────────                                                                                         │
│ queryType: comparison                                                                                                            │
│ Tools Available: searchEntities, compareEntities, getEntityContext, getRankedNeighbors, getSharedNeighbors, findPaths,           │
│   runEnrichment, memory tools                                                                                                    │
│ Subagent: none                                                                                                                   │
│ ────────────────────────────────────────                                                                                         │
│ queryType: connection                                                                                                            │
│ Tools Available: searchEntities, findPaths, getSharedNeighbors, getEntityContext, getRankedNeighbors, graphTraverse, memory      │
│ tools                                                                                                                            │
│ Subagent: graphExplorer                                                                                                          │
│ ────────────────────────────────────────                                                                                         │
│ queryType: drug_discovery                                                                                                        │
│ Tools Available: searchEntities, getEntityContext, getRankedNeighbors, findPaths, getSharedNeighbors, runEnrichment,             │
│ graphTraverse,                                                                                                                   │
│    getGwasAssociations, memory tools                                                                                             │
│ Subagent: none                                                                                                                   │
│ ────────────────────────────────────────                                                                                         │
│ queryType: general                                                                                                               │
│ Tools Available: all 19 tools                                                                                                    │
│ Subagent: both                                                                                                                   │
│ New constant: QUERY_GUIDANCE — optional per-type system prompt supplement for explore phase.                                     │
│                                                                                                                                  │
│ Updated favorPrepareStep:                                                                                                        │
│ resolve phase → activeTools: [...RESOLVE_TOOLS, "reportPlan"]                                                                    │
│ explore phase →                                                                                                                  │
│   if reportPlan found: activeTools from TOOL_SETS[queryType], optional system guidance                                           │
│   else: all tools (fallback)                                                                                                     │
│ synthesize phase → no change                                                                                                     │
│                                                                                                                                  │
│ 8. src/features/agent/lib/system-prompt.ts                                                                                       │
│                                                                                                                                  │
│ Add to IDENTITY section:                                                                                                         │
│ - reportPlan is REQUIRED at step 0-1 (call in parallel with searchEntities + recallMemories)                                     │
│ - Query type definitions and when to use each                                                                                    │
│ - Update orchestrator phases to mention reportPlan                                                                               │
│                                                                                                                                  │
│ Add new section: Subagent Tools                                                                                                  │
│ - When to use graphExplorer (3+ hop, complex network analysis)                                                                   │
│ - When to use variantAnalyzer (multi-step cohort workflows)                                                                      │
│ - When NOT to use (simple 1-2 tool call queries)                                                                                 │
│                                                                                                                                  │
│ Update DECISION_TREES:                                                                                                           │
│ - All trees start with reportPlan(queryType=...) + searchEntities + recallMemories in step 0-1                                   │
│ - Tree #7 (connections) mentions graphExplorer for complex cases                                                                 │
│ - New tree #8 for cohort workflows with variantAnalyzer                                                                          │
│                                                                                                                                  │
│ 9. src/features/agent/types.ts                                                                                                   │
│                                                                                                                                  │
│ Add types:                                                                                                                       │
│ export type QueryType = "entity_lookup" | "variant_analysis" | "graph_exploration" | "cohort_analysis" | "comparison" |          │
│ "connection" | "drug_discovery" | "general";                                                                                     │
│ export interface PlanItem { id: string; label: string; tools: string[] }                                                         │
│ export interface ReportPlanOutput { queryType: QueryType; plan: PlanItem[] }                                                     │
│ export interface SubagentOutput { summary: string; stepsUsed: number; toolCallsMade: number; toolsUsed: string[] }               │
│                                                                                                                                  │
│ 10. src/features/agent/components/tool-renderers.tsx                                                                             │
│                                                                                                                                  │
│ New component: PlanRenderer                                                                                                      │
│ - Renders the task list as a visual checklist card                                                                               │
│ - Takes plan data + sibling tool parts from the same message                                                                     │
│ - Status logic per plan item:                                                                                                    │
│   - completed: at least one of the item's declared tools has state === "output-available"                                        │
│   - in-progress: at least one has state === "input-available" or is currently streaming                                          │
│   - pending: none matched yet                                                                                                    │
│ - Visual: green check (completed), spinning loader (in-progress), empty circle (pending)                                         │
│ - Uses bg-card, border-border, text-emerald-600, text-primary, text-muted-foreground                                             │
│                                                                                                                                  │
│ New component: SubagentRenderer                                                                                                  │
│ - Shows subagent result: steps used, tool calls made, tools used, summary text                                                   │
│ - Simple metadata bar + markdown summary                                                                                         │
│                                                                                                                                  │
│ Update renderToolOutput switch:                                                                                                  │
│ - reportPlan → return null (handled specially in chat-page.tsx)                                                                  │
│ - graphExplorer / variantAnalyzer → <SubagentRenderer />                                                                         │
│                                                                                                                                  │
│ Update getToolInputSummary:                                                                                                      │
│ - reportPlan → "Planning: entity lookup" etc.                                                                                    │
│ - graphExplorer → "Exploring: {task summary}"                                                                                    │
│ - variantAnalyzer → "Analyzing: {task summary}"                                                                                  │
│                                                                                                                                  │
│ 11. src/features/agent/components/chat-page.tsx                                                                                  │
│                                                                                                                                  │
│ Add to TOOL_TITLES:                                                                                                              │
│ reportPlan: "Analysis Plan",                                                                                                     │
│ graphExplorer: "Graph Explorer",                                                                                                 │
│ variantAnalyzer: "Variant Analyzer",                                                                                             │
│                                                                                                                                  │
│ Special rendering for reportPlan:                                                                                                │
│ Instead of wrapping in the collapsible <Tool> component, render as a standalone <PlanRenderer> card. Collect all sibling tool    │
│ parts from the message and pass them for live progress tracking.                                                                 │
│                                                                                                                                  │
│ if (toolName === "tool-reportPlan" && part.output) {                                                                             │
│   const siblingParts = message.parts.filter(p => isToolUIPart(p) && getToolName(p) !== "tool-reportPlan");                       │
│   return <PlanRenderer plan={part.output} siblingToolParts={siblingParts} />;                                                    │
│ }                                                                                                                                │
│                                                                                                                                  │
│ React re-renders as new parts stream in, so the checklist updates live.                                                          │
│                                                                                                                                  │
│ Update getFollowUpSuggestions:                                                                                                   │
│ - graphExplorer → ["What are the key intermediates?", "Explore a different path"]                                                │
│ - variantAnalyzer → ["Show the top pathogenic variants", "Bridge to knowledge graph"]                                            │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ Task List UI Design                                                                                                              │
│                                                                                                                                  │
│ ┌───────────────────────────────────────────────┐                                                                                │
│ │ [ListChecksIcon] Analysis Plan  [variant analysis] │                                                                           │
│ │                                               │                                                                                │
│ │  ✅ Resolve entity names                      │                                                                                │
│ │  ⟳  Look up variant details                  │                                                                                 │
│ │  ○  Analyze GWAS associations                 │                                                                                │
│ │  ○  Summarize findings                        │                                                                                │
│ └───────────────────────────────────────────────┘                                                                                │
│                                                                                                                                  │
│ - Card: bg-card border border-border rounded-lg px-4 py-3                                                                        │
│ - Header: icon + "Analysis Plan" + query type badge                                                                              │
│ - Items: status icon + label text                                                                                                │
│ - Completed: text-emerald-600 check + text-muted-foreground line-through                                                         │
│ - In-progress: text-primary animate-spin loader + text-foreground font-medium                                                    │
│ - Pending: text-muted-foreground/40 circle + text-muted-foreground                                                               │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ Data Flow                                                                                                                        │
│                                                                                                                                  │
│ 1. User asks: "How are BRCA1 and TP53 connected to breast cancer treatment?"                                                     │
│                                                                                                                                  │
│ 2. Step 0-1 (RESOLVE): Model calls in parallel:                                                                                  │
│    ├─ reportPlan({ queryType: "graph_exploration", plan: [                                                                       │
│    │    { id: "resolve", label: "Resolve BRCA1, TP53", tools: ["searchEntities"] },                                              │
│    │    { id: "explore", label: "Explore connections to breast cancer", tools: ["graphExplorer"] },                              │
│    │    { id: "drugs", label: "Find treatment targets", tools: ["getRankedNeighbors"] },                                         │
│    │    { id: "summarize", label: "Synthesize findings", tools: [] },                                                            │
│    │  ]})                                                                                                                        │
│    ├─ searchEntities("BRCA1")                                                                                                    │
│    ├─ searchEntities("TP53")                                                                                                     │
│    └─ recallMemories("BRCA1 TP53 breast cancer")                                                                                 │
│                                                                                                                                  │
│ 3. prepareStep(step 2):                                                                                                          │
│    ├─ Reads reportPlan → queryType = "graph_exploration"                                                                         │
│    ├─ activeTools = TOOL_SETS["graph_exploration"] (includes graphExplorer)                                                      │
│    └─ system guidance: "Graph exploration mode..."                                                                               │
│                                                                                                                                  │
│ 4. Step 2: Model calls graphExplorer({ task: "Find connections...", seedEntities: [...] })                                       │
│    └─ Internally runs generateText() with 8 steps, graph-focused tools                                                           │
│    └─ Returns: { summary: "BRCA1 and TP53 share...", stepsUsed: 5, ... }                                                         │
│                                                                                                                                  │
│ 5. Step 3: Model calls getRankedNeighbors(gene, "TARGETS") for drug targets                                                      │
│                                                                                                                                  │
│ 6. Step 4+: Synthesize final answer                                                                                              │
│                                                                                                                                  │
│ 7. UI shows:                                                                                                                     │
│    ├─ Task list checklist (live updates during streaming)                                                                        │
│    ├─ Tool cards for searchEntities, graphExplorer, getRankedNeighbors                                                           │
│    └─ Final markdown answer                                                                                                      │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ Implementation Order                                                                                                             │
│                                                                                                                                  │
│ Phase 1: reportPlan + routing (foundation)                                                                                       │
│                                                                                                                                  │
│ 1. Create tools/report-plan.ts                                                                                                   │
│ 2. Update prepare-step.ts with extractPlan, TOOL_SETS, QUERY_GUIDANCE                                                            │
│ 3. Update agent.ts to register reportPlan                                                                                        │
│ 4. Update tools/index.ts to export reportPlan                                                                                    │
│ 5. Update system-prompt.ts with planning instructions                                                                            │
│ 6. Add types to types.ts                                                                                                         │
│                                                                                                                                  │
│ Phase 2: Task List UI                                                                                                            │
│                                                                                                                                  │
│ 7. Add PlanRenderer to tool-renderers.tsx                                                                                        │
│ 8. Update chat-page.tsx for special reportPlan rendering + TOOL_TITLES                                                           │
│                                                                                                                                  │
│ Phase 3: Subagent tools                                                                                                          │
│                                                                                                                                  │
│ 9. Create tools/subagents/graph-explorer.ts                                                                                      │
│ 10. Create tools/subagents/variant-analyzer.ts                                                                                   │
│ 11. Create tools/subagents/index.ts                                                                                              │
│ 12. Update agent.ts to register subagent tools                                                                                   │
│ 13. Update prepare-step.ts TOOL_SETS to include subagent tools                                                                   │
│ 14. Update system-prompt.ts with subagent documentation                                                                          │
│ 15. Add SubagentRenderer to tool-renderers.tsx                                                                                   │
│ 16. Update chat-page.tsx TOOL_TITLES + follow-up suggestions                                                                     │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ Risk Mitigation                                                                                                                  │
│                                                                                                                                  │
│ - Subagent timeout: generateText() can take 30-60s for 8 steps. Route.ts has maxDuration = 120. Wrap subagent execute in         │
│ try/catch with timeout, return partial result on failure.                                                                        │
│ - Cost: Each subagent call is a full LLM conversation. System prompt instructs model to only delegate for complex (3+ step)      │
│ workflows.                                                                                                                       │
│ - No recursion: Subagent tools do NOT include themselves or each other in their tool set.                                        │
│ - Graceful fallback: If no reportPlan found in steps, prepareStep falls back to current behavior (all tools).                    │
│ - Streaming UX: While subagent runs (~30s), user sees tool card in "running" state. The task list shows the corresponding item   │
│ as in-progress.                                                                                                                  │
│                                                                                                                                  │
│ ---                                                                                                                              │
│ Verification                                                                                                                     │
│                                                                                                                                  │
│ 1. reportPlan called: Ask "Tell me about BRCA1" → model should call reportPlan with queryType="entity_lookup" alongside          │
│ searchEntities                                                                                                                   │
│ 2. Tool restriction: After reportPlan, only entity_lookup tools should be available (verify via network tab / tool calls)        │
│ 3. Task list renders: The plan should appear as a checklist card in the chat, updating live as tools complete                    │
│ 4. Graph subagent: Ask "How are BRCA1 and PARP1 connected through 3 intermediaries?" → model should use graphExplorer            │
│ 5. Variant subagent: Ask "Create a cohort from [10 variants], filter to pathogenic, rank by CADD, and show gene distribution" →  │
│ model should use variantAnalyzer                                                                                                 │
│ 6. Fallback: If model doesn't call reportPlan, agent should still work normally with all tools                                   │
│ 7. TypeScript: npx tsc --noEmit passes after all changes                       