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
    cohortId: z.string().optional().describe("Cohort ID if applicable"),
    geneSymbol: z.string().optional().describe("Gene symbol if applicable"),
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
- The "task" field in delegate steps should be a clear, specific instruction for the specialist.`;

export async function runPlanAgent(userMessage: string): Promise<AgentPlan> {
  const { object } = await generateObject({
    model: nanoModel,
    schema: PlanSchema,
    prompt: userMessage,
    system: PLAN_AGENT_PROMPT,
  });
  return object as AgentPlan;
}
