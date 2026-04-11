import type { Variant } from "@features/variant/types";
import {
  categories,
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Variant>();

const filterStatus = categories([
  {
    label: "PASS",
    match: "PASS",
    color: "green",
    description: "passed all QC filters",
  },
  {
    label: "FAIL",
    match: /fail/i,
    color: "red",
    description: "failed QC filters",
  },
]);

export const basicColumns = [
  col.accessor("variant_vcf", {
    accessor: "variant_vcf",
    header: "Variant (VCF)",
    description: tooltip({
      title: "Variant (VCF)",
      description: "Unique variant identifier in chr-pos-ref-alt format.",
    }),
    cell: ({ getValue }) => {
      const v = getValue();
      if (v === null || v === undefined) return "-";
      return <span className="font-mono whitespace-nowrap">{String(v)}</span>;
    },
  }),

  col.accessor("rsid", {
    accessor: (row) => row.dbsnp?.rsid,
    header: "rsID",
    description: tooltip({
      title: "Reference SNP ID",
      description: "dbSNP reference SNP identifier (if exists).",
    }),
    cell: cell.link((val) => `https://www.ncbi.nlm.nih.gov/snp/${val}`),
  }),

  col.accessor("filter_status", {
    accessor: (row) => row.bravo?.filter_status,
    header: "TOPMed QC Status",
    description: tooltip({
      title: "TOPMed QC Status",
      description: "Quality control status of the variant.",
      categories: filterStatus,
    }),
    cell: cell.badge(filterStatus),
  }),

  col.accessor("bravo_an", {
    accessor: (row) => row.bravo?.bravo_an,
    header: "TOPMed Bravo AN",
    description: tooltip({
      title: "Allele Number",
      description: "TOPMed Bravo Genome Allele Number.",
      citation: "NHLBI TOPMed Consortium, 2018; Taliun et al., 2019",
    }),
    cell: cell.text(),
  }),

  col.accessor("bravo_af", {
    accessor: (row) => row.bravo?.bravo_af,
    header: "TOPMed Bravo AF",
    description: tooltip({
      title: "Allele Frequency",
      description: "TOPMed Bravo Genome Allele Frequency.",
      citation: "NHLBI TOPMed Consortium, 2018; Taliun et al., 2019",
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("tg_all", {
    accessor: (row) => row.tg?.tg_all,
    header: "1000 Genomes AF",
    description: tooltip({
      title: "1000 Genomes Allele Frequency",
      description:
        "Whole genome allele frequencies from the 1000 Genomes Project phase 3 data.",
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("gnomad_exome_af", {
    accessor: (row) => row.gnomad_exome?.af,
    header: "gnomAD Exome AF",
    description: tooltip({
      title: "gnomAD Exome AF",
      description: "gnomAD v4 Exome Allele Frequency using all samples.",
      citation: "gnomAD Consortium, 2019; Karczewski et al., 2020",
    }),
    cell: cell.decimal(6),
  }),

  col.accessor("gnomad_genome_af", {
    accessor: (row) => row.gnomad_genome?.af,
    header: "gnomAD Genome AF",
    description: tooltip({
      title: "gnomAD Genome AF",
      description: "gnomAD v4 Genome Allele Frequency using all samples.",
      citation: "gnomAD Consortium, 2019; Karczewski et al., 2020",
    }),
    cell: cell.decimal(6),
  }),
];

export const basicGroup = col.group("basic", "Basic", basicColumns);
