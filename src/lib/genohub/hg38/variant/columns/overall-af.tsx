import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../types";

const helper = createColumnHelper<Variant>();

export const overallAfConfig = helper.group("overall-af", "Overall AF", [
    helper.accessor("bravo_af", {
        header: "TOPMed Bravo AF",
        description:
            "TOPMed Bravo Genome Allele Frequency. (NHLBI TOPMed Consortium, 2018; Taliun et al., 2019)",
        cell: helper.format.decimal(6),
    }),
    helper.accessor("tg_all", {
        header: "ALL 1000G AF",
        description:
            "1000 Genome Allele Frequency (Whole genome allele frequencies from the 1000 Genomes Project phase 3 data).",
        cell: helper.format.decimal(6),
    }),
    helper.accessor("af_total", {
        header: "Total gnomAD v3.1 AF",
        description:
            "GNOMAD v3 Genome Allele Frequency using all the samples. (GNOMAD Consortium, 2019; Karczewski et al., 2020)",
        cell: helper.format.decimal(6),
    }),
    helper.accessor("gnomad41_exome", {
        header: "Total gnomAD v4.1 (Exome) AF",
        description:
            "gnomAD v4.1 Exome Allele Frequency using all the samples. (gnomAD Consortium, 2021)",
        cell: helper.format.decimal(6),
    }),
    helper.accessor("gnomad41_genome", {
        header: "Total gnomAD v4.1 (Genome) AF",
        description:
            "gnomAD v4.1 Genome Allele Frequency using all the samples. (gnomAD Consortium, 2021)",
        cell: helper.format.decimal(6),
    }),
]);
