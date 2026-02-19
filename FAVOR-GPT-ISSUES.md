# FAVOR-GPT Agent — Current Issues & Failure Analysis

> **Context:** This documents everything that's going wrong with the FAVOR-GPT agent right now. Share with ChatGPT alongside `FAVOR-GPT-ARCHITECTURE.md` for improvement suggestions.

---

## Issue 1: Agent Gives Up Too Easily (The #1 Problem)

### What happens
When a tool call returns an error/empty result, the agent **immediately synthesizes a response saying "no data found"** instead of retrying with corrected parameters or alternative tools.

### Observed example
**Query:** "Assess variant rs121913529 — what gene does it affect and what drugs target it?"

**Actual agent trace (4 steps, then gave up):**
```
Step 1: lookupVariant("rs121913529")           → ✅ success (got gene info)
Step 2: searchEntities("KRAS")                 → ✅ success (got ENSG00000133703)
Step 3: getRankedNeighbors(Gene, TARGETS, direction="out", scoreField="num_sources")
        → ❌ WRONG DIRECTION — TARGETS is Drug→Gene, need direction="in"
        → Returns: { error: true, message: "No neighbors found" }
Step 4: Response — "No drugs found targeting KRAS"  ← GAVE UP
```

**What it should have done (6-8 steps):**
```
Step 1: lookupVariant("rs121913529")           → ✅
Step 2: searchEntities("KRAS")                 → ✅
Step 3: getRankedNeighbors(Gene, TARGETS, direction="in")  ← CORRECT direction
        → Would return: sotorasib, adagrasib, etc. (KRAS is a major drug target)
Step 4: getGwasAssociations("rs121913529")     → GWAS data
Step 5: getGeneVariantStats("KRAS")            → variant burden context
Step 6: Synthesize comprehensive answer
```

### Root causes
1. **Direction confusion:** The edge catalog says `TARGETS: Drug→Gene` but the agent still uses `direction="out"` from Gene. The arrow notation isn't sinking in.
2. **No retry behavior:** The generic hint `"Try a different edge type, direction, or verify the entity ID"` is too vague. GPT-4o treats it as a suggestion, not a mandate.
3. **Premature synthesis:** The agent's "EVALUATE" phase defaults to "I got an error, so there's no data" instead of "I got an error, let me try another approach."

---

## Issue 2: Edge Direction Is Systematically Wrong

### The pattern
The agent gets direction wrong specifically for **reverse-direction edges** — where the edge arrow goes opposite to the intuitive query direction:

| Query intent | Edge | Correct call | What agent does |
|---|---|---|---|
| "Drugs targeting gene X" | TARGETS (Drug→Gene) | direction="in" from Gene | direction="out" ❌ |
| "Drugs for gene in context" | TARGETS_IN_CONTEXT (Drug→Gene) | direction="in" from Gene | direction="out" ❌ |
| "Genes for disease X" | ASSOCIATED_WITH_DISEASE (Gene→Disease) | direction="in" from Disease | Sometimes correct, sometimes wrong |

### Why it happens
- The system prompt edge catalog uses `From→To` notation: `TARGETS: Drug→Gene`
- GPT-4o interprets "I'm looking FROM Gene" → direction="out" (away from Gene)
- But TARGETS is stored as Drug→Gene, so from the Gene's perspective, incoming edges (direction="in") give you the Drugs

### Current mitigation attempted
We added a "Direction Quick Reference" table and a bolded rule to the system prompt. **But this is a bandaid** — the fundamental problem is that direction logic is complex and GPT-4o doesn't reliably apply table lookups mid-reasoning.

---

## Issue 3: Cheap Tool Call Budget — Agent Isn't Agentic Enough

### The numbers
From the observed trace of `"Assess variant rs121913529 — what gene does it affect and what drugs target it?"`:
- **4 total tool calls** (including the failed one)
- **2.45 seconds** for the final step before giving up
- The agent has a budget of 15 steps and guidance for <10 calls, but it's averaging **3-4 calls** even for complex multi-part questions

### What's happening
The system prompt says:
> "Budget: <10 tool calls per question. Most questions need 2-4 calls."

The agent is over-indexing on "2-4 calls" and treating it as a ceiling rather than a floor for complex questions. The `<10` budget is meant as a waste-prevention guardrail, not a target.

