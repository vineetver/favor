import type React from "react";
import type { Gene } from "@features/gene/types";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

/** Extract unique labels from synonym array (API returns key as `label` or label) */
function formatSynonyms(items: Array<Record<string, string>>): React.ReactNode {
  if (!items || items.length === 0) return null;
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of items) {
    const label = item.label || item["`label`"] || "";
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  if (labels.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {labels.map((l, i) => <span key={i}>{l}</span>)}
    </div>
  );
}

export const geneInfoAndIdsColumns = [
  col.accessor("ot_name_synonyms", {
    accessor: (row) => row.opentargets?.name_synonyms,
    header: "Name Synonyms",
    description: tooltip({
      title: "Name Synonyms",
      description: "Alternative gene names from OpenTargets.",
    }),
    cell: cell.custom<Gene, any>((synonyms: Array<Record<string, string>>) =>
      formatSynonyms(synonyms)
    ),
  }),

  col.accessor("ot_synonyms", {
    accessor: (row) => row.opentargets?.synonyms,
    header: "Synonyms",
    description: tooltip({
      title: "Gene Synonyms",
      description: "Alternative gene names and symbols from multiple sources (OpenTargets).",
    }),
    cell: cell.custom<Gene, any>((synonyms: Array<Record<string, string>>) =>
      formatSynonyms(synonyms)
    ),
  }),

  col.accessor("ot_symbol_synonyms", {
    accessor: (row) => row.opentargets?.symbol_synonyms,
    header: "Symbol Synonyms",
    description: tooltip({
      title: "Symbol Synonyms",
      description: "Alternative gene symbols from OpenTargets.",
    }),
    cell: cell.custom<Gene, any>((synonyms: Array<Record<string, string>>) =>
      formatSynonyms(synonyms)
    ),
  }),

  col.accessor("ot_obsolete_symbols", {
    accessor: (row) => row.opentargets?.obsolete_symbols,
    header: "Obsolete Symbols",
    description: tooltip({
      title: "Obsolete Symbols",
      description: "Previously used gene symbols that are now obsolete.",
    }),
    cell: cell.custom<Gene, any>((obsolete: Array<Record<string, string>>) =>
      formatSynonyms(obsolete)
    ),
  }),

  col.accessor("ot_canonical_transcript", {
    accessor: (row) => row.opentargets?.canonical_transcript,
    header: "Canonical Transcript",
    description: tooltip({
      title: "Canonical Transcript",
      description: "The canonical transcript for this gene from OpenTargets.",
    }),
    cell: cell.custom<Gene, any>((transcript: Record<string, any>) => {
      if (!transcript) return null;
      const start = transcript.start ?? transcript["`start`"];
      const end = transcript.end ?? transcript["`end`"];
      return (
        <div className="space-y-0.5">
          <span className="font-medium text-foreground">{transcript.id}</span>
          <p className="text-xs text-muted-foreground">
            {transcript.chromosome}:{start?.toLocaleString()}-{end?.toLocaleString()} ({transcript.strand})
          </p>
        </div>
      );
    }),
  }),

  col.accessor("uniprot_acc_hgnc_uniprot", {
    accessor: "uniprot_acc_hgnc_uniprot",
    header: "Uniprot Accession",
    description: tooltip({
      title: "Uniprot Accession",
      description: "Uniprot accession number (from HGNC and Uniprot).",
    }),
    cell: cell.link((val) => `https://www.uniprot.org/uniprotkb/${val}/entry`),
  }),

  col.accessor("uniprot_id_hgnc_uniprot", {
    accessor: "uniprot_id_hgnc_uniprot",
    header: "Uniprot ID",
    description: tooltip({
      title: "Uniprot ID",
      description: "Uniprot ID (from HGNC and Uniprot)",
    }),
    cell: cell.link((val) => `https://www.uniprot.org/uniprotkb?query=${val}`),
  }),

  col.accessor("ccds_id", {
    accessor: "ccds_id",
    header: "CCDS ID",
    description: tooltip({
      title: "CCDS ID",
      description: "CCDS ID (from HGNC).",
    }),
    cell: cell.link((val) => `https://www.ncbi.nlm.nih.gov/CCDS/CcdsBrowse.cgi?REQUEST=CCDS&GO=MainBrowse&DATA=${val}`),
  }),

  col.accessor("refseq_id", {
    accessor: "refseq_id",
    header: "RefSeq ID",
    description: tooltip({
      title: "RefSeq ID",
      description: "Refseq ID (from HGNC).",
    }),
    cell: cell.link((val) => `https://www.ncbi.nlm.nih.gov/nuccore/${val}`),
  }),

  col.accessor("ucsc_id", {
    accessor: "ucsc_id",
    header: "UCSC ID",
    description: tooltip({
      title: "UCSC ID",
      description: "UCSC ID (from HGNC).",
    }),
    cell: cell.link(
      (val) => `https://genome.ucsc.edu/cgi-bin/hgGene?hgg_gene=${val}&org=human`,
    ),
  }),

  col.accessor("omim_id", {
    accessor: "omim_id",
    header: "OMIM ID",
    description: tooltip({
      title: "OMIM ID",
      description: "OMIM ID (from HGNC).",
    }),
    cell: cell.link((val) => `https://www.omim.org/entry/${val}`),
  }),

  col.accessor("cyto_location", {
    accessor: "cyto_location",
    header: "Cyto Band Location",
    description: tooltip({
      title: "Cyto Location",
      description: "Cyto Location.",
    }),
    cell: cell.link(
      (val) =>
        `https://genome.ucsc.edu/cgi-bin/hgTracks?org=human&position=${val}`,
    ),
  }),

  col.accessor("hgnc_id", {
    accessor: "hgnc_id",
    header: "HGNC ID",
    description: tooltip({
      title: "HGNC ID",
      description: "HGNC ID",
    }),
    cell: cell.link((val) => `https://www.alliancegenome.org/gene/${val}`),
  }),

  col.accessor("locus_group", {
    accessor: (row) => row.locus_group,
    header: "Locus Group",
    description: tooltip({
      title: "Status",
      description: "Status",
    }),
    cell: cell.capitalize(),
  }),

  col.accessor("locus_type", {
    accessor: "locus_type",
    header: "Locus Type",
    description: tooltip({
      title: "Locus type",
      description: "Locus type",
    }),
    cell: cell.capitalize(),
  }),

  col.accessor("entrez_id", {
    accessor: "entrez_id",
    header: "Entrez ID",
    description: tooltip({
      title: "Entrez ID",
      description: "Entrez ID",
    }),
    cell: cell.link((val) => `https://www.ncbi.nlm.nih.gov/gene/${val}`),
  }),

  col.accessor("vega_id", {
    accessor: "vega_id",
    header: "Vega ID",
    description: tooltip({
      title: "Vega ID",
      description: "Vega ID",
    }),
    cell: cell.link(
      (val) => `https://vega.archive.ensembl.org/Homo_sapiens/Gene/Summary?g=${val}`,
    ),
  }),

  col.accessor("ena", {
    accessor: "ena",
    header: "European Nucleotide Archive",
    description: tooltip({
      title: "European Nucleotide Archive",
      description: "European Nucleotide Archive",
    }),
    cell: cell.link((val) => `https://www.ebi.ac.uk/ena/browser/view/${val}`),
  }),

  col.accessor("pubmed_id", {
    accessor: (row) => row.pubmed_id,
    header: "Pubmed ID",
    description: tooltip({
      title: "Pubmed ID",
      description: "Pubmed ID",
    }),
    cell: cell.link((val) => `https://pubmed.ncbi.nlm.nih.gov/${val}`)
  }),

  col.accessor("lsdb", {
    accessor: (row) => row.lsdb,
    header: "LSDB",
    description: tooltip({
      title: "LSDB",
      description:
        "The name of the Locus Specific Mutation Database and URL for the gene separated by a | character.",
    }),
    cell: cell.custom<Gene, any>((str: string) => {
      const items = str.split("|");
      const uniqueNames = new Set();
      const results: any[] = [];

      for (let i = 1; i < items.length; i += 2) {
        const name = items[i - 1];
        const url = items[i];
        const lowerCaseName = name?.toLowerCase();

        if (name && url && !uniqueNames.has(lowerCaseName)) {
          uniqueNames.add(lowerCaseName);
          results.push(
            <li key={i}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {name}
              </a>
            </li>,
          );
        }
      }

      return <ul>{results}</ul>;
    }),
  }),

  col.accessor("cosmic", {
    accessor: "cosmic",
    header: "Cosmic",
    description: tooltip({
      title: "COSMIC",
      description:
        "COSMIC (Symbol used within the Catalogue of somatic mutations in cancer for the gene)",
    }),
    cell: cell.link(
      (val) => `https://cancer.sanger.ac.uk/cosmic/gene/analysis?ln=${val}`,
    ),
  }),

  col.accessor("snornabase", {
    accessor: (row) => row.snornabase,
    header: "SNORNABase",
    description: tooltip({
      title: "snoRNABase ID",
      description: "snoRNABase ID",
    }),
    cell: cell.text(),
  }),

  col.accessor("bioparadigms_slc", {
    accessor: (row) => row.bioparadigms_slc,
    header: "BioParadigms SLC",
    description: tooltip({
      title: "BioParadigms SLC",
      description:
        "Symbol used to link to the SLC tables database at bioparadigms.org for the gene.",
    }),
    cell: cell.link(
      (val) => `https://slc.bioparadigms.org/protein?GeneName=${val}`,
    ),
  }),

  col.accessor("pseudogene_org", {
    accessor: (row) => row.pseudogene_org,
    header: "Pseudogene ORG",
    description: tooltip({
      title: "Pseudogene.org",
      description: "Pseudogene.org",
    }),
    cell: cell.text(),
  }),

  col.accessor("horde_id", {
    accessor: (row) => row.horde_id,
    header: "Horde ID",
    description: tooltip({
      title: "Horde ID",
      description: "Symbol used within HORDE for the gene",
    }),
    cell: cell.text(),
  }),

  col.accessor("merops", {
    accessor: (row) => row.merops,
    header: "Merops",
    description: tooltip({
      title: "Merops",
      description: "ID used to link to the MEROPS peptidase database",
    }),
    cell: cell.text(),
  }),

  col.accessor("imgt", {
    accessor: (row) => row.imgt,
    header: "IMGT",
    description: tooltip({
      title: "IMGT",
      description:
        "Symbol used within international ImMunoGeneTics information system",
    }),
    cell: cell.text(),
  }),

  col.accessor("iuphar", {
    accessor: (row) => row.iuphar,
    header: "IUPHAR",
    description: tooltip({
      title: "IUPHAR",
      description:
        "The objectId used to link to the IUPHAR/BPS Guide to PHARMACOLOGY database.",
    }),
    cell: cell.text(),
  }),

  col.accessor("kznf_gene_catalog", {
    accessor: (row) => row.kznf_gene_catalog,
    header: "KZNF Gene Catalog",
    description: tooltip({
      title: "KZNF Gene Catalog",
      description: "ID used to link to the Human KZNF Gene Catalog",
    }),
    cell: cell.text(),
  }),

  col.accessor("mamit_trnadb", {
    accessor: (row) => row.mamit_trnadb,
    header: "MAMIT TRNA DB",
    description: tooltip({
      title: "MAMIT TRNA DB",
      description: "ID to link to the Mamit-tRNA database",
    }),
    cell: cell.text(),
  }),

  col.accessor("cd", {
    accessor: "cd",
    header: "CD",
    description: tooltip({
      title: "CD",
      description:
        "Symbol used within the Human Cell Differentiation Molecule database for the gene",
    }),
    cell: cell.text(),
  }),

  col.accessor("lncrnadb", {
    accessor: (row) => row.lncrnadb,
    header: "LNCRNA DB",
    description: tooltip({
      title: "lncRNA Database ID",
      description: "lncRNA Database ID",
    }),
    cell: cell.text(),
  }),

  col.accessor("enzyme_id", {
    accessor: (row) => row.enzyme_id,
    header: "Enzyme ID",
    description: tooltip({
      title: "Enzyme ID",
      description: "ENZYME EC accession number",
    }),
    cell: cell.text(),
  }),

  col.accessor("intermediate_filament_db", {
    accessor: (row) => row.intermediate_filament_db,
    header: "Intermediate Filament DB",
    description: tooltip({
      title: "Intermediate Filament DB",
      description: "ID used to link to the Human Intermediate Filament Database",
    }),
    cell: cell.text(),
  }),

  col.accessor("rna_central_ids", {
    accessor: (row) => row.rna_central_ids,
    header: "RNA Central IDs",
    description: tooltip({
      title: "RNA Central IDs",
      description: "RNAcentral: The non-coding RNA sequence database",
    }),
    cell: cell.text(),
  }),

  col.accessor("lncipedia", {
    accessor: (row) => row.lncipedia,
    header: "LNCIpedia",
    description: tooltip({
      title: "LNCIpedia",
      description: "The LNCipedia ID to which the gene belongs.",
    }),
    cell: cell.text(),
  }),

  col.accessor("gtrnadb", {
    accessor: (row) => row.gtrnadb,
    header: "GTRNA DB",
    description: tooltip({
      title: "GTRNA DB",
      description:
        "GtRNAdb contains tRNA gene predictions made by tRNAscan-SE on complete or nearly complete genomes.",
    }),
    cell: cell.text(),
  }),

  col.accessor("gene_symbol", {
    accessor: "gene_symbol",
    header: "GWAS Catalog",
    description: tooltip({
      title: "GWAS Catalog",
      description:
        "The NHGRI-EBI Catalog of human genome-wide association studies",
    }),
    cell: cell.link((val) => `https://www.ebi.ac.uk/gwas/search?query=${val}`),
  }),
];

export const geneInfoAndIdsGroup = col.group(
  "info-and-ids",
  "Info and IDs",
  geneInfoAndIdsColumns,
);
