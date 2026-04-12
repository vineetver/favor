import { FunctionDetailView } from "@features/gene/components/function-detail-view";
import { GoTermsView } from "@features/gene/components/go-terms-view";
import { SubcellularLocationsView } from "@features/gene/components/subcellular-locations-view";
import type { Gene } from "@features/gene/types";
import { cell, createColumns, tooltip } from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneFunctionColumns = [
  // Function descriptions with citations
  col.accessor("ot_function_descriptions", {
    accessor: (row) => row.opentargets?.function_descriptions,
    header: "Function Descriptions",
    description: tooltip({
      title: "Function Descriptions",
      description:
        "Detailed function descriptions from OpenTargets (curated from multiple sources).",
    }),
    cell: cell.custom<Gene, string[]>((descriptions) => {
      if (!descriptions || descriptions.length === 0) return null;
      return <FunctionDetailView descriptions={descriptions} />;
    }),
  }),

  // Protein class
  col.accessor("protein_class", {
    accessor: (row) => row.protein_class,
    header: "Protein Class",
    description: tooltip({
      title: "Protein Class",
      description: "Protein classification from the Human Protein Atlas.",
    }),
    cell: cell.custom<Gene, string>((str) => (
      <div className="flex flex-col gap-1">
        {str
          .split(",")
          .filter(Boolean)
          .map((item, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: protein-class tokens may repeat
              key={`${item}-${index}`}
              className="text-sm text-foreground capitalize"
            >
              {item.trim()}
            </span>
          ))}
      </div>
    )),
  }),

  // HPA evidence
  col.accessor("hpa_evidence", {
    accessor: (row) => row.hpa_evidence,
    header: "HPA Evidence",
    description: tooltip({
      title: "Human Protein Atlas Evidence",
      description:
        "Evidence level for protein expression from the Human Protein Atlas.",
    }),
    cell: cell.text(),
  }),

  // Subcellular locations — promoted to top level
  col.accessor("ot_subcellular_locations", {
    accessor: (row) => row.opentargets?.subcellular_locations,
    header: "Subcellular Locations",
    description: tooltip({
      title: "Subcellular Locations",
      description:
        "Cellular compartments where the protein is found (from UniProt via OpenTargets).",
    }),
    cell: cell.custom<Gene, Array<Record<string, string>>>((locations) => (
      <SubcellularLocationsView locations={locations} />
    )),
  }),

  // GO terms — promoted to top level with grouped collapsible view
  col.accessor("go_terms", {
    accessor: (row) => row.go,
    header: "Gene Ontology (GO)",
    description: tooltip({
      title: "Gene Ontology Annotations",
      description:
        "GO term annotations grouped by Biological Process, Molecular Function, and Cellular Component.",
    }),
    cell: cell.custom<
      Gene,
      {
        biological_process?: string;
        molecular_function?: string;
        cellular_component?: string;
      }
    >((go, row) => <GoTermsView go={go} goDetailed={row.opentargets?.go} />),
  }),
];

export const geneFunctionGroup = col.group(
  "function",
  "Function",
  geneFunctionColumns,
);
