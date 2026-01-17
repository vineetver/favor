import {
  type GnomadMetrics,
  type GnomadPopulation,
  type GnomadSex,
  getGnomadMetrics,
  type Variant,
} from "@/features/variant/types";
import { cell, createColumns, tooltip } from "@/lib/table/column-builder";

const col = createColumns<Variant>();

interface CombinedMetrics {
  exome: GnomadMetrics | null;
  genome: GnomadMetrics | null;
}

function getCombinedMetrics(
  row: Variant,
  prefix: GnomadPopulation = "",
  suffix: GnomadSex = "",
): CombinedMetrics {
  return {
    exome: getGnomadMetrics(row.gnomad_exome, prefix, suffix),
    genome: getGnomadMetrics(row.gnomad_genome, prefix, suffix),
  };
}

// ============================================================================
// Cell Renderers
// ============================================================================

function MetricsDisplay({
  label,
  metrics,
}: {
  label: string;
  metrics: GnomadMetrics | null;
}) {
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
}

function GnomadCell({ data }: { data: CombinedMetrics }) {
  if (!data.exome && !data.genome) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <MetricsDisplay label="Exome" metrics={data.exome} />
      <MetricsDisplay label="Genome" metrics={data.genome} />
    </div>
  );
}

// Helper to create gnomAD population columns
function gnomadPopCol(
  id: string,
  header: string,
  title: string,
  description: string,
  prefix: GnomadPopulation,
  suffix: GnomadSex = "",
) {
  return col.display(id, {
    header,
    description: tooltip({
      title,
      description,
      citation: "Karczewski et al., 2020",
    }),
    cell: ({ row }) => (
      <GnomadCell data={getCombinedMetrics(row.original, prefix, suffix)} />
    ),
  });
}

// ============================================================================
// Column Definitions
// ============================================================================

export const alleleFrequencyColumns = [
  // Overall populations
  col.accessor("bravo_af", {
    accessor: "bravo_af",
    header: "TOPMed Bravo AF",
    description: tooltip({
      title: "TOPMed Bravo Allele Frequency",
      description:
        "Allele frequency from the TOPMed Bravo database, containing whole genome sequences from diverse populations.",
      citation: "Taliun et al., 2021",
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("tg_all", {
    accessor: "tg_all",
    header: "1000 Genomes AF",
    description: tooltip({
      title: "1000 Genomes Allele Frequency",
      description:
        "Allele frequency from the 1000 Genomes Project phase 3, representing genetic variation across 26 populations worldwide.",
      citation: "The 1000 Genomes Project Consortium, 2015",
    }),
    cell: cell.decimal(6),
  }),

  gnomadPopCol(
    "gnomad_global",
    "gnomAD v4 Global",
    "gnomAD v4 Global",
    "Global allele frequency aggregated across all populations in gnomAD v4 database.",
    "",
    "",
  ),

  // Ancestry-specific populations
  gnomadPopCol(
    "gnomad_afr",
    "African / African American (AFR)",
    "African / African American (AFR)",
    "Allele frequency in individuals of African or African American ancestry.",
    "afr",
  ),
  gnomadPopCol(
    "gnomad_amr",
    "Admixed American (AMR)",
    "Admixed American (AMR)",
    "Allele frequency in individuals of Admixed American (Latino) ancestry.",
    "amr",
  ),
  gnomadPopCol(
    "gnomad_eas",
    "East Asian (EAS)",
    "East Asian (EAS)",
    "Allele frequency in individuals of East Asian ancestry.",
    "eas",
  ),
  gnomadPopCol(
    "gnomad_fin",
    "Finnish (FIN)",
    "Finnish (FIN)",
    "Allele frequency in individuals of Finnish ancestry, analyzed separately due to founder effects.",
    "fin",
  ),
  gnomadPopCol(
    "gnomad_nfe",
    "Non-Finnish European (NFE)",
    "Non-Finnish European (NFE)",
    "Allele frequency in individuals of European ancestry (excluding Finnish).",
    "nfe",
  ),
  gnomadPopCol(
    "gnomad_sas",
    "South Asian (SAS)",
    "South Asian (SAS)",
    "Allele frequency in individuals of South Asian ancestry.",
    "sas",
  ),
  gnomadPopCol(
    "gnomad_asj",
    "Ashkenazi Jewish (ASJ)",
    "Ashkenazi Jewish (ASJ)",
    "Allele frequency in individuals of Ashkenazi Jewish ancestry.",
    "asj",
  ),
  gnomadPopCol(
    "gnomad_ami",
    "Amish (AMI)",
    "Amish (AMI)",
    "Allele frequency in individuals of Amish ancestry, analyzed separately due to founder effects.",
    "ami",
  ),
  gnomadPopCol(
    "gnomad_mid",
    "Middle Eastern (MID)",
    "Middle Eastern (MID)",
    "Allele frequency in individuals of Middle Eastern ancestry.",
    "mid",
  ),
  gnomadPopCol(
    "gnomad_remaining",
    "Remaining (OTH)",
    "Remaining Populations (OTH)",
    "Allele frequency in individuals not assigned to other ancestry groups.",
    "remaining",
  ),

  // Sex-specific
  gnomadPopCol(
    "gnomad_xx",
    "Female (XX)",
    "Female (XX)",
    "Allele frequency in genetic females (XX chromosomes).",
    "",
    "xx",
  ),
  gnomadPopCol(
    "gnomad_xy",
    "Male (XY)",
    "Male (XY)",
    "Allele frequency in genetic males (XY chromosomes).",
    "",
    "xy",
  ),
];

export const alleleFrequencyGroup = col.group(
  "allele-frequency",
  "Allele Frequency",
  alleleFrequencyColumns,
);
