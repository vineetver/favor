import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";

const helper = createColumnHelper<Variant>();

export const conservationConfig = helper.group("conservation", "Conservation", [
  helper.accessor("apc_conservation_v2", {
    header: "aPC-Conservation",
    description:
      'Conservation annotation PC: the first PC of the standardized scores of "GerpN, GerpS, priPhCons, mamPhCons, verPhCons, priPhyloP, mamPhyloP, verPhyloP" in PHRED scale. Range: [0, 75.824]. (Li et al., 2020)',
  }),
  helper.accessor("mamphcons", {
    header: "mamPhCons",
    description:
      "Mammalian phastCons conservation score (excl. human). A higher score means the region is more conserved. Range: [0, 1] (default: 0.0). (Siepel et al., 2005)",
  }),
  helper.accessor("priphcons", {
    header: "priPhCons",
    description:
      "Primate phastCons: Conservation score comparing primate species (excluding humans). Range: [-10.761, 0.595] (default: -0.029). (Pollard et al., 2010)",
  }),
  helper.accessor("verphcons", {
    header: "verPhCons",
    description:
      "Vertebrate phastCons: Conservation score comparing vertebrate species (excluding humans). Range: [-20, 11.295] (default: 0.042). (Pollard et al., 2010)",
  }),
  helper.accessor("priphylop", {
    header: "priPhyloP",
    description:
      "Primate phyloP: Site-by-site conservation score comparing primate species (excluding humans). Range: [-10.761, 0.595] (default: -0.029). (Pollard et al., 2010)",
  }),
  helper.accessor("mamphylop", {
    header: "mamPhyloP",
    description:
      "Mammalian phyloP: Site-by-site conservation score comparing mammalian species (excluding humans). Range: [-20, 4.494] (default: -0.005). (Pollard et al., 2010)",
  }),
  helper.accessor("verphylop", {
    header: "verPhyloP",
    description:
      "Vertebrate phyloP: Site-by-site conservation score comparing vertebrate species (excluding humans). Range: [-20, 11.295] (default: 0.042). (Pollard et al., 2010)",
  }),
  helper.accessor("gerp_n", {
    header: "GerpN",
    description:
      "Neutral evolution score defined by GERP++. A higher score means the region is more conserved. Range: [0, 19.8] (default: 3.0). (Davydov et al., 2010)",
  }),
  helper.accessor("gerp_s", {
    header: "GerpS",
    description:
      "Rejected Substitution score defined by GERP++. A higher score means the region is more conserved. Range: [-39.5, 19.8] (default: -0.2). (Davydov et al., 2010)",
  }),
]);
