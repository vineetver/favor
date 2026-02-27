/**
 * Real LLM stress test for BioContext subagent.
 * Invokes bioContext.execute() with ToolLoopAgent + gpt-5-nano.
 *
 * Usage: npx tsx scripts/stress-test-llm.ts
 */

import { bioContext } from "../src/features/agent/tools/subagents/bio-context";
import type { BioContextOutput, SubagentToolTrace } from "../src/features/agent/types";
import { writeFileSync } from "fs";

// ---------------------------------------------------------------------------
// Test queries
// ---------------------------------------------------------------------------
interface TestQuery {
  id: string;
  task: string;
  resolvedEntityIds: string[];
  expectedTools: string[];
  expectedEdgeTypes: string[];
  description: string;
}

const QUERIES: TestQuery[] = [
  {
    id: "Q1",
    task: "What are the top genes associated with Alzheimer's disease and what pathways are they enriched in?",
    resolvedEntityIds: ["Disease:MONDO_0004975"],
    expectedTools: ["getRankedNeighbors", "runEnrichment"],
    expectedEdgeTypes: ["GENE_ASSOCIATED_WITH_DISEASE", "GENE_PARTICIPATES_IN_PATHWAY"],
    description: "Disease→genes→pathway enrichment",
  },
  {
    id: "Q2",
    task: "Find drugs that could be repurposed for Parkinson's disease through its gene targets",
    resolvedEntityIds: ["Disease:MONDO_0005180"],
    expectedTools: ["getRankedNeighbors", "graphTraverse"],
    expectedEdgeTypes: ["GENE_ASSOCIATED_WITH_DISEASE", "DRUG_ACTS_ON_GENE"],
    description: "Drug repurposing via gene targets",
  },
  {
    id: "Q3",
    task: "Which tissues most highly express the genes associated with breast cancer?",
    resolvedEntityIds: ["Disease:MONDO_0007254"],
    expectedTools: ["getRankedNeighbors", "graphTraverse"],
    expectedEdgeTypes: ["GENE_ASSOCIATED_WITH_DISEASE", "GENE_EXPRESSED_IN_TISSUE"],
    description: "Disease→genes→tissue expression",
  },
  {
    id: "Q4",
    task: "What GO biological processes are enriched among type 2 diabetes genes?",
    resolvedEntityIds: ["Disease:MONDO_0005148"],
    expectedTools: ["getRankedNeighbors", "runEnrichment"],
    expectedEdgeTypes: ["GENE_ASSOCIATED_WITH_DISEASE", "GENE_ANNOTATED_WITH_GO_TERM"],
    description: "Disease→genes→GO enrichment",
  },
  {
    id: "Q5",
    task: "What drugs are indicated for lung cancer and what gene targets do they act on?",
    resolvedEntityIds: ["Disease:MONDO_0008903"],
    expectedTools: ["getRankedNeighbors", "graphTraverse"],
    expectedEdgeTypes: ["DRUG_INDICATED_FOR_DISEASE", "DRUG_ACTS_ON_GENE"],
    description: "Disease→drugs→gene targets",
  },
  {
    id: "Q6",
    task: "What are the known side effects of ibuprofen?",
    resolvedEntityIds: ["Drug:CHEMBL521"],
    expectedTools: ["getRankedNeighbors"],
    expectedEdgeTypes: ["DRUG_HAS_ADVERSE_EFFECT"],
    description: "Drug side effects (single call)",
  },
  {
    id: "Q7",
    task: "What drugs interact with metformin, and do metformin and levofloxacin share any gene targets?",
    resolvedEntityIds: ["Drug:CHEMBL1431", "Drug:CHEMBL5315124"],
    expectedTools: ["getRankedNeighbors", "getSharedNeighbors"],
    expectedEdgeTypes: ["DRUG_INTERACTS_WITH_DRUG", "DRUG_ACTS_ON_GENE"],
    description: "Drug interactions + shared targets",
  },
  {
    id: "Q8",
    task: "What are the pharmacogenomic associations for warfarin? Which genes affect how patients respond to it?",
    resolvedEntityIds: ["Drug:CHEMBL1464"],
    expectedTools: ["getRankedNeighbors"],
    expectedEdgeTypes: ["GENE_AFFECTS_DRUG_RESPONSE"],
    description: "Pharmacogenomics (scoreField override test)",
  },
  {
    id: "Q9",
    task: "What are the top GWAS variants for type 2 diabetes, and which genes do they map to?",
    resolvedEntityIds: ["Disease:MONDO_0005148"],
    expectedTools: ["getRankedNeighbors"],
    expectedEdgeTypes: ["VARIANT_ASSOCIATED_WITH_TRAIT__Disease", "VARIANT_IMPLIES_GENE"],
    description: "GWAS variants→gene mapping",
  },
  {
    id: "Q10",
    task: "What pathogenic variants affect TP53 and are any linked to drug responses?",
    resolvedEntityIds: ["Gene:ENSG00000141510"],
    expectedTools: ["getRankedNeighbors"],
    expectedEdgeTypes: ["VARIANT_AFFECTS_GENE", "VARIANT_ASSOCIATED_WITH_DRUG"],
    description: "Variants→drug responses",
  },
  {
    id: "Q11",
    task: "Which regulatory elements (cCREs) are near APOE and what other genes do they regulate?",
    resolvedEntityIds: ["Gene:ENSG00000130203"],
    expectedTools: ["getRankedNeighbors", "getEntityContext", "getGraphSchema"],
    expectedEdgeTypes: ["CCRE_REGULATES_GENE"],
    description: "Reverse direction + schema discovery",
  },
  {
    id: "Q12",
    task: "Compare EGFR, ERBB2, and ERBB3 — what pathways and diseases do they share?",
    resolvedEntityIds: ["Gene:ENSG00000146648", "Gene:ENSG00000141736", "Gene:ENSG00000065361"],
    expectedTools: ["compareEntities"],
    expectedEdgeTypes: [],
    description: "Multi-entity comparison",
  },
  {
    id: "Q13",
    task: "How is aspirin connected to Alzheimer's disease? Show me the direct and indirect links.",
    resolvedEntityIds: ["Drug:CHEMBL25", "Disease:MONDO_0004975"],
    expectedTools: ["getConnections", "findPaths"],
    expectedEdgeTypes: [],
    description: "Connections + paths workflow",
  },
  {
    id: "Q14",
    task: "What pathways do TP53 and RB1 share? List the overlapping pathways.",
    resolvedEntityIds: ["Gene:ENSG00000141510", "Gene:ENSG00000139687"],
    expectedTools: ["getSharedNeighbors"],
    expectedEdgeTypes: ["GENE_PARTICIPATES_IN_PATHWAY"],
    description: "Shared neighbors (intersection)",
  },
  {
    id: "Q15",
    task: "What metabolites are involved in the insulin signaling pathway?",
    resolvedEntityIds: ["Pathway:WP481"],
    expectedTools: ["getRankedNeighbors"],
    expectedEdgeTypes: ["PATHWAY_CONTAINS_METABOLITE"],
    description: "Rare edge type (Pathway seed)",
  },
  {
    id: "Q16",
    task: "What phenotypes are associated with Huntington's disease, and which genes drive those phenotypes?",
    resolvedEntityIds: ["Disease:MONDO_0007739"],
    expectedTools: ["getRankedNeighbors", "graphTraverse"],
    expectedEdgeTypes: ["DISEASE_HAS_PHENOTYPE", "GENE_ASSOCIATED_WITH_PHENOTYPE"],
    description: "Disease→phenotypes→genes",
  },
  {
    id: "Q17",
    task: "What protein-protein interactions does APOE have, and which of those interacting genes are also associated with Alzheimer's?",
    resolvedEntityIds: ["Gene:ENSG00000130203", "Disease:MONDO_0004975"],
    expectedTools: ["getRankedNeighbors", "getSharedNeighbors"],
    expectedEdgeTypes: ["GENE_INTERACTS_WITH_GENE", "GENE_ASSOCIATED_WITH_DISEASE"],
    description: "PPI + disease cross-reference",
  },
  {
    id: "Q18",
    task: "What genes are associated with cystic fibrosis and what drugs target them?",
    resolvedEntityIds: [],
    expectedTools: ["searchEntities", "getRankedNeighbors"],
    expectedEdgeTypes: ["GENE_ASSOCIATED_WITH_DISEASE", "DRUG_ACTS_ON_GENE"],
    description: "Search required (no resolved IDs)",
  },
];

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------
interface GradeResult {
  id: string;
  grade: "PASS" | "PARTIAL" | "FAIL";
  toolSelection: boolean;
  idParsing: boolean;
  chaining: boolean;
  errorRecovery: string;
  summaryAccuracy: string;
  budgetEfficiency: string;
  toolCalls: number;
  stepsUsed: number;
  toolsUsed: string[];
  toolTrace: SubagentToolTrace[];
  summary: string;
  notes: string;
}

