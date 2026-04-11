import { HomologuesTable } from "@features/gene/components/homologues-table";
import { MousePhenotypeList } from "@features/gene/components/mouse-phenotype-list";
import type { Gene } from "@features/gene/types";
import { cell, createColumns, tooltip } from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneAnimalPhenotypeColumns = [
  // Homologues — compact table
  col.accessor("ot_homologues", {
    accessor: (row) => row.opentargets?.homologues,
    header: "Model Organism Homologues",
    description: tooltip({
      title: "Model Organism Homologues",
      description:
        "Orthologous genes in model organisms from Ensembl Compara via OpenTargets.",
    }),
    cell: cell.custom<Gene, any>(
      (
        homologues: Array<{
          speciesId: string;
          speciesName: string;
          homologyType: string;
          targetGeneId: string;
          isHighConfidence: string;
          targetGeneSymbol: string;
          queryPercentageIdentity: number;
          targetPercentageIdentity: number;
          priority: number;
        }>,
      ) => <HomologuesTable homologues={homologues} />,
    ),
  }),

  // Mouse gene + phenotypes
  col.accessor("mgi_mouse_gene", {
    accessor: (row) => row.model_organisms?.mouse?.gene,
    header: "MGI Mouse Gene",
    description: tooltip({
      title: "MGI Mouse Gene",
      description:
        "Homolog mouse gene name from the Mouse Genome Informatics database.",
    }),
    cell: cell.text(),
  }),

  col.accessor("mgd_id", {
    accessor: (row) => row.mgd_id,
    header: "MGI ID",
    description: tooltip({
      title: "MGI ID",
      description: "Mouse Genome Database identifier.",
    }),
    cell: cell.link((val) => `https://www.informatics.jax.org/marker/${val}`),
  }),

  col.accessor("mgi_mouse_phenotype", {
    accessor: (row) => row.model_organisms?.mouse?.phenotype,
    header: "Mouse Phenotypes",
    description: tooltip({
      title: "Mouse Phenotypes",
      description:
        "Phenotypes observed in mouse models with mutations in the orthologous gene (from MGI).",
    }),
    cell: cell.custom<Gene, any>((str: string) => (
      <MousePhenotypeList phenotypeString={str} />
    )),
  }),

  // Rat
  col.accessor("rgd_id", {
    accessor: (row) => row.rgd_id,
    header: "RGD ID",
    description: tooltip({
      title: "RGD ID",
      description: "Rat Genome Database identifier.",
    }),
    cell: cell.link(
      (val) => `https://rgd.mcw.edu/rgdweb/report/gene/main.html?id=${val}`,
    ),
  }),

  // Zebrafish
  col.accessor("zfin_zebrafish_gene", {
    accessor: (row) => row.model_organisms?.zebrafish?.gene,
    header: "ZFIN Zebrafish Gene",
    description: tooltip({
      title: "ZFIN Zebrafish Gene",
      description:
        "Homolog zebrafish gene from the Zebrafish Information Network.",
    }),
    cell: cell.link((val) => `https://zfin.org/search?q=${val}`),
  }),

  col.accessor("zfin_zebrafish_structure", {
    accessor: (row) => row.model_organisms?.zebrafish?.structure,
    header: "ZFIN Zebrafish Structure",
    description: tooltip({
      title: "ZFIN Zebrafish Structure",
      description: "Affected anatomical structure in the zebrafish model.",
    }),
    cell: cell.text(),
  }),

  col.accessor("zfin_zebrafish_phenotype_quality", {
    accessor: (row) => row.model_organisms?.zebrafish?.phenotype_quality,
    header: "ZFIN Phenotype Quality",
    description: tooltip({
      title: "ZFIN Zebrafish Phenotype Quality",
      description: "Phenotype quality annotation from ZFIN.",
    }),
    cell: cell.text(),
  }),

  col.accessor("zfin_zebrafish_phenotype_tag", {
    accessor: (row) => row.model_organisms?.zebrafish?.phenotype_tag,
    header: "ZFIN Phenotype Tag",
    description: tooltip({
      title: "ZFIN Zebrafish Phenotype Tag",
      description: "Phenotype tag classification from ZFIN.",
    }),
    cell: cell.text(),
  }),
];

export const geneAnimalPhenotypeGroup = col.group(
  "animal-phenotype",
  "Animal Phenotypes",
  geneAnimalPhenotypeColumns,
);
