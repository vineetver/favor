import { generateObject } from "ai";
import { z } from "zod";
import { nanoModel } from "./models";
import type { AgentPlan } from "../types";

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
    do: z.literal("synthesize"),
  }),
]);

const PlanSchema = z.object({
  queryType: z.enum([
    "entity_lookup", "variant_analysis", "graph_exploration",
    "cohort_analysis", "comparison", "connection", "drug_discovery", "general",
  ]),
  steps: z.array(PlanStepSchema).min(2).max(6),
});

const PLAN_AGENT_PROMPT = `You are a query planner for a statistical genetics agent.
Given a user question, classify its type and produce an execution plan.

AGENTS AVAILABLE:
- variantTriage: cohort analytics, variant annotation, gene burden stats, GWAS associations. Works with cohort IDs, variant lists, gene symbols.
- bioContext: knowledge graph exploration, gene-disease associations, drug targets, pathways, enrichment, entity comparison, path finding.

RULES:
- Always start with "resolve" if the query mentions entity names (genes, diseases, drugs, pathways) that need ID resolution.
- Skip "resolve" for cohort queries with a cohort ID — cohorts are not graph entities.
- For cohort queries, delegate to variantTriage with the cohortId.
- For mixed intent (cohort + graph), delegate to variantTriage first, then bioContext.
- For entity lookup, resolve first, then delegate to bioContext.
- For variant analysis with specific variants (rsIDs, VCF), delegate to variantTriage.
- For comparison queries, resolve entities first, then delegate to bioContext.
- For connection/path queries, resolve both entities first, then delegate to bioContext.
- For drug discovery, resolve the target gene/disease, then delegate to bioContext.
- Always end with "synthesize".
- 2-6 steps total.
- CRITICAL: The "task" field in delegate steps must be a GRAPH QUERY INSTRUCTION, not a biology essay.
  GOOD: "Find the top genes associated with Alzheimer's disease and run pathway enrichment on them"
  GOOD: "Get metformin's gene targets and find which overlap with type 2 diabetes risk genes"
  BAD: "Provide an overview of metformin targets (AMPK pathway including PRKAA1/PRKAA2, OCT1/SLC22A1, complex I subunits NDUFS1-8...)"
  BAD: "Analyze BRCA1 role in homologous recombination repair via RAD51, PALB2, BRIP1..."
- NEVER embed specific gene names, pathway names, or biological mechanisms in the task description.
  The specialist must discover these by querying the graph — not from the planner's training data.
- Keep task descriptions under 50 words. Describe WHAT to find, not what you already know.`;

export async function runPlanAgent(userMessage: string): Promise<AgentPlan> {
  const { object } = await generateObject({
    model: nanoModel,
    schema: PlanSchema,
    prompt: userMessage,
    system: PLAN_AGENT_PROMPT,
  });
  return object as AgentPlan;
}
