import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";

const helper = createColumnHelper<Variant>();

export const ancestryAfConfig = helper.group("ancestry-af", "Ancestry AF", [
  helper.accessor("tg_afr", {
    header: "AFR 1000G AF",
    description: "1000 Genomes African population allele frequency.",
  }),
  helper.accessor("af_afr", {
    header: "AFR GNOMAD AF",
    description:
      "GNOMAD v3 Genome African population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("tg_amr", {
    header: "AMR 1000G AF",
    description:
      "1000 Genomes AMR (Ad Mixed American) population allele frequency.",
  }),
  helper.accessor("af_amr", {
    header: "AMR GNOMAD AF",
    description:
      "GNOMAD v3 Genome AMR (Ad Mixed American) population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("tg_eas", {
    header: "EAS 1000G AF",
    description: "1000 Genomes East Asian population allele frequency.",
  }),
  helper.accessor("af_eas", {
    header: "EAS GNOMAD AF",
    description:
      "GNOMAD v3 Genome East Asian population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("tg_eur", {
    header: "EUR 1000G AF",
    description: "1000 Genomes European population allele frequency.",
  }),
  helper.accessor("af_nfe", {
    header: "NFE GNOMAD AF",
    description:
      "GNOMAD v3 Genome Non-Finnish European population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("af_fin", {
    header: "FIN GNOMAD AF",
    description:
      "GNOMAD v3 Genome Finnish European population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("tg_sas", {
    header: "SAS 1000G AF",
    description: "1000 Genomes South Asian population allele frequency.",
  }),
  helper.accessor("af_sas", {
    header: "SAS GNOMAD AF",
    description:
      "GNOMAD v3 Genome South Asian population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("af_ami", {
    header: "AMI GNOMAD AF",
    description:
      "GNOMAD v3 Genome Amish population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("af_asj", {
    header: "ASJ GNOMAD AF",
    description:
      "GNOMAD v3 Genome Ashkenazi Jewish population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
  helper.accessor("af_oth", {
    header: "OTH GNOMAD AF",
    description:
      "GNOMAD v3 Genome Other (population not assigned) frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
  }),
]);
