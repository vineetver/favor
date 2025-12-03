import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";

const helper = createColumnHelper<Variant>();

export const basicConfig = helper.group("basic", "Basic", [
  helper.accessor("variant_vcf", {
    header: "Variant",
    description:
      "The unique identifier of the given variant, Reported as chr-pos-ref-alt format.",
  }),
  helper.accessor("rsid", {
    header: "rsID",
    description: "The rsID of the given variant (if exists).",
    cell: helper.format.link(
      (val) => `https://www.ncbi.nlm.nih.gov/snp/${val}`,
    ),
  }),
  helper.accessor("filter_status", {
    header: "TOPMed QC Status",
    description: "TOPMed QC status of the given variant.",
    cell: helper.format.badge({
      PASS: "green",
      FAIL: "red",
    }),
  }),
  helper.accessor("bravo_an", {
    header: "TOPMed Bravo AN",
    description:
      "TOPMed Bravo Genome Allele Number. (NHLBI TOPMed Consortium, 2018; Taliun et al., 2019)",
  }),
  helper.accessor("bravo_af", {
    header: "TOPMed Bravo AF",
    description:
      "TOPMed Bravo Genome Allele Frequency. (NHLBI TOPMed Consortium, 2018; Taliun et al., 2019)",
    cell: helper.format.decimal(6),
  }),
  helper.accessor("af_total", {
    header: "Total GNOMAD AF",
    description:
      "GNOMAD v3 Genome Allele Frequency using all the samples. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    cell: helper.format.decimal(6),
  }),
  helper.accessor("tg_all", {
    header: "All 1000 Genomes AF",
    description:
      "1000 Genome Allele Frequency (Whole genome allele frequencies from the 1000 Genomes Project phase 3 data).",
    cell: helper.format.decimal(6),
  }),
]);
