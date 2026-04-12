import type { Gene } from "@features/gene/types";
import { cell, createColumns, tooltip } from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneHumanPhenotypeColumns = [
  col.accessor("mim_disease", {
    accessor: (row) => row.disease_phenotype?.mim_disease,
    header: "MIM Disease",
    description: tooltip({
      title: "MIM Disease",
      description: "MIM Disease",
    }),
    cell: cell.custom<Gene, string>((value) => (
      <ul className="flex flex-col gap-1">
        {value.split(";").map((item) => {
          const clean = item.replace(/\[.*?\]/g, "");
          return (
            <li className="capitalize" key={item}>
              {clean}
            </li>
          );
        })}
      </ul>
    )),
  }),

  col.accessor("mim_phenotype_id", {
    accessor: (row) => row.disease_phenotype?.mim_phenotype_id,
    header: "MIM Phenotype ID",
    description: tooltip({
      title: "MIM Phenotype ID",
      description: "MIM Phenotype ID",
    }),
    cell: cell.custom<Gene, string>((value) => {
      const pattern = /\[MIM:(\d+)\]/g;
      const matches = Array.from(value.matchAll(pattern));
      const mimIds = matches.map((match) => match[1]);

      if (mimIds.length === 0) return "—";

      return (
        <ul className="flex flex-col gap-1">
          {mimIds.map((item) => (
            <li className="capitalize" key={item}>
              <a
                href={`https://www.omim.org/entry/${item}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      );
    }),
  }),

  col.accessor("inheritance", {
    accessor: (row) =>
      row.inheritance || row.disease_phenotype?.allelic_requirement,
    header: "Inheritance",
    description: tooltip({
      title: "Inheritance",
      description: "Inheritance",
    }),
    cell: cell.custom<Gene, string>((value) => (
      <span className="capitalize">{value}</span>
    )),
  }),

  col.accessor("pheno_key", {
    accessor: (row) => row.pheno_key,
    header: "Pheno Key",
    description: tooltip({
      title: "Pheno Key",
      description: "Pheno Key",
    }),
    cell: cell.custom<Gene, string>((value) => {
      const phenoKey: Record<string, string> = {
        "1": "The disorder has been placed on the map based on its association with a gene, but the underlying defect is not known.",
        "2": "The disorder has been placed on the map by linkage; no mutation has been found.",
        "3": "The molecular basis for the disorder is known, a mutation has been found in the gene.",
        "4": "A contiguous gene deletion or duplication syndrome; multiple genes are deleted or duplicated causing the phenotype.",
      };

      return (
        <ul className="flex flex-col gap-1">
          {value
            .split(";")
            .filter(Boolean)
            .map((item, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: pheno_key items are positional codes and may repeat
              <li className="py-1" key={`${item}-${index}`}>
                {phenoKey[item] ?? item}
              </li>
            ))}
        </ul>
      );
    }),
  }),

  col.accessor("pheno", {
    accessor: (row) => row.pheno,
    header: "Phenotypes",
    description: tooltip({
      title: "Pheno",
      description: "Pheno",
    }),
    cell: cell.text(),
  }),

  col.accessor("orphanet_disorder", {
    accessor: (row) => row.disease_phenotype?.orphanet_disorder,
    header: "Orphanet Disorder",
    description: tooltip({
      title: "Orphanet Disorder",
      description: "Disorder name from Orphanet",
    }),
    cell: cell.custom<Gene, string>((str) => (
      <ul className="flex flex-col gap-1">
        {str
          .split(";")
          .filter(Boolean)
          .map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: orphanet items may repeat
            <li className="capitalize" key={`${item}-${index}`}>
              {item}
            </li>
          ))}
      </ul>
    )),
  }),
];

export const geneHumanPhenotypeGroup = col.group(
  "human-phenotype",
  "Human Phenotypes",
  geneHumanPhenotypeColumns,
);
