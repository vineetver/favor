"use client";

import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ColumnDef } from "@tanstack/table-core";
import {
  genecodeComprehensiveCategoryCCode,
  genecodeCompExonicCategoryCCode,
  alleleOriginCCode,
  siftCategoryCCode,
  clinicalSignificanceCCode,
} from "@/lib/utils/colors";
import {
  isValidNumber,
  isValidString,
  splitText,
} from "@/lib/annotations/helpers";

const sortableHeader = (title: string) => ({ column }: { column: any }) => (
  <DataTableColumnHeader column={column} title={title} />
);

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

function renderSiftCategory(value: unknown) {
  if (!isValidString(value)) return null;
  return siftCategoryCCode(value);
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

function renderCleanText(value: unknown) {
  if (!isValidString(value)) return null;
  const cleanValue = value.replace(/_/g, " ");
  return splitText(cleanValue, "|");
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

export const HG19GeneTableColumns: ColumnDef<any, any>[] = [
  {
    header: sortableHeader("Variant (VCF)"),
    accessorKey: "variant_vcf",
    cell: (props) => {
      const variant_vcf = props.getValue();
      if (!variant_vcf) return null;
      return (
        <a
          href={`/hg19/variant/${variant_vcf}/summary/basic`}
          className="underline"
        >
          {variant_vcf}
        </a>
      );
    },
    enableSorting: true,
  },
  {
    header: sortableHeader("rsID"),
    accessorKey: "rsid",
    cell: (props) => {
      const rsid = props.getValue();
      if (!rsid) return null;
      return (
        <a
          href={`https://www.ncbi.nlm.nih.gov/snp/?term=${rsid}`}
          className="underline"
        >
          {rsid}
        </a>
      );
    },
    enableSorting: true,
  },
  {
    header: "Genecode Info",
    accessorKey: "gencode_info",
    enableSorting: true,
  },
  {
    header: "Genecode Category", 
    accessorKey: "gencode_category",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell: (props) => {
      const value = props.getValue();
      if (!value) return null;
      return <div>{genecodeComprehensiveCategoryCCode(value)}</div>;
    },
    enableSorting: true,
  },
  {
    header: "Genecode Exonic Category", 
    accessorKey: "gencode_exonic_category",
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
    cell: (props) => {
      const value = props.getValue();
      if (!value) return null;
      return <div>{genecodeCompExonicCategoryCCode(value)}</div>;
    },
  },
  {
    header: "Clinical Significance",
    accessorKey: "clnsig",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell: (props) => renderClinicalSignificance(props.getValue()),
  },
  {
    header: "Clinical Significance (genotype includes)",
    accessorKey: "clnsigincl",
    cell: (props) => renderClinicalSignificance(props.getValue()),
  },
  {
    header: "Disease Name",
    accessorKey: "clndn",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Disease Name (variants includes)",
    accessorKey: "clndnincl",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Review Status",
    accessorKey: "clnrevstat",
    cell: (props) => {
      const value = props.getValue();
      if (!value) return null;

      return <span className="capitalize">{value.split("_").join(" ")}</span>;
    },
  },
  {
    header: "Allele Origin",
    accessorKey: "origin",
    cell: (props) => renderOrigin(props.getValue()),
  },
  {
    header: "Disease Database ID",
    accessorKey: "clndisdb",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Disease Database ID (variants includes)",
    accessorKey: "clndisdbincl",
    cell: (props) => renderCleanText(props.getValue()),
  },
  {
    header: "Gene Reported",
    accessorKey: "geneinfo",
    cell: (props) => {
      const value = props.getValue();
      if (!value) return null;

      const gene = value.split(":")[0];
      if (!gene) return null;

      return (
        <a
          href={`https://www.ncbi.nlm.nih.gov/clinvar/?term=${gene}%5Bgene%5D&redir=gene`}
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {value}
        </a>
      );
    },
  },
  {
    header: "SIFT Category",
    accessorKey: "sift_cat",
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    cell: (props) => renderSiftCategory(props.getValue()),
  },
  {
    header: sortableHeader("PolyPhen2 HDIV Prediction"),
    accessorKey: "polyphen2_hdiv_pred",
    enableSorting: true,
  },
  {
    header: sortableHeader("PolyPhen2 HVAR Prediction"),
    accessorKey: "polyphen2_hvar_pred",
    enableSorting: true,
  },
  {
    header: sortableHeader("FATHMM Prediction"),
    accessorKey: "fathmm_pred",
    enableSorting: true,
  },
  {
    header: sortableHeader("AM Pathogenicity"),
    accessorKey: "am_pathogenicity",
    enableSorting: true,
  },
  {
    header: sortableHeader("AM Class"),
    accessorKey: "am_class",
    enableSorting: true,
  },
  {
    header: sortableHeader("Protein Variant"),
    accessorKey: "protein_variant",
    enableSorting: true,
  },
  {
    header: sortableHeader("SIFT Score"),
    accessorKey: "sift_score",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("PolyPhen2 HDIV Score"),
    accessorKey: "polyphen2_hdiv_score",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("PolyPhen2 HVAR Score"),
    accessorKey: "polyphen2_hvar_score",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("CADD Raw Score"),
    accessorKey: "cadd_rawscore",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("CADD Phred"),
    accessorKey: "cadd_phred",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("FATHMM Score"),
    accessorKey: "fathmm_score",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("aPC Conservation"),
    accessorKey: "apc_conservation_v2",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("aPC Epigenetics"),
    accessorKey: "apc_epigenetics",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("aPC Protein Function"),
    accessorKey: "apc_protein_function_v3",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("aPC Transcription Factor"),
    accessorKey: "apc_transcription_factor",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("aPC Proximity to TSS/TES"),
    accessorKey: "apc_proximity_to_tss_tes_scaled_phred_score",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("aPC Mutation Density"),
    accessorKey: "mutation_density_apc_scaled_phred_score",
    cell: (props) => formatScore(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("AFR 1000G"),
    accessorKey: "tg_afr",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("ALL 1000G"),
    accessorKey: "tg_all",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("AMR 1000G"),
    accessorKey: "tg_amr",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("EAS 1000G"),
    accessorKey: "tg_eas",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("EUR 1000G"),
    accessorKey: "tg_eur",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("SAS 1000G"),
    accessorKey: "tg_sas",
    cell: (props) => formatAlleleFrequency(props.getValue()),
    enableSorting: true,
  },
  {
    header: sortableHeader("Mutation Rate Filter"),
    accessorKey: "mutation_rate_filter",
    enableSorting: true,
  },
  {
    header: sortableHeader("PN"),
    accessorKey: "pn",
    enableSorting: true,
  },
  {
    header: sortableHeader("MR"),
    accessorKey: "mr",
    enableSorting: true,
  },
  {
    header: sortableHeader("AR"),
    accessorKey: "ar",
    enableSorting: true,
  },
  {
    header: sortableHeader("MG"),
    accessorKey: "mg",
    enableSorting: true,
  },
  {
    header: sortableHeader("MC"),
    accessorKey: "mc",
    enableSorting: true,
  },
];