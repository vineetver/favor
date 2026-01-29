import type { Gene } from "@features/gene/types";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const genePathwaysColumns = [
  col.accessor("pathway_kegg_full", {
    accessor: (row) => row.pathways?.kegg_full,
    header: "KEGG Pathways",
    description: tooltip({
      title: "KEGG Pathways",
      description: "KEGG pathway annotations",
    }),
    cell: cell.custom<Gene, string>((str) => {
      const items = str.split(/[;|]/).filter(Boolean);
      if (items.length === 0) return "—";
      return (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li className="normal-case" key={index}>
              {item.trim()}
            </li>
          ))}
        </ul>
      );
    }),
  }),

  col.accessor("pathway_bio_carta_full", {
    accessor: (row) => row.pathways?.biocarta_full,
    header: "BioCarta Pathways",
    description: tooltip({
      title: "BioCarta Pathways",
      description: "BioCarta pathway annotations",
    }),
    cell: cell.custom<Gene, string>((str) => {
      const items = str.split(/[;|]/).filter(Boolean);
      if (items.length === 0) return "—";
      return (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li className="normal-case" key={index}>
              {item.trim()}
            </li>
          ))}
        </ul>
      );
    }),
  }),

  col.accessor("pathway_uniprot", {
    accessor: (row) => row.pathways?.uniprot,
    header: "UniProt Pathways",
    description: tooltip({
      title: "UniProt Pathways",
      description: "UniProt pathway annotations",
    }),
    cell: cell.custom<Gene, string>((str) => {
      const items = str.split(/[;|]/).filter(Boolean);
      if (items.length === 0) return "—";
      return (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li className="normal-case" key={index}>
              {item.trim()}
            </li>
          ))}
        </ul>
      );
    }),
  }),

  col.accessor("pathway_consensus_path_db", {
    accessor: (row) => row.pathways?.consensus_path_db,
    header: "ConsensusPathDB",
    description: tooltip({
      title: "ConsensusPathDB",
      description: "ConsensusPathDB pathway annotations",
    }),
    cell: cell.custom<Gene, string>((str) => {
      const items = str.split(/[;|]/).filter(Boolean);
      if (items.length === 0) return "—";
      return (
        <ul className="flex flex-col gap-1">
          {items.map((item, index) => (
            <li className="normal-case" key={index}>
              {item.trim()}
            </li>
          ))}
        </ul>
      );
    }),
  }),
];

export const genePathwaysGroup = col.group("pathways", "Pathways", genePathwaysColumns);