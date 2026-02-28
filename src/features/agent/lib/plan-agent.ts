import { generateObject } from "ai";
import { z } from "zod";
import { nanoModel } from "./models";
import type { AgentPlan, ConversationContext } from "../types";

const PlanStepSchema = z.discriminatedUnion("do", [
  z.object({
    do: z.literal("resolve"),
    entities: z.array(z.string()).describe("Entity names to resolve (e.g., 'BRCA1', 'breast cancer')"),
  }),
  z.object({
    do: z.literal("delegate"),
    agent: z.enum(["variantTriage", "bioContext"]),
    task: z.string().describe("Natural language task for the specialist"),
    cohortId: z.string().nullable().describe("Cohort ID if applicable, null if not"),
    geneSymbol: z.string().nullable().describe("Gene symbol if applicable, null if not"),
  }),
  z.object({
    do: z.literal("direct"),
    description: z.string().describe("What to do with direct tools (e.g., 'Look up variant rs429358' or 'Get gene variant stats for BRCA1')"),
  }),
  z.object({
    do: z.literal("batch"),
    description: z.string().describe("What parallel operations to run (e.g., 'Get ranked neighbors for BRCA1, TP53, and ATM in parallel')"),
  }),
  z.object({
    do: z.literal("synthesize"),
  }),
]);

const PlanSchema = z.object({
  queryType: z.enum([
    "entity_lookup", "variant_analysis", "graph_exploration",
    "cohort_analysis", "comparison", "connection", "drug_discovery", "analytics", "general",
  ]),
  steps: z.array(PlanStepSchema).min(1).max(6),
});