### Expected call counts by query complexity
| Query type | Expected tools | Agent actually uses |
|---|---|---|
| Simple lookup ("tell me about X") | 2-3 | 2 ✅ |
| Cross-domain ("variant → gene → drugs") | 5-7 | 3-4 ❌ |
| Comparative ("shared targets between 2 diseases") | 5-8 | 3-4 ❌ |
| Enrichment pipeline ("pathways enriched in disease genes") | 4-6 | 3 ❌ |

---

## Issue 4: System Prompt Size vs. Attention Allocation

### Token budget
| Component | Estimated tokens | % of context |
|---|---|---|
| System prompt (instructions) | ~4,000 | — |
| Tool schemas (14 tools × descriptions + param descriptions) | ~2,000 | — |
| **Total fixed overhead per turn** | **~6,000** | — |
| Edge catalog section alone | ~1,500 | 25% of prompt |
| Decision trees section | ~600 | 10% of prompt |
| Agent rules section | ~500 | 8% of prompt |

### The attention problem
The edge catalog is **~100 lines with 67+ edge types**. GPT-4o needs to:
1. Find the right edge type for the query
2. Read its direction (From→To)
3. Determine the correct `direction` parameter
4. Pick the right `scoreField`
5. Know the fallback edges if it fails

That's 5 lookups in a dense table during tool-call reasoning. The model is clearly not attending to all of this reliably — it gets step 1 right (picks TARGETS) but fails step 3 (direction) consistently.

### Compounding factor
After a few conversation turns, the accumulated messages + tool results push the edge catalog further from the attention window. The system prompt is at the beginning of context, but with 7000+ tokens of tool results between them, the model's attention to the direction rules degrades.

---

## Issue 5: Tool Error Messages Are Too Generic

### Current error from `getRankedNeighbors`
```json
{
  "error": true,
  "message": "No neighbors found for Gene:ENSG00000133703 via TARGETS (direction=out)",
  "hint": "Try a different edge type, direction, or verify the entity ID with searchEntities."
}
```

### Problems
1. **Doesn't tell the agent WHY it failed.** Was TARGETS wrong? Was direction wrong? Was the entity ID wrong? The hint suggests all three equally.
2. **Doesn't suggest the specific fix.** For TARGETS from a Gene, the fix is always `direction="in"`. The error should say that.
3. **"Try a different edge type"** is actively misleading — TARGETS is the RIGHT edge, just the wrong direction.

### What the error should look like
```json
{
  "error": true,
  "message": "No neighbors found for Gene:ENSG00000133703 via TARGETS (direction=out)",
  "hint": "TARGETS goes Drug→Gene. From a Gene, use direction='in' to find targeting drugs. If still empty, try HAS_PGX_INTERACTION (direction='out') or HAS_CLINICAL_DRUG_EVIDENCE (direction='out')."
}
```

The tool itself could have direction-awareness built in — if it knows the edge catalog, it could auto-correct or at least provide a targeted hint.

---

## Issue 6: No Parallel Tool Calls

### What the AI SDK supports
The Vercel AI SDK `ToolLoopAgent` supports parallel tool calls — the model can emit multiple tool calls in a single step, and the SDK executes them concurrently.

### What the agent does
From the trace:
```
Step 12: User message → lookupVariant          (sequential)
Step 13: lookupVariant → searchEntities         (sequential)
Step 14: searchEntities → getRankedNeighbors    (sequential)
Step 15: getRankedNeighbors → Response          (sequential)
```

Every step is sequential. But steps 13-14 could potentially be parallelized (searchEntities for the gene + getGwasAssociations for the variant are independent).

### Why
- The system prompt says "Use parallel calls when inputs are independent" but GPT-4o rarely does this unprompted
- There's no explicit instruction like "After lookupVariant, call searchEntities AND getGwasAssociations in parallel"
- The decision trees are written sequentially with `→` arrows, not showing parallelism

---

## Issue 7: `lookupVariant` Returns Unstructured Text Blob

