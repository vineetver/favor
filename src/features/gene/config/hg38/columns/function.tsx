import type { Gene } from "@features/gene/types";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneFunctionColumns = [
  col.accessor("function_description", {
    accessor: "function_description",
    header: "Function Description",
    description: tooltip({
      title: "Function Description",
      description: "Function description of the gene (from Uniprot).",
    }),
    cell: cell.custom<Gene, any>((str: string) => {
      const ecoRegex = /ECO:(\d+)/g;
      const pubmedRegex = /PubMed:(\d+)/g;

      const ecoIds: string[] = [];
      const pubmedIds: string[] = [];

      let match;
      while ((match = ecoRegex.exec(str)) !== null) {
        ecoIds.push(match[1]);
      }
      while ((match = pubmedRegex.exec(str)) !== null) {
        pubmedIds.push(match[1]);
      }

      const description = str
        .replace(/\s*\{ECO:[^}]+}\./g, "")
        .replace(/\s*\{PubMed:[^}]+}\./g, "")
        .trim();

      return (
        <div className="normal-case">
          <div>{description}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
            {ecoIds.length > 0 && (
              <ul className="flex flex-col gap-1">
                {ecoIds.map((item, index) => (
                  <li key={`eco-${index}`}>
                    <a
                      href={`https://www.ebi.ac.uk/QuickGO/term/ECO:${item}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      ECO:{item}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {pubmedIds.length > 0 && (
              <ul className="flex flex-col gap-1">
                {pubmedIds.map((item, index) => (
                  <li key={`pubmed-${index}`}>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${item}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      PubMed:{item}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
      <ul className="flex flex-col gap-1">
        {val
          .split(";")
          .filter(Boolean)
          .map((item, index) => (
            <li className="capitalize" key={index}>
              <a
                href={`https://www.genome.jp/pathway/${item}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {item}
              </a>
            </li>
          ))}
      </ul>
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
      <ul className="flex flex-col gap-1">
        {str
          .split(";")
          .filter(Boolean)
          .map((item, index) => (
            <li className="capitalize" key={index}>
              {item}
            </li>
          ))}
      </ul>
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
      <ul className="flex flex-col gap-1">
        {str
          .split(";")
          .filter(Boolean)
          .map((item, index) => (
            <li className="capitalize" key={index}>
              {item}
            </li>
          ))}
      </ul>
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
      <ul className="flex flex-col gap-1">
        {str
          .split(",")
          .filter(Boolean)
          .map((item, index) => (
            <li className="capitalize" key={index}>
              {item}
            </li>
          ))}
      </ul>
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

  col.accessor("subcellular_location", {
    accessor: (row) => row.protein?.subcellular_location,
    header: "Subcellular Location",
    description: tooltip({
      title: "Subcellular Location",
      description: "Subcellular Location",
    }),
    cell: cell.text(),
  }),

  col.accessor("secretome_location", {
    accessor: (row) => row.protein?.secretome_location,
    header: "Secretome Location",
    description: tooltip({
      title: "Secretome Location",
      description: "Secretome Location",
    }),
    cell: cell.custom<Gene, any>((str: string) => (
      <ul className="flex flex-col gap-1">
        {str
          .split(",")
          .filter(Boolean)
          .map((item, index) => (
            <li className="capitalize" key={index}>
              {item}
            </li>
          ))}
      </ul>
    )),
  }),
];

export const geneFunctionGroup = col.group("function", "Function", geneFunctionColumns);