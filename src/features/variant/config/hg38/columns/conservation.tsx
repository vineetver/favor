import type { Variant } from "@/features/variant/types";
import { cell, createColumns, tooltip } from "@/infrastructure/table/column-builder";
import { apcColumns } from "./shared";

const col = createColumns<Variant>();

export const conservationColumns = [
  apcColumns.conservation,

  col.accessor("mamphcons", {
    accessor: (row) => row.main?.conservation?.mamphcons,
    header: "mamPhCons",
    description: tooltip({
      title: "Mammalian phastCons",
      description:
        "Conservation score across mammalian species (excl. human). Uses statistical models considering phylogeny and nucleotide substitution rates.",
      range: "[0, 1]",
      defaultValue: "0.0",
      citation: "Siepel et al., 2005",
      guides: [
        {
          threshold: "Higher scores (>0.8)",
          meaning: "More evolutionarily conserved",
        },
        { threshold: "Lower scores", meaning: "Less evolutionarily conserved" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("priphcons", {
    accessor: (row) => row.main?.conservation?.priphcons,
    header: "priPhCons",
    description: tooltip({
      title: "Primate phastCons",
      description:
        "Conservation score comparing primate species (excluding humans).",
      range: "[-10.761, 0.595]",
      defaultValue: "-0.029",
      citation: "Pollard et al., 2010",
      guides: [
        {
          threshold: "Higher positive scores (>0.3)",
          meaning: "More evolutionarily conserved",
        },
        {
          threshold: "Negative scores",
          meaning: "Faster evolution than expected",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("verphcons", {
    accessor: (row) => row.main?.conservation?.verphcons,
    header: "verPhCons",
    description: tooltip({
      title: "Vertebrate phastCons",
      description:
        "Conservation score comparing vertebrate species (excluding humans).",
      range: "[-20, 11.295]",
      defaultValue: "0.042",
      citation: "Pollard et al., 2010",
      guides: [
        {
          threshold: "Higher positive scores (>2)",
          meaning: "More evolutionarily conserved",
        },
        {
          threshold: "Negative scores",
          meaning: "Faster evolution than expected",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("priphylop", {
    accessor: (row) => row.main?.conservation?.priphylop,
    header: "priPhyloP",
    description: tooltip({
      title: "Primate phyloP",
      description:
        "Site-by-site conservation score comparing primate species (excluding humans). Measures evolutionary constraint at individual positions.",
      range: "[-10.761, 0.595]",
      defaultValue: "-0.029",
      citation: "Pollard et al., 2010",
      guides: [
        {
          threshold: "Higher positive scores (>0.3)",
          meaning: "More evolutionarily conserved",
        },
        {
          threshold: "Negative scores",
          meaning: "Faster evolution than expected",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("mamphylop", {
    accessor: (row) => row.main?.conservation?.mamphylop,
    header: "mamPhyloP",
    description: tooltip({
      title: "Mammalian phyloP",
      description:
        "Site-by-site conservation score comparing mammalian species (excluding humans). Measures evolutionary constraint at individual positions.",
      range: "[-20, 4.494]",
      defaultValue: "-0.005",
      citation: "Pollard et al., 2010",
      guides: [
        {
          threshold: "Higher positive scores (>3)",
          meaning: "More evolutionarily conserved",
        },
        {
          threshold: "Negative scores",
          meaning: "Faster evolution than expected",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("verphylop", {
    accessor: (row) => row.main?.conservation?.verphylop,
    header: "verPhyloP",
    description: tooltip({
      title: "Vertebrate phyloP",
      description:
        "Site-by-site conservation score comparing vertebrate species (excluding humans). Measures evolutionary constraint at individual positions.",
      range: "[-20, 11.295]",
      defaultValue: "0.042",
      citation: "Pollard et al., 2010",
      guides: [
        {
          threshold: "Higher positive scores (>8)",
          meaning: "More evolutionarily conserved",
        },
        {
          threshold: "Negative scores",
          meaning: "Faster evolution than expected",
        },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("gerp_n", {
    accessor: (row) => row.main?.gerp?.n,
    header: "GerpN",
    description: tooltip({
      title: "GERP++ Neutral",
      description:
        "Neutral evolution score defined by GERP++. Higher scores indicate more conservation.",
      range: "[0, 19.8]",
      defaultValue: "3.0",
      citation: "Davydov et al., 2010",
      guides: [
        {
          threshold: "Higher scores (>10)",
          meaning: "More evolutionarily conserved",
        },
        { threshold: "Lower scores", meaning: "Less evolutionarily conserved" },
      ],
    }),
    cell: cell.decimal(3),
  }),

  col.accessor("gerp_s", {
    accessor: (row) => row.main?.gerp?.s,
    header: "GerpS",
    description: tooltip({
      title: "GERP++ Rejected Substitution",
      description:
        "Rejected Substitution score. Positive scores indicate evolutionary constraint; negative may indicate accelerated evolution.",
      range: "[-39.5, 19.8]",
      defaultValue: "-0.2",
      citation: "Davydov et al., 2010",
      guides: [
        {
          threshold: "Higher positive scores (>10)",
          meaning: "More evolutionarily conserved",
        },
        { threshold: "Negative scores", meaning: "Accelerated evolution" },
      ],
    }),
    cell: cell.decimal(3),
  }),
];

export const conservationGroup = col.group(
  "conservation",
  "Conservation",
  conservationColumns,
);