const PLAN_AGENT_PROMPT = `You are a query planner for a statistical genetics agent.
Given a user question, classify its type and produce an execution plan.

AGENTS AVAILABLE:
- variantTriage: cohort analytics, variant annotation, gene burden stats, GWAS associations. Works with cohort IDs, variant lists, gene symbols. Use for complex multi-step cohort workflows.
- bioContext: knowledge graph exploration, gene-disease associations, drug targets, pathways, enrichment, entity comparison, path finding. Use for complex multi-step graph workflows.

DIRECT TOOLS (prefer for simple tasks):
The supervisor has direct access to all micro-tools. For simple tasks (1-2 tool calls), use { do: "direct", description: "..." } instead of delegating.

Examples of "direct" steps:
- Single variant lookup: { do: "direct", description: "Look up variant rs429358 with lookupVariant" }
- Gene stats: { do: "direct", description: "Get gene variant stats for BRCA1" }
- GWAS lookup: { do: "direct", description: "Get GWAS associations for variant" }
- Simple neighbor query: { do: "direct", description: "Get ranked neighbors for the resolved gene" }
- Simple enrichment: { do: "direct", description: "Run enrichment on the gene list" }
- Overlap/motif queries: { do: "direct", description: "Use findPatterns to find genes targeted by drug X that overlap with disease Y genes" }

OVERLAP / MOTIF QUERIES (prefer findPatterns):
When the user asks about overlap, intersection, or structural patterns across multiple entities/relationships, use findPatterns directly.
- "What genes does drug X target that are also associated with disease Y?" → { do: "direct", description: "Use findPatterns with Drug→Gene→Disease pattern" }
- "Which pathways contain genes that interact with gene X?" → { do: "direct", description: "Use findPatterns with Gene→Gene→Pathway pattern" }
Do NOT delegate these to bioContext — findPatterns handles them in one call.

BATCH STEPS (parallel execution):
Use { do: "batch" } when the same operation must run on multiple entities independently.
- "Compare 3 genes": { do: "batch", description: "Get ranked neighbors for BRCA1, TP53, and ATM in parallel" }
- "Stats for each": { do: "batch", description: "Get gene variant stats for each resolved gene in parallel" }
- "GWAS for variants": { do: "batch", description: "Get GWAS associations for each variant in parallel" }
Do NOT use batch for sequential dependencies or specialist delegation.

Examples of "delegate" steps (3+ dependent tool calls):
- Full cohort triage: { do: "delegate", agent: "variantTriage", task: "Analyze cohort, group by gene, rank by CADD" }
- Pathway discovery pipeline: { do: "delegate", agent: "bioContext", task: "Find gene-disease associations and run pathway enrichment" }

FOLLOW-UP DETECTION (critical — saves time and tokens):
If the user's message is a FOLLOW-UP that can be answered from prior conversation context, output:
  { queryType: "general", steps: [{ do: "synthesize" }] }

CRITICAL: A synthesize-only plan is ONLY valid on follow-up turns (when CONVERSATION CONTEXT is present below).
On the FIRST turn of a conversation, you MUST always include at least one data-fetching step (resolve, delegate, direct, or batch) before synthesize.
NEVER assume you know the answer — all biological facts must come from tool results.

Follow-ups include:
- Clarification questions: "what does that score mean?", "can you explain X?"
- Rephrasing: "in simpler terms", "summarize that"
- Asking about data already retrieved: "which of those genes is most significant?", "tell me more about the top result"
- Simple acknowledgments or requests for formatting: "show as a table", "list the top 5"
- Meta questions: "what tools did you use?", "how many results were there?"

NOT follow-ups (require new data):
- New entity queries: "now look up BRCA2", "what about Alzheimer's?"
- New analysis: "run enrichment on those genes", "find drugs targeting those"
- Switching topics entirely
- Asking for data not yet retrieved: "what are the side effects?" (when only targets were retrieved)

TYPED COHORTS:
Cohorts have different data types: variant_list (default), gwas_sumstats, credible_set, fine_mapping. The agent must call getCohortSchema to discover columns before analysis.
- GWAS cohorts: columns include p_value, beta, se, chromosome, position
- Credible sets: columns include pip, credible_set_id
- Fine mapping: columns include posterior_prob, bayes_factor
- Use queryType "analytics" for statistical analysis requests (regression, PCA, clustering, testing)
- Delegate to variantTriage for complex typed cohort analysis pipelines

ANALYTICS:
The runAnalytics tool supports: regression, PCA, clustering, statistical_test, manhattan_plot, qq_plot.
- For simple analytics (one analysis): { do: "direct", description: "Run PCA on the cohort using runAnalytics" }
- For complex analytics pipelines: { do: "delegate", agent: "variantTriage", task: "Run regression and clustering analysis on the cohort" }

RULES:
- Always start with "resolve" if the query mentions entity names (genes, diseases, drugs, pathways) that need ID resolution.
- Skip "resolve" for cohort queries with a cohort ID — cohorts are not graph entities.
- For single-tool lookups (variant lookup, gene stats, entity context): use { do: "direct", description: "..." }
- For multi-step workflows (full triage, enrichment pipeline): use { do: "delegate", agent: "..." }
- For mixed intent (cohort + graph), delegate to variantTriage first, then bioContext.
- For entity lookup, resolve first, then use direct tools or delegate to bioContext.
- For variant analysis with specific variants (rsIDs, VCF), use direct tools for simple lookups or delegate to variantTriage for complex analysis.
- For comparison queries, resolve entities first, then delegate to bioContext.
- For connection/path queries, resolve both entities first, then delegate to bioContext.
- For drug discovery, resolve the target gene/disease, then delegate to bioContext.
- Always end with "synthesize".
- 1-6 steps total. Use 1 step (just "synthesize") for follow-ups that need no new data.
- CRITICAL: The "task" field in delegate steps must be a GRAPH QUERY INSTRUCTION, not a biology essay.
  GOOD: "Find the top genes associated with Alzheimer's disease and run pathway enrichment on them"
  GOOD: "Get metformin's gene targets and find which overlap with type 2 diabetes risk genes"
  BAD: "Provide an overview of metformin targets (AMPK pathway including PRKAA1/PRKAA2, OCT1/SLC22A1, complex I subunits NDUFS1-8...)"
  BAD: "Analyze BRCA1 role in homologous recombination repair via RAD51, PALB2, BRIP1..."
- NEVER embed specific gene names, pathway names, or biological mechanisms in the task description.
  The specialist must discover these by querying the graph — not from the planner's training data.
- Keep task descriptions under 50 words. Describe WHAT to find, not what you already know.`;

export async function runPlanAgent(
  userMessage: string,
  context?: ConversationContext,
): Promise<AgentPlan> {
  let systemPrompt = PLAN_AGENT_PROMPT;

  // Provide conversation context to the planner
  if (context) {
    if (context.turnCount > 0) {
      systemPrompt += `\n\nCONVERSATION CONTEXT: This is turn ${context.turnCount + 1} of an ongoing conversation. The supervisor already has prior tool results in context. If the user is asking a follow-up about previously retrieved data, output: { queryType: "general", steps: [{ do: "synthesize" }] }`;
    }

    // Append previously resolved entities so the planner can skip redundant resolve steps
    if (Object.keys(context.resolvedEntities).length > 0) {
      const lines = Object.entries(context.resolvedEntities)
        .map(([label, { type, id }]) => `- ${label} → ${type}:${id}`)
        .join("\n");
      systemPrompt += `\n\nPREVIOUSLY RESOLVED ENTITIES (skip "resolve" for these — the supervisor already has their IDs):
${lines}

Only add a "resolve" step for NEW entity names not listed above.
If no new entities need resolving, start directly with "delegate" or "direct".`;
    }
  }

  const { object } = await generateObject({
    model: nanoModel,
    schema: PlanSchema,
    prompt: userMessage,
    system: systemPrompt,
  });
  return object as AgentPlan;
}
