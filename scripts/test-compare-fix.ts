/**
 * Quick test: verify explore compare respects `into` filter.
 * Run: npx tsx scripts/test-compare-fix.ts
 */
import { handleExploreCompare } from "../src/features/agent/tools/run/handlers/graph-explore-compare";

async function main() {
  console.log("--- Test 1: compare with into=[\"pathways\"] ---");
  const filtered = await handleExploreCompare({
    command: "explore",
    seeds: [
      { type: "Gene", id: "ENSG00000198836" },  // OPA1
      { type: "Gene", id: "ENSG00000188906" },  // LRRK2
    ],
    into: ["pathways"],
  } as any);

  console.log("Status:", filtered.status);
  console.log("Relationship:", (filtered.data as any)?.relationship);
  const filteredComps = (filtered.data as any)?.comparisons;
  if (filteredComps) {
    const edgeTypes = Object.keys(filteredComps);
    console.log("Edge types:", edgeTypes);
    if (edgeTypes.length === 1 && edgeTypes[0] === "GENE_PARTICIPATES_IN_PATHWAY") {
      console.log("✅ PASS: Only pathway edges returned\n");
    } else {
      console.log("❌ FAIL: Expected only GENE_PARTICIPATES_IN_PATHWAY, got", edgeTypes, "\n");
    }
  }

  console.log("relationship (first 80):", (filtered.data as any)?.relationship?.substring(0, 80));
  console.log("edgeDescription (first 80):", (filtered.data as any)?.edgeDescription?.substring(0, 80));
  for (const t of filtered.trace ?? []) {
    console.log("  trace:", (t as any).message?.substring(0, 120));
  }

  console.log("\n--- Test 2: compare with into=[\"diseases\"] ---");
  const diseasesResult = await handleExploreCompare({
    command: "explore",
    seeds: [
      { type: "Gene", id: "ENSG00000198836" },
      { type: "Gene", id: "ENSG00000188906" },
    ],
    into: ["diseases"],
  } as any);

  const diseaseComps = (diseasesResult.data as any)?.comparisons;
  if (diseaseComps) {
    const edgeTypes = Object.keys(diseaseComps);
    console.log("Edge types:", edgeTypes);
    const allDiseaseEdges = edgeTypes.every(et =>
      et.includes("DISEASE") || et.includes("ALTERED")
    );
    if (allDiseaseEdges) {
      console.log("✅ PASS: Only disease-related edges returned\n");
    } else {
      console.log("❌ FAIL: Non-disease edges found:", edgeTypes, "\n");
    }
  }

  console.log("\n--- Test 3: compare WITHOUT into (should return all) ---");
  const unfiltered = await handleExploreCompare({
    command: "explore",
    seeds: [
      { type: "Gene", id: "ENSG00000198836" },
      { type: "Gene", id: "ENSG00000188906" },
    ],
  } as any);

  const unfilteredComps = (unfiltered.data as any)?.comparisons;
  if (unfilteredComps) {
    const edgeTypes = Object.keys(unfilteredComps);
    console.log("Edge types:", edgeTypes.length, "total");
    if (edgeTypes.length > 5) {
      console.log("✅ PASS: Unfiltered returns many edge types\n");
    } else {
      console.log("❌ FAIL: Expected >5 edge types, got", edgeTypes.length, "\n");
    }
  }
}

main().catch(console.error);
