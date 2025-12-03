import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";

const helper = createColumnHelper<Variant>();

export const genderAfMaleConfig = helper.group(
  "gender-af-male",
  "Gender AF Male",
  [
    helper.accessor("af_male", {
      header: "Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome Male Allele Frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_afr_male", {
      header: "AFR Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome African Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_ami_male", {
      header: "AMI Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome Amish Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_amr_male", {
      header: "AMR Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome AMR (Ad Mixed American) Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_asj_male", {
      header: "ASJ Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome Ashkenazi Jewish Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_eas_male", {
      header: "EAS Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome East Asian Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_fin_male", {
      header: "FIN Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome Finnish European Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_nfe_male", {
      header: "NFE Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome Non-Finnish European Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_oth_male", {
      header: "OTH Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome Other (population not assigned) Male frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_sas_male", {
      header: "SAS Male GNOMAD AF",
      description:
        "GNOMAD v3 Genome South Asian Male population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
  ],
);

export const genderAfFemaleConfig = helper.group(
  "gender-af-female",
  "Gender AF Female",
  [
    helper.accessor("af_female", {
      header: "Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome Female Allele Frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_afr_female", {
      header: "AFR Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome African Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_ami_female", {
      header: "AMI Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome Amish Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_amr_female", {
      header: "AMR Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome AMR (Ad Mixed American) Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_asj_female", {
      header: "ASJ Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome Ashkenazi Jewish Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_eas_female", {
      header: "EAS Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome East Asian Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_fin_female", {
      header: "FIN Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome Finnish European Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_nfe_female", {
      header: "NFE Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome Non-Finnish European Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_oth_female", {
      header: "OTH Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome Other (population not assigned) Female frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
    helper.accessor("af_sas_female", {
      header: "SAS Female GNOMAD AF",
      description:
        "GNOMAD v3 Genome South Asian Female population frequency. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
    }),
  ],
);
