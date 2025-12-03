import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";
import { alleleOriginCCode } from "@/lib/utils/colors";

const helper = createColumnHelper<Variant>();

export const clinvarConfig = helper.group("clinvar", "Clinvar", [
  helper.accessor("clnsig", {
    header: "Clinical Significance",
    description:
      "Clinical significance for this single variant. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) =>
      val?.replace(/_/g, " ").split("|").join(", "),
    ),
  }),
  helper.accessor("clnsigincl", {
    header: "Clinical Significance (genotype includes)",
    description:
      "Clinical significance for a haplotype or genotype that includes this variant. Reported as pairs of VariationID:clinical significance. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) =>
      val?.replace(/_/g, " ").split("|").join(", "),
    ),
  }),
  helper.accessor("clndn", {
    header: "Disease Name",
    description:
      "ClinVar’s preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) =>
      val?.replace(/_/g, " ").split("|").join(", "),
    ),
  }),
  helper.accessor("clndnincl", {
    header: "Disease Name (Variant Includes)",
    description:
      "For included variant: ClinVar’s preferred disease name for the concept specified by disease identifiers in CLNDISDB. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) =>
      val?.replace(/_/g, " ").split("|").join(", "),
    ),
  }),
  helper.accessor("clnrevstat", {
    header: "Review Status",
    description:
      "ClinVar review status for the Variation ID. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => (
      <span className="capitalize"> {val?.split("_").join(" ")} </span>
    )),
  }),
  helper.accessor("origin", {
    header: "Allele Origin",
    description:
      "Allele origin. One or more of the following values may be added: 0 - unknown; 1 - germline; 2 - somatic; 4 - inherited; 8 - paternal; 16 - maternal; 32 - de-novo; 64 - biparental; 128 - uniparental; 256 - not-tested; 512 - tested-inconclusive. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val: any) => (
      <span className="capitalize"> {alleleOriginCCode(val)} </span>
    )),
  }),
  helper.accessor("clndisdb", {
    header: "Disease Database ID",
    description:
      "Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) =>
      val?.replace(/[|_]/g, " ").split(",").join(", "),
    ),
  }),
  helper.accessor("clndisdbincl", {
    header: "Disease Database ID (included variant)",
    description:
      "For included variant: Tag-value pairs of disease database name and identifier, e.g. OMIM:NNNNNN. (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) =>
      val?.replace(/[.|_]/g, " ").split(",").join(", "),
    ),
  }),
  helper.accessor("geneinfo", {
    header: "Gene Reported",
    description:
      "Gene(s) for the variant reported as gene symbol:gene id. The gene symbol and id are delimited by a colon (:) and each pair is delimited by a vertical bar (|). (Landrum et al., 2017, 2013)",
    cell: helper.format.custom((val) => {
      const gene = val?.split(":")[0];
      return (
        <a
          href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${gene}%5Bgene%5D&redir=gene`}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          {val}
        </a>
      );
    }),
  }),
]);
