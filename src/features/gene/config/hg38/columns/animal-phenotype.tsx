import type { Gene } from "@features/gene/types";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneAnimalPhenotypeColumns = [
  // OpenTargets homologues data (prioritized)
  col.accessor("ot_homologues", {
    accessor: (row) => row.opentargets?.homologues,
    header: "Model Organism Homologues (OT)",
    description: tooltip({
      title: "Model Organism Homologues",
      description: "Homologous genes in model organisms from OpenTargets with sequence identity and confidence scores.",
    }),
    cell: cell.custom<Gene, any>((homologues: Array<{
      speciesId: string;
      speciesName: string;
      homologyType: string;
      targetGeneId: string;
      isHighConfidence: string;
      targetGeneSymbol: string;
      queryPercentageIdentity: number;
      targetPercentageIdentity: number;
      priority: number;
    }>) => {
      if (!homologues || homologues.length === 0) return null;

      // Group by species
      const grouped = homologues.reduce((acc, homologue) => {
        const species = homologue.speciesName || "Unknown";
        if (!acc[species]) acc[species] = [];
        acc[species].push(homologue);
        return acc;
      }, {} as Record<string, typeof homologues>);

      return (
        <div>
          {Object.entries(grouped).map(([species, homologueList]) => (
            <div key={species}>
              <div>{species}</div>
              <ul>
                {homologueList.map((homologue, index) => (
                  <li key={index}>
                    <div>
                      {homologue.targetGeneSymbol}
                      {homologue.isHighConfidence === "1" && " (High Confidence)"}
                    </div>
                    <div>{homologue.targetGeneId}</div>
                    <div>Type: {homologue.homologyType.replace(/_/g, " ")}</div>
                    <div>
                      Query Identity: {homologue.queryPercentageIdentity?.toFixed(1)}% |
                      Target Identity: {homologue.targetPercentageIdentity?.toFixed(1)}%
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    }),
  }),

  // Original model organism fields (kept for completeness)
  col.accessor("mgi_mouse_gene", {
    accessor: (row) => row.model_organisms?.mouse?.gene,
    header: "MGI Mouse Gene",
    description: tooltip({
      title: "MGI Mouse Gene",
      description: "Homolog mouse gene name from MGI",
    }),
    cell: cell.text(),
  }),

  col.accessor("mgd_id", {
    accessor: (row) => row.mgd_id,
    header: "MGI ID",
    description: tooltip({
      title: "MGI ID",
      description: "MGD (Mouse Genome Database) ID",
    }),
    cell: cell.link((val) => `https://www.informatics.jax.org/marker/${val}`),
  }),

  col.accessor("mgi_mouse_phenotype", {
    accessor: (row) => row.model_organisms?.mouse?.phenotype,
    header: "MGI Mouse Phenotype",
    description: tooltip({
      title: "MGI Mouse Phenotype",
      description: "Phenotype description for the homolog mouse gene from MGI",
    }),
    cell: cell.custom<Gene, any>((str: any) => {
      if (!str || typeof str !== "string") return null;
      const uniqueItems = Array.from(new Set(str.split(";"))).filter(
        (item) => item !== "" && item.includes("("),
      );

      return (
        <ul className="flex flex-col gap-1">
          {uniqueItems.map((item, index) => (
            <li className="capitalize" key={index}>
              {item}
            </li>
          ))}
        </ul>
      );
    }),
  }),

  col.accessor("rgd_id", {
    accessor: (row) => row.rgd_id,
    header: "RGD ID",
    description: tooltip({
      title: "RGD ID",
      description: "RGD (Rat Genome Database) ID",
    }),
    cell: cell.link((val) => `https://rgd.mcw.edu/rgdweb/report/gene/main.html?id=${val}`),
  }),

  col.accessor("zfin_zebrafish_gene", {
    accessor: (row) => row.model_organisms?.zebrafish?.gene,
    header: "ZFIN Zebrafish Gene",
    description: tooltip({
      title: "ZFIN Zebrafish Gene",
      description: "Homolog zebrafish gene name from ZFIN",
    }),
    cell: cell.custom<Gene, any>((value: any) => {
      if (!value) return null;
      return (
        <a
          href={`https://zfin.org/search?q=${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          <span className="capitalize">{value}</span>
        </a>
      );
    }),
  }),

  col.accessor("zfin_zebrafish_structure", {
    accessor: (row) => row.model_organisms?.zebrafish?.structure,
    header: "ZFIN Zebrafish Structure",
    description: tooltip({
      title: "ZFIN Zebrafish Structure",
      description: "Affected structure of the homolog zebrafish gene from ZFIN",
    }),
    cell: cell.custom<Gene, any>((str: any) => (
      <span className="capitalize">{str}</span>
    )),
  }),

  col.accessor("zfin_zebrafish_phenotype_quality", {
    accessor: (row) => row.model_organisms?.zebrafish?.phenotype_quality,
    header: "ZFIN Zebrafish Phenotype Quality",
    description: tooltip({
      title: "ZFIN Zebrafish Phenotype Quality",
      description: "Phenotype description for the homolog zebrafish gene from ZFIN",
    }),
    cell: cell.custom<Gene, any>((str: any) => (
      <span className="capitalize">{str}</span>
    )),
  }),

  col.accessor("zfin_zebrafish_phenotype_tag", {
    accessor: (row) => row.model_organisms?.zebrafish?.phenotype_tag,
    header: "ZFIN Zebrafish Phenotype Tag",
    description: tooltip({
      title: "ZFIN Zebrafish Phenotype Tag",
      description: "Phenotype tag for the homolog zebrafish gene from ZFIN",
    }),
    cell: cell.custom<Gene, any>((str: any) => (
      <span className="capitalize">{str}</span>
    )),
  }),
];

export const geneAnimalPhenotypeGroup = col.group("animal-phenotype", "Animal Phenotypes", geneAnimalPhenotypeColumns);