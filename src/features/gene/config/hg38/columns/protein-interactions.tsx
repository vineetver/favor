import type { Gene } from "@features/gene/types";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

const renderInteractions = cell.custom<Gene, string>((str) => {
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
});

export const geneProteinInteractionsColumns = [
  col.accessor("interactions_int_act", {
    accessor: (row) => row.interactions_int_act,
    header: "IntAct Interactions",
    description: tooltip({
      title: "IntAct Interactions",
      description: "IntAct protein interaction data",
    }),
    cell: renderInteractions,
  }),

  col.accessor("interactions_bio_grid", {
    accessor: (row) => row.interactions_bio_grid,
    header: "BioGRID Interactions",
    description: tooltip({
      title: "BioGRID Interactions",
      description: "BioGRID protein interaction data",
    }),
    cell: renderInteractions,
  }),

  col.accessor("interactions_consensus_path_db", {
    accessor: (row) => row.interactions_consensus_path_db,
    header: "ConsensusPathDB Interactions",
    description: tooltip({
      title: "ConsensusPathDB Interactions",
      description: "ConsensusPathDB interaction data",
    }),
    cell: renderInteractions,
  }),
];

export const geneProteinInteractionsGroup = col.group(
  "protein-protein-interactions",
  "Protein-Protein Interactions",
  geneProteinInteractionsColumns
);