import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant, GnomadData } from "../../../types/types";
import { roundNumber } from "@/lib/data-display/helpers";

const helper = createColumnHelper<Variant>();

export type GnomadPopulation =
    | "afr"
    | "ami"
    | "amr"
    | "asj"
    | "eas"
    | "fin"
    | "mid"
    | "nfe"
    | "remaining"
    | "sas"
    | "";

export type GnomadSex = "xx" | "xy" | "";

export interface GnomadMetrics {
    af: number;
    ac: number;
    an: number;
    hom: number;
}

interface CombinedGnomadMetrics {
    exome: GnomadMetrics | null;
    genome: GnomadMetrics | null;
}

export const getGnomadMetrics = (
    data: GnomadData | null | undefined,
    prefix: GnomadPopulation,
    suffix: GnomadSex,
): GnomadMetrics | null => {
    if (!data) return null;

    const getVal = (metric: "af" | "ac" | "an" | "nhomalt") => {
        const parts = [metric, prefix, suffix].filter(Boolean);
        const key = parts.join("_") as keyof GnomadData;
        return data[key] as number | undefined;
    };

    const af = getVal("af");
    const ac = getVal("ac");
    const an = getVal("an");
    const hom = getVal("nhomalt");

    if (af === undefined || af === null) return null;

    return { af, ac: ac ?? 0, an: an ?? 0, hom: hom ?? 0 };
};

const getCombinedMetrics = (
    row: Variant,
    prefix: GnomadPopulation = "",
    suffix: GnomadSex = "",
): CombinedGnomadMetrics => {
    return {
        exome: getGnomadMetrics(row.gnomad_exome, prefix, suffix),
        genome: getGnomadMetrics(row.gnomad_genome, prefix, suffix),
    };
};

const GnomadStatsDisplay = ({
    label,
    metrics,
}: {
    label: string;
    metrics: GnomadMetrics | null;
}) => {
    if (!metrics) {
        return (
            <div>
                <div className="font-semibold text-muted-foreground border-b pb-1 mb-1">
                    {label}
                </div>
                <span className="text-muted-foreground">-</span>
            </div>
        );
    }

    return (
        <div>
            <div className="font-semibold text-muted-foreground border-b pb-1 mb-1">
                {label}
            </div>
            <div className="space-y-0.5">
                <div className="flex justify-between gap-2">
                    <span>AF:</span>
                    <span className="font-mono">{metrics.af.toExponential(2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>AC:</span>
                    <span className="font-mono">{metrics.ac}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>AN:</span>
                    <span className="font-mono">{metrics.an}</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>Hom:</span>
                    <span className="font-mono">{metrics.hom}</span>
                </div>
            </div>
        </div>
    );
};

const GnomadCell = ({ data }: { data: CombinedGnomadMetrics }) => {
    if (!data.exome && !data.genome) {
        return <span className="text-muted-foreground">-</span>;
    }

    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <GnomadStatsDisplay label="Exome" metrics={data.exome} />
            <GnomadStatsDisplay label="Genome" metrics={data.genome} />
        </div>
    );
};

export const alleleFrequencyConfig = helper.group("allele-frequency", "Allele Frequency", [
    // --- Overall ---
    helper.accessor("bravo_af", {
        header: "TOPMed Bravo AF",
        description: "TOPMed Bravo Genome Allele Frequency.",
        cell: helper.format.decimal(6),
    }),
    helper.accessor("tg_all", {
        header: "1000 Genomes AF",
        description: "1000 Genomes Project phase 3 allele frequency.",
        cell: helper.format.decimal(6),
    }),
    helper.display({
        id: "gnomad_global",
        header: "gnomAD v4 Global",
        description: "Global allele frequency in gnomAD v4 (Exome & Genome).",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "", "")} />,
    }),

    // --- Ancestry ---
    helper.display({
        id: "gnomad_afr",
        header: "African / African American (AFR)",
        description: "African / African American population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "afr", "")} />,
    }),
    helper.display({
        id: "gnomad_amr",
        header: "Admixed American (AMR)",
        description: "Admixed American population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "amr", "")} />,
    }),
    helper.display({
        id: "gnomad_eas",
        header: "East Asian (EAS)",
        description: "East Asian population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "eas", "")} />,
    }),
    helper.display({
        id: "gnomad_fin",
        header: "Finnish (FIN)",
        description: "Finnish population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "fin", "")} />,
    }),
    helper.display({
        id: "gnomad_nfe",
        header: "Non-Finnish European (NFE)",
        description: "Non-Finnish European population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "nfe", "")} />,
    }),
    helper.display({
        id: "gnomad_sas",
        header: "South Asian (SAS)",
        description: "South Asian population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "sas", "")} />,
    }),
    helper.display({
        id: "gnomad_asj",
        header: "Ashkenazi Jewish (ASJ)",
        description: "Ashkenazi Jewish population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "asj", "")} />,
    }),
    helper.display({
        id: "gnomad_ami",
        header: "Amish (AMI)",
        description: "Amish population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "ami", "")} />,
    }),
    helper.display({
        id: "gnomad_mid",
        header: "Middle Eastern (MID)",
        description: "Middle Eastern population frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "mid", "")} />,
    }),
    helper.display({
        id: "gnomad_remaining",
        header: "Remaining (OTH)",
        description: "Remaining individuals (not assigned to other populations) in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "remaining", "")} />,
    }),

    // --- Gender ---
    helper.display({
        id: "gnomad_xx",
        header: "Female (XX)",
        description: "Female (XX) allele frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "", "xx")} />,
    }),
    helper.display({
        id: "gnomad_xy",
        header: "Male (XY)",
        description: "Male (XY) allele frequency in gnomAD v4.",
        cell: ({ row }) => <GnomadCell data={getCombinedMetrics(row, "", "xy")} />,
    }),
]);
