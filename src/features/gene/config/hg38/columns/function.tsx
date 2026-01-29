import type { Gene } from "@features/gene/types";
import { ExternalLink } from "@shared/components/ui/external-link";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";
import { FunctionDetailView } from "@features/gene/components/function-detail-view";

const col = createColumns<Gene>();

export const geneFunctionColumns = [
  // OpenTargets data (prioritized)
  col.accessor("ot_function_descriptions", {
    accessor: (row) => row.opentargets?.function_descriptions,
    header: "Function Descriptions",
    description: tooltip({
      title: "Function Descriptions",
      description: "Detailed function descriptions from OpenTargets (curated from multiple sources).",
    }),
    cell: cell.custom<Gene, any>((descriptions: string[], row: Gene) => {
      if (!descriptions || descriptions.length === 0) return null;
      const locations = row.opentargets?.subcellular_locations;
      const goTerms = row.opentargets?.go;
      return (
        <FunctionDetailView
          descriptions={descriptions}
          sources={locations}
          goTerms={goTerms}
        />
      );
    }),
  }),

  col.accessor("pathway_uniprot", {
    accessor: (row) => row.pathways?.uniprot,
    header: "Pathway Uniprot",
    description: tooltip({
      title: "Pathway Uniprot",
      description: "Pathway description from Uniprot.",
    }),
    cell: cell.text(),
  }),

  col.accessor("pathway_bio_carta_full", {
    accessor: (row) => row.pathways?.biocarta_full,
    header: "BioCarta",
    description: tooltip({
      title: "BioCarta",
      description: "Full name(s) of the Pathway(s) the gene belongs to (from BioCarta).",
    }),
    cell: cell.text(),
  }),

  col.accessor("pathway_kegg_id", {
    accessor: (row) => row.pathways?.kegg_id,
    header: "Pathway KEGG ID",
    description: tooltip({
      title: "Pathway KEGG ID",
      description: "ID(s) of the Pathway(s) the gene belongs to (from KEGG).",
    }),
    cell: cell.custom<Gene, any>((val: string) => (
      <div className="flex flex-col gap-1">
        {val
          .split(";")
          .filter(Boolean)
          .map((item, index) => (
            <ExternalLink
              key={index}
              href={`https://www.genome.jp/pathway/${item.trim()}`}
              className="text-sm text-primary hover:underline"
              iconSize="sm"
            >
              {item.trim()}
            </ExternalLink>
          ))}
      </div>
    )),
  }),

  col.accessor("pathway_kegg_full", {
    accessor: (row) => row.pathways?.kegg_full,
    header: "Pathway KEGG Full",
    description: tooltip({
      title: "Pathway KEGG Full",
      description: "Full name(s) of the Pathway(s) the gene belongs to (from KEGG).",
    }),
    cell: cell.custom<Gene, any>((str: string) => (
      <div className="flex flex-col gap-1">
        {str
          .split(";")
          .filter(Boolean)
          .map((item, index) => (
            <span key={index} className="text-sm text-slate-700 capitalize">
              {item.trim()}
            </span>
          ))}
      </div>
    )),
  }),

  col.accessor("pathway_consensus_path_db", {
    accessor: (row) => row.pathways?.consensus_path_db,
    header: "ConsensusPathDB",
    description: tooltip({
      title: "ConsensusPathDB",
      description: "Pathway(s) the gene belongs to (from ConsensusPathDB).",
    }),
    cell: cell.custom<Gene, any>((str: string) => (
      <div className="flex flex-col gap-1">
        {str
          .split(";")
          .filter(Boolean)
          .map((item, index) => (
            <span key={index} className="text-sm text-slate-700 capitalize">
              {item.trim()}
            </span>
          ))}
      </div>
    )),
  }),

  col.accessor("protein_class", {
    accessor: (row) => row.protein_class,
    header: "Protein Class",
    description: tooltip({
      title: "Protein Class",
      description: "Protein Class.",
    }),
    cell: cell.custom<Gene, any>((str: string) => (
      <div className="flex flex-col gap-1">
        {str
          .split(",")
          .filter(Boolean)
          .map((item, index) => (
            <span key={index} className="text-sm text-slate-700 capitalize">
              {item.trim()}
            </span>
          ))}
      </div>
    )),
  }),

  col.accessor("hpa_evidence", {
    accessor: (row) => row.hpa_evidence,
    header: "HPA Evidence",
    description: tooltip({
      title: "HPA Evidence",
      description: "HPA evidence",
    }),
    cell: cell.text(),
  }),

];

export const geneFunctionGroup = col.group("function", "Function", geneFunctionColumns);