function gradeResult(query: TestQuery, output: BioContextOutput): GradeResult {
  const trace = output.toolTrace ?? [];
  const toolsUsed = output.toolsUsed ?? [];
  const completedTools = trace.filter(t => t.status === "completed");
  const errorTools = trace.filter(t => t.status === "error");

  // Tool selection: did it use at least one expected tool?
  const usedExpected = query.expectedTools.some(t => toolsUsed.includes(t));
  // More lenient: also accept graphTraverse as alternative to getRankedNeighbors chains
  const toolSelection = usedExpected || toolsUsed.includes("graphTraverse") || toolsUsed.includes("getRankedNeighbors");

  // ID parsing: did it NOT call searchEntities when resolvedEntityIds were provided?
  const searchedUnnecessarily = query.resolvedEntityIds.length > 0 && toolsUsed.includes("searchEntities");
  const idParsing = !searchedUnnecessarily;

  // Chaining: did it make more than one successful tool call (for multi-step queries)?
  const needsChaining = query.expectedTools.length > 1;
  const chaining = !needsChaining || completedTools.length >= 2;

  // Error recovery
  let errorRecovery = "N/A";
  if (errorTools.length > 0) {
    const recoveredAfter = trace.findIndex(t => t.status === "error");
    const successAfter = trace.slice(recoveredAfter + 1).some(t => t.status === "completed");
    errorRecovery = successAfter ? "recovered" : "failed";
  }

  // Summary accuracy: check for suspicious patterns
  const summary = output.summary || "";
  const hasSummary = summary.length > 50;
  let summaryAccuracy = hasSummary ? "has summary" : "no summary";
  if (summary.includes("I would") || summary.includes("I can") || summary.includes("Let me")) {
    summaryAccuracy = "meta-talk (should be data)";
  }

  // Budget efficiency
  const calls = output.toolCallsMade ?? 0;
  const budgetEfficiency = calls <= 5 ? "efficient" : calls <= 10 ? "moderate" : `heavy (${calls})`;

  // Overall grade
  let grade: "PASS" | "PARTIAL" | "FAIL";
  if (toolSelection && idParsing && chaining && hasSummary) {
    grade = "PASS";
  } else if (toolSelection || hasSummary) {
    grade = "PARTIAL";
  } else {
    grade = "FAIL";
  }

  const notes = [
    !toolSelection && `wrong tools (used: ${toolsUsed.join(",")})`,
    !idParsing && "searched when IDs were provided",
    !chaining && "incomplete chain",
    !hasSummary && "no summary",
    errorTools.length > 0 && `${errorTools.length} errors`,
  ].filter(Boolean).join("; ") || "all checks passed";

  return {
    id: query.id,
    grade,
    toolSelection,
    idParsing,
    chaining,
    errorRecovery,
    summaryAccuracy,
    budgetEfficiency,
    toolCalls: calls,
    stepsUsed: output.stepsUsed ?? 0,
    toolsUsed,
    toolTrace: trace,
    summary: summary.slice(0, 500),
    notes,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function runQuery(query: TestQuery): Promise<GradeResult> {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`${query.id}: ${query.description}`);
  console.log(`Task: ${query.task.slice(0, 80)}...`);
  console.log(`IDs: ${query.resolvedEntityIds.join(", ") || "(none — must search)"}`);

  const start = Date.now();
  try {
    const result = await bioContext.execute({
      task: query.task,
      resolvedEntityIds: query.resolvedEntityIds,
    }, { toolCallId: query.id, messages: [], abortSignal: AbortSignal.timeout(120_000) } as any);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if ("error" in result && result.error) {
      console.log(`  ❌ Error (${elapsed}s): ${(result as any).message}`);
      return {
        id: query.id, grade: "FAIL",
        toolSelection: false, idParsing: false, chaining: false,
        errorRecovery: "fatal", summaryAccuracy: "N/A", budgetEfficiency: "N/A",
        toolCalls: 0, stepsUsed: 0, toolsUsed: [], toolTrace: [],
        summary: (result as any).message ?? "",
        notes: `Fatal error: ${(result as any).message}`,
      };
    }

    const output = result as BioContextOutput;
    const graded = gradeResult(query, output);

    const emoji = graded.grade === "PASS" ? "✅" : graded.grade === "PARTIAL" ? "⚠️" : "❌";
    console.log(`  ${emoji} ${graded.grade} (${elapsed}s, ${graded.toolCalls} calls, ${graded.stepsUsed} steps)`);
    console.log(`  Tools: ${graded.toolsUsed.join(" → ")}`);

    // Print tool trace
    for (const t of graded.toolTrace) {
      const icon = t.status === "completed" ? "✓" : "✗";
      console.log(`    ${icon} ${t.toolName}(${t.inputSummary}) → ${t.outputSummary ?? t.status}`);
    }

    // Print summary excerpt
    if (graded.summary) {
      console.log(`  Summary: ${graded.summary.slice(0, 200)}...`);
    }
    console.log(`  Notes: ${graded.notes}`);

    return graded;
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ❌ Exception (${elapsed}s): ${msg}`);
    return {
      id: query.id, grade: "FAIL",
      toolSelection: false, idParsing: false, chaining: false,
      errorRecovery: "exception", summaryAccuracy: "N/A", budgetEfficiency: "N/A",
      toolCalls: 0, stepsUsed: 0, toolsUsed: [], toolTrace: [],
      summary: "", notes: `Exception: ${msg.slice(0, 200)}`,
    };
  }
}

async function main() {
  console.log("═".repeat(70));
  console.log("  BioContext Subagent REAL LLM Stress Test");
  console.log("  Model: gpt-5-nano | Budget: 10 steps, 20 tool calls");
  console.log("═".repeat(70));

  // Verify API is up
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/graph/schema`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    console.log("✅ Graph API accessible");
  } catch {
    console.error("❌ Graph API not accessible at localhost:8000");
    process.exit(1);
  }

  const results: GradeResult[] = [];

  for (const query of QUERIES) {
    const result = await runQuery(query);
    results.push(result);
  }

  // Score card
  console.log(`\n\n${"═".repeat(70)}`);
  console.log("  SCORE CARD");
  console.log("═".repeat(70));
  console.log("Query | Grade    | Calls | Steps | Tools Used");
  console.log("─".repeat(70));
  for (const r of results) {
    const emoji = r.grade === "PASS" ? "✅" : r.grade === "PARTIAL" ? "⚠️" : "❌";
    console.log(
      `${r.id.padEnd(5)} | ${emoji} ${r.grade.padEnd(7)} | ${String(r.toolCalls).padEnd(5)} | ${String(r.stepsUsed).padEnd(5)} | ${r.toolsUsed.join(", ")}`
    );
  }
  console.log("─".repeat(70));
  const pass = results.filter(r => r.grade === "PASS").length;
  const partial = results.filter(r => r.grade === "PARTIAL").length;
  const fail = results.filter(r => r.grade === "FAIL").length;
  console.log(`Total: ${pass} PASS, ${partial} PARTIAL, ${fail} FAIL out of ${results.length}`);

  // Failure analysis
  const failures = results.filter(r => r.grade !== "PASS");
  if (failures.length > 0) {
    console.log("\n\nFAILURE/PARTIAL ANALYSIS:");
    for (const f of failures) {
      console.log(`\n  ${f.id}: ${f.grade}`);
      console.log(`    Notes: ${f.notes}`);
      console.log(`    Tools: ${f.toolsUsed.join(" → ") || "none"}`);
      console.log(`    Errors: ${f.toolTrace.filter(t => t.status === "error").map(t => `${t.toolName}: ${t.outputSummary}`).join("; ") || "none"}`);
    }
  }

  // Common patterns
  console.log("\n\nPATTERNS:");
  const searchAbuse = results.filter(r => !r.idParsing);
  if (searchAbuse.length > 0) {
    console.log(`  ⚠️ Search abuse (searched when IDs provided): ${searchAbuse.map(r => r.id).join(", ")}`);
  }
  const heavyCalls = results.filter(r => r.toolCalls > 10);
  if (heavyCalls.length > 0) {
    console.log(`  ⚠️ Heavy tool usage (>10 calls): ${heavyCalls.map(r => `${r.id}(${r.toolCalls})`).join(", ")}`);
  }
  const noChain = results.filter(r => !r.chaining);
  if (noChain.length > 0) {
    console.log(`  ⚠️ Incomplete chaining: ${noChain.map(r => r.id).join(", ")}`);
  }

  // Save full results
  writeFileSync(
    "scripts/stress-test-llm-results.json",
    JSON.stringify(results, null, 2),
  );
  console.log("\n\nFull results saved to scripts/stress-test-llm-results.json");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
