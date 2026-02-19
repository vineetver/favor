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
  │ 1        │ Session persistence (wire up sessions/messages APIs) │ 2-3 days │ Conversations survive refresh    │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 2        │ prepareStep phase control                            │ 0.5 day  │ Fewer wasted tool calls          │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 3        │ Memory tools (recallMemories + saveMemory)           │ 1-2 days │ Cross-session intelligence       │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 4        │ Tool call + evidence logging (onStepFinish)          │ 0.5 day  │ Audit trail, feedback works      │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 5        │ Query routing via classification step                │ 1-2 days │ Smaller prompts, better accuracy │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 6        │ Subagents (graph explorer + variant analyzer)        │ 2-3 days │ Better complex queries           │
  ├──────────┼──────────────────────────────────────────────────────┼──────────┼──────────────────────────────────┤
  │ 7        │ Feedback/thumbs wiring                               │ 0.5 day  │ Data collection for improvement  │
  └──────────┴──────────────────────────────────────────────────────┴──────────┴──────────────────────────────────┘
  Items 1-4 are the "Claude Code"-like foundation. Items 5-6 are the workflow sophistication. Item 7 is the data flywheel.