### Current behavior
`lookupVariant` calls `buildVariantPrompt(variant)` which returns a **large pre-formatted text string** designed for a different use case (the variant detail page's AI summary). This text blob includes:
- Raw annotation values
- Formatting instructions (which get stripped)
- No structured fields the agent can programmatically extract from

### Impact
When the agent gets back a variant lookup, it has to **parse natural language** to extract the gene name, then search for it. With structured output, it would just read `result.gene` and proceed.

### What it should return
```json
{
  "variant": "rs121913529",
  "gene": { "symbol": "KRAS", "ensemblId": "ENSG00000133703" },
  "consequence": "missense_variant",
  "clinicalSignificance": "Pathogenic",
  "scores": { "cadd": 26.3, "revel": 0.89 },
  "frequencies": { "gnomadAf": 0.00001 },
  "summary": "Pathogenic KRAS missense variant..."
}
```

This would let the agent skip the `searchEntities` call entirely and go straight to `getRankedNeighbors` with the gene ID.

---

## Issue 8: No Memory of What Failed

### The problem
When the agent calls `getRankedNeighbors(TARGETS, direction="out")` and gets an error, then the system prompt tells it to "try a different direction or edge type" — but the agent has to **re-reason about the edge catalog from scratch**. There's no mechanism to:

1. Track which edges have been tried for this entity
2. Automatically suggest the next fallback
3. Learn from the failure within the conversation

### Example failure cascade
```
Agent thinks: "I need drugs for KRAS. Let me try TARGETS direction=out."
→ Fails
Agent thinks: "The hint says try a different edge type. Let me... give up and respond."
```

It should think: "TARGETS failed with direction=out. The error hint says TARGETS goes Drug→Gene, so I need direction=in. Let me retry."

But instead it treats the failure as definitive.

---

## Issue 9: Conflicting Guidance in System Prompt

### "Know when to stop" vs "Never give up"
The prompt says:
> "Know when to stop. If the summary answers the question, synthesize immediately. Don't fetch more data for completeness."

AND:
> "NEVER give up after one failed edge."

These are in tension. The agent over-applies the "know when to stop" rule and uses it to justify not retrying after failures.

### "Budget: <10" is misinterpreted
> "Budget: <10 tool calls per question. Most questions need 2-4 calls. If you're at 6+, you're probably over-fetching."

The "2-4 calls" and "6+ is over-fetching" language makes the agent conservative. For complex queries that genuinely need 6-8 calls, the agent self-limits at 4 because it thinks it's being efficient.

---

## Issue 10: No Structured Reasoning / Chain-of-Thought Enforcement

### What's missing
The agent doesn't produce visible reasoning about its plan. From the trace:
```
User message → immediately calls lookupVariant
```

There's no "Let me plan: I need to (1) look up the variant, (2) find the gene, (3) get GWAS data, (4) find drugs, (5) synthesize."

### Why it matters
Without explicit planning, the agent:
- Doesn't pre-compute the right directions for edges
- Doesn't identify which calls can be parallel
- Doesn't set a recovery strategy before starting
- Gives up easier because there's no "plan" to complete

### Potential fix
Force a planning step by adding to the system prompt:
> "Before your first tool call, output a brief plan as a numbered list. This helps you track progress and ensures you don't stop prematurely."

Or use the AI SDK's `reasoning` / `thinking` feature if available with GPT-4o.

---

## Summary: Priority-Ranked Issues

| Priority | Issue | Impact | Fix Difficulty |
|---|---|---|---|
| 🔴 P0 | Direction wrong for reverse edges (TARGETS etc.) | Agent gives wrong answers | Medium — better error hints + prompt |
| 🔴 P0 | Gives up after first failure instead of retrying | Agent appears broken to users | Medium — prompt + smarter error hints |
| 🟠 P1 | Too few tool calls for complex queries | Shallow, incomplete answers | Easy — reword budget guidance |
| 🟠 P1 | Generic error hints don't guide recovery | Agent can't self-correct | Medium — direction-aware error messages |
| 🟡 P2 | No parallel tool calls | Slow response times | Easy — add parallel examples to prompt |
| 🟡 P2 | lookupVariant returns unstructured text | Wastes a searchEntities call | Medium — return structured data |
| 🟡 P2 | System prompt too dense for attention | Direction rules get lost | Hard — needs RAG or restructuring |
| ⚪ P3 | No visible planning step | Poor reasoning chains | Easy — add to prompt |
| ⚪ P3 | Conflicting stop vs retry guidance | Ambiguous behavior | Easy — reword prompt |
| ⚪ P3 | No memory of tried edges within a turn | Redundant failures | Hard — needs tool-level state |
