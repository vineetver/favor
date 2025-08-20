import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "@/components/ui/external-link";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import {
  isValidNumber,
  isValidString,
  splitText,
} from "@/lib/annotations/helpers";
import {
  genecodeComprehensiveCategoryCCode,
  genecodeCompExonicCategoryCCode,
  alleleOriginCCode,
  cagePromoterCCode,
  cageEnhancerCCode,
  siftCategoryCCode,
  filterStatusCCode,
  clinicalSignificanceCCode,
} from "@/lib/utils/colors";

function formatAlleleFrequency(value: unknown) {
  if (!isValidNumber(value)) return null;
  
  return (
    <span>
      {Number(value)
        .toFixed(6)
        .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
    </span>
  );
}

function formatScore(value: unknown) {
  if (!isValidNumber(value)) return null;
  
  return (
    <span>
      {Number(value)
        .toFixed(6)
        .replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/, "$1")}
    </span>
  );
}

function renderFilterStatus(value: unknown) {
  if (!isValidString(value)) return null;
  return filterStatusCCode(value);
}

function renderSiftCategory(value: unknown) {
  if (!isValidString(value)) return null;
  return siftCategoryCCode(value);
}

function renderVariantLink(value: unknown) {
  if (!isValidString(value)) return null;

  return (
    <a
      href={`/hg38/variant/${value}/summary/basic`}
      className="underline"
    >
      {value}
    </a>
  );
}

function renderRsidLink(value: unknown) {
  if (!isValidString(value)) return null;

  return (
    <a
      href={`https://www.ncbi.nlm.nih.gov/snp/?term=${value}`}
      className="underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {value}
    </a>
  );
}

function renderGeneInfo(value: unknown) {
  if (!isValidString(value)) return null;

  const gene = value.split(":")[0];
  if (!gene) return <span>{value}</span>;

  return (
    <ExternalLink
      href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${gene}%5Bgene%5D&redir=gene`}
    >
      {value}
    </ExternalLink>
  );
}

function renderCleanText(value: unknown) {
  if (!isValidString(value)) return null;
  const cleanValue = value.replace(/_/g, " ");
  return splitText(cleanValue, "|");
}

function renderGeneHancer(value: unknown) {
  if (!isValidString(value)) return null;
  const cleanValue = value.replace(/_/g, " ");
  return <span>{cleanValue.split(";").slice(0, 4).join(", ")}</span>;
}

function renderOrigin(value: unknown) {
  if (!isValidString(value) && !isValidNumber(value)) return null;
  
  const origin: {[key: number]: string} = {
    0: "unknown",
    1: "germline", 
    2: "somatic",
    4: "inherited",
    8: "paternal",
    16: "maternal",
    32: "de-novo",
    64: "biparental",
    128: "uniparental",
    256: "not-tested",
    512: "tested-inconclusive",
  };
  
  const originValue = typeof value === 'number' ? origin[value] : value;
  return (
    <span className="capitalize">{alleleOriginCCode(originValue)}</span>
  );
}

function renderClinicalSignificance(value: unknown) {
  if (!isValidString(value)) return null;
  
  // Handle multiple values separated by pipe
  const values = value.split('|').filter(v => v.trim() !== '');
  if (values.length > 1) {
    return (
      <div className="space-y-1">
        {values.map((val, index) => (
          <div key={index}>{clinicalSignificanceCCode(val.trim())}</div>
        ))}
      </div>
    );
  }
  
  return clinicalSignificanceCCode(value);
}

export const VariantTableColumns: ColumnDef<any, any>[] = [
  {
    header: "Variant (VCF)",
    accessorKey: "variant_vcf",
    filterFn: "includesString",
    cell: (props) => renderVariantLink(props.getValue()),
  },
  {
    header: "rsID",
    accessorKey: "rsid",
    cell: (props) => renderRsidLink(props.getValue()),
  },
  {
    header: "Filter Status",
    accessorKey: "filter_status",
    cell: (props) => renderFilterStatus(props.getValue()),
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bravo AF" />
    ),
    accessorKey: "bravo_af",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total GNOMAD AF" />
    ),
    accessorKey: "af_total",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ALL 1000G AF" />
    ),
    accessorKey: "tg_all",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: "Genecode Comprehensive Info",
    accessorKey: "genecode_comprehensive_info",
  },
  {
    header: "Genecode Comprehensive Category",
    accessorKey: "genecode_comprehensive_category",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell: (props) => {
      const value = props.getValue();
      if (!value) return null;
      return <div>{genecodeComprehensiveCategoryCCode(value)}</div>;
    },
  },
  {
    header: "Genecode Comprehensive Exonic Category",
    accessorKey: "genecode_comprehensive_exonic_category",
    cell: (props) => {
      const value = props.getValue();
      if (!value) return null;
      return <div>{genecodeCompExonicCategoryCCode(value)}</div>;
    },
  },
  {
    header: "Clinical Significance",
    accessorKey: "clnsig_v2",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell: (props) => renderClinicalSignificance(props.getValue()),
  },
  {
    header: "Clinical Significance (genotype includes)",
    accessorKey: "clnsigincl_v2",
    cell: (props) => renderClinicalSignificance(props.getValue()),
  },
  {
    header: "Disease Name",
    accessorKey: "clndn_v2",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Disease Name (variants includes)",
    accessorKey: "clndnincl_v2",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Review Status",
    accessorKey: "clnrevstat_v2",
    cell: (props) => {
      const value = props.getValue();
      if (!value) return null;
      return <span className="capitalize">{value.split("_").join(" ")}</span>;
    },
  },
  {
    header: "Allele Origin",
    accessorKey: "origin_v2",
    cell: (props) => renderOrigin(props.getValue()),
  },
  {
    header: "Disease Database ID",
    accessorKey: "clndisdb_v2",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Disease Database ID (variants includes)",
    accessorKey: "clndisdbincl_v2",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Gene Reported",
    accessorKey: "geneinfo_v2",
    cell: (props) => renderGeneInfo(props.getValue()),
  },
  {
    header: "SIFT Category",
    accessorKey: "sift_cat",
    cell: (props) => renderSiftCategory(props.getValue()),
  },
  {
    header: "CAGE Promoter",
    accessorKey: "cage_promoter",
    cell: (props) => {
      const value = props.getValue();
      return <span>{cagePromoterCCode(value)}</span>;
    },
  },
  {
    header: "CAGE Enhancer",
    accessorKey: "cage_enhancer",
    cell: (props) => {
      const value = props.getValue();
      return <span>{cageEnhancerCCode(value)}</span>;
    },
  },
  {
    header: "GeneHancer",
    accessorKey: "genehancer",
    cell: (props) => renderGeneHancer(props.getValue()),
  },
  {
    accessorKey: "linsight",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="LINSIGHT" />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="FATHMM_XF" />
    ),
    accessorKey: "fathmm_xf",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="CADD phred" />
    ),
    accessorKey: "cadd_phred",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: "apc_epigenetics_active",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="aPC Epigenetics Active" />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: "apc_epigenetics_repressed",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="aPC Epigenetics Repressed"
      />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: "apc_epigenetics_transcription",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="aPC Epigenetics Transcription"
      />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: "apc_conservation_v2",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="aPC Conservation" />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: "apc_protein_function_v3",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="aPC Protein Function" />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: "apc_local_nucleotide_diversity_v3",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="aPC Local Nucleotide Diversity"
      />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    accessorKey: "apc_mutation_density",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="aPC Mutation Density" />
    ),
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="EUR 1000G AF" />
    ),
    accessorKey: "tg_eur",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="AFR 1000G AF" />
    ),
    accessorKey: "tg_afr",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="AMR 1000G AF" />
    ),
    accessorKey: "tg_amr",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="EAS 1000G AF" />
    ),
    accessorKey: "tg_eas",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SAS 1000G AF" />
    ),
    accessorKey: "tg_sas",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
];