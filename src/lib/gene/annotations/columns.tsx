import type { ColumnsType } from "@/lib/annotations/types";
import { ExternalLink } from "@/components/ui/external-link";
import {
  splitText,
  cleanText,
  Round,
  safeCellRenderer,
  isValidString,
  isValidNumber,
} from "@/lib/annotations/helpers";

export const GENE_INFO_AND_IDS_COLUMNS: ColumnsType = {
  name: "Info and IDs",
  slug: "info-and-ids",
  items: [
    {
      key: 1,
      header: "Chromosome",
      accessor: "chr",
      tooltip: "Chromosome Number (from HGNC).",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => (
            <ExternalLink
              href={`https://www.ncbi.nlm.nih.gov/projects/homology/maps/human/chr${str}`}
            >
              {str}
            </ExternalLink>
          ),
          isValidString,
        );
      },
    },
    {
      key: 2,
      header: "Genomic Start Position",
      accessor: "genomic_position_start",
      tooltip: "Genomic Start Position.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <div>{num}</div>,
          isValidNumber,
        );
      },
    },
    {
      key: 3,
      header: "Genomic End Position",
      accessor: "genomic_position_end",
      tooltip: "Genomic End Position.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <div>{num}</div>,
          isValidNumber,
        );
      },
    },
    {
      key: 4,
      header: "Gene Description",
      accessor: "gene_description",
      tooltip: "Gene Description.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => <div>{str}</div>,
          isValidString,
        );
      },
    },
    {
      key: 5,
      header: "Gene Synonym",
      accessor: "gene_synonym",
      tooltip: "Gene Synonym.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => <div>{str}</div>,
          isValidString,
        );
      },
    },
    {
      key: 6,
      header: "Ensembl Gene",
      accessor: "ensembl_gene",
      tooltip: "Ensembl Gene Name (from HGNC).",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`http://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 7,
      header: "Uniprot Accession",
      accessor: "uniprot_acc_hgnc_uniprot",
      tooltip: "Uniprot accession number (from HGNC and Uniprot).",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://www.uniprot.org/uniprotkb/${value}/entry`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 8,
      header: "Uniprot ID",
      accessor: "uniprot_id_hgnc_uniprot",
      tooltip: "Uniprot ID (from HGNC and Uniprot)",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://www.uniprot.org/uniprotkb?query=${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 9,
      header: "CCDS ID",
      accessor: "ccds_id_x",
      tooltip: "CCDS ID (from HGNC).",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => (
            <ul>
              {str.split(";").map((item: string, index: number) => {
                if (item !== "") {
                  return (
                    <li className="py-1 capitalize" key={index}>
                      <ExternalLink
                        href={`https://www.ncbi.nlm.nih.gov/CCDS/CcdsBrowse.cgi?REQUEST=CCDS&GO=MainBrowse&DATA=${item}`}
                      >
                        {item}
                      </ExternalLink>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          ),
          isValidString,
        );
      },
    },
    {
      key: 10,
      header: "RefSeq ID",
      accessor: "refseq_id",
      tooltip: "Refseq ID (from HGNC).",
      Cell: (value) => {
        return (
          <ExternalLink href={`https://www.ncbi.nlm.nih.gov/nuccore/${value}`}>
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 11,
      header: "UCSC ID",
      accessor: "ucsc_id_x",
      tooltip: "UCSC ID (from HGNC).",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`http://genome.ucsc.edu/cgi-bin/hgGene?hgg_gene=${value}&org=human`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 12,
      header: "OMIM ID",
      accessor: "omim_id_x",
      tooltip: "OMIM ID (from HGNC).",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://www.omim.org/entry/${value}#:~:text=Entry%20%2D%20*107741%20%2D%20APOLIPOPROTEIN%20E%3B%20APOE%20%2D%20OMIM`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 13,
      header: "Cyto Band Location",
      accessor: "cyto_location",
      tooltip: "Cyto Location.",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`http://genome.ucsc.edu/cgi-bin/hgTracks?org=human&position=${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 14,
      header: "HGNC ID",
      accessor: "hgnc_id_x",
      tooltip: "HGNC ID",
      Cell: (value) => {
        return (
          <ExternalLink href={`https://www.alliancegenome.org/gene/${value}`}>
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 15,
      header: "Locus Group",
      accessor: "locus_group",
      tooltip: "Status",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => <span className="capitalize">{str}</span>,
          isValidString,
        );
      },
    },
    {
      key: 16,
      header: "Locus Type",
      accessor: "locus_type",
      tooltip: "Locus type",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => <span className="capitalize">{str}</span>,
          isValidString,
        );
      },
    },
    {
      key: 18,
      header: "Gene Family",
      accessor: "gene_family",
      tooltip: "Gene family",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => splitText(str, "|"),
          isValidString,
        );
      },
    },
    {
      key: 21,
      header: "Entrez ID",
      accessor: "entrez_id",
      tooltip: "Entrez ID",
      Cell: (value) => {
        return (
          <ExternalLink href={`https://www.ncbi.nlm.nih.gov/gene/${value}`}>
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 22,
      header: "Vega ID",
      accessor: "vega_id",
      tooltip: "Vega ID",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://vega.archive.ensembl.org/Homo_sapiens/Gene/Summary?g=${value};r=19:44905754-44909393`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 23,
      header: "European Nucleotide Archive",
      accessor: "ena",
      tooltip: "European Nucleotide Archive",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://www.ebi.ac.uk/ena/browser/view/${value};r=19:44905754-44909393`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 24,
      header: "Pubmed ID",
      accessor: "pubmed_id",
      tooltip: "Pubmed ID",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => (
            <ul>
              {str.split("|").map((item: string, index: number) => {
                if (item !== "") {
                  return (
                    <li className="py-1 capitalize" key={index}>
                      <ExternalLink
                        href={`https://pubmed.ncbi.nlm.nih.gov/${item}`}
                      >
                        {item}
                      </ExternalLink>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          ),
          isValidString,
        );
      },
    },
    {
      key: 25,
      header: "LSDB",
      accessor: "lsdb",
      tooltip:
        "The name of the Locus Specific Mutation Database and URL for the gene separated by a | character.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => {
            const items = str.split("|");
            const uniqueNames = new Set();
            return (
              <ul>
                {items.reduce(
                  (acc: JSX.Element[], item: string, index: number) => {
                    if (index % 2 !== 0) {
                      const url = item;
                      const name = items[index - 1];
                      const lowerCaseName = name?.toLowerCase();
                      if (!uniqueNames.has(lowerCaseName)) {
                        uniqueNames.add(lowerCaseName);
                        acc.push(
                          <li className="py-1 capitalize" key={index}>
                            <ExternalLink href={url}>{name}</ExternalLink>
                          </li>,
                        );
                      }
                    }
                    return acc;
                  },
                  [],
                )}
              </ul>
            );
          },
          isValidString,
        );
      },
    },
    {
      key: 26,
      header: "Cosmic",
      accessor: "cosmic",
      tooltip:
        "COSMIC (Symbol used within the Catalogue of somatic mutations in cancer for the gene)",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://cancer.sanger.ac.uk/cosmic/gene/analysis?ln=${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 27,
      header: "SNORNABase",
      accessor: "snornabase",
      tooltip: "snoRNABase ID",
    },
    {
      key: 28,
      header: "BioParadigms SLC",
      accessor: "bioparadigms_slc",
      tooltip:
        "Symbol used to link to the SLC tables database at bioparadigms.org for the gene.",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://slc.bioparadigms.org/protein?GeneName=${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 29,
      header: "Pseudogene ORG",
      accessor: "pseudogene_org",
      tooltip: "Pseudogene.org",
    },
    {
      key: 30,
      header: "Horde ID",
      accessor: "horde_id",
      tooltip: "Symbol used within HORDE for the gene",
    },
    {
      key: 31,
      header: "Merops",
      accessor: "merops",
      tooltip: "ID used to link to the MEROPS peptidase database",
    },
    {
      key: 32,
      header: "IMGT",
      accessor: "imgt",
      tooltip:
        "Symbol used within international ImMunoGeneTics information system",
    },
    {
      key: 33,
      header: "IUPHAR",
      accessor: "iuphar",
      tooltip:
        "The objectId used to link to the IUPHAR/BPS Guide to PHARMACOLOGY database.",
    },
    {
      key: 34,
      header: "KZNF Gene Catalog",
      accessor: "kznf_gene_catalog",
      tooltip: "ID used to link to the Human KZNF Gene Catalog",
    },
    {
      key: 35,
      header: "MAMIT TRNA DB",
      accessor: "mamit_trnadb",
      tooltip: "ID to link to the Mamit-tRNA database",
    },
    {
      key: 36,
      header: "CD",
      accessor: "cd",
      tooltip:
        "Symbol used within the Human Cell Differentiation Molecule database for the gene",
    },
    {
      key: 37,
      header: "LNCRNA DB",
      accessor: "lncrnadb",
      tooltip: "lncRNA Database ID",
    },
    {
      key: 38,
      header: "Enzyme ID",
      accessor: "enzyme_id",
      tooltip: "ENZYME EC accession number",
    },
    {
      key: 39,
      header: "Intermediate Filament DB",
      accessor: "intermediate_filament_db",
      tooltip: "ID used to link to the Human Intermediate Filament Database",
    },
    {
      key: 40,
      header: "RNA Central IDs",
      accessor: "rna_central_ids",
      tooltip: "RNAcentral: The non-coding RNA sequence database",
    },
    {
      key: 41,
      header: "LNCIpedia",
      accessor: "lncipedia",
      tooltip: "The LNCipedia ID to which the gene belongs.",
    },
    {
      key: 42,
      header: "GTRNA DB",
      accessor: "gtrnadb",
      tooltip:
        "GtRNAdb contains tRNA gene predictions made by tRNAscan-SE on complete or nearly complete genomes.",
    },
    {
      key: 43,
      header: "GWAS Catalog",
      accessor: "symbol",
      tooltip: "The NHGRI-EBI Catalog of human genome-wide association studies",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://www.ebi.ac.uk/gwas/search?query=${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
  ],
};

export const GENE_FUNCTION_COLUMNS: ColumnsType = {
  name: "Function",
  slug: "function",
  items: [
    {
      key: 1,
      header: "Function Description",
      accessor: "function_description",
      tooltip: "Function description of the gene (from Uniprot).",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => {
            const ecoRegex = /ECO:(\d+)/g;
            const pubmedRegex = /PubMed:(\d+)/g;

            const ecoIds: string[] = [];
            const pubmedIds: string[] = [];

            let match = ecoRegex.exec(str);
            while (match != null) {
              ecoIds.push(match[1]);
              match = ecoRegex.exec(str);
            }

            match = pubmedRegex.exec(str);
            while (match != null) {
              pubmedIds.push(match[1]);
              match = pubmedRegex.exec(str);
            }

            const description = cleanText(str);
            return (
              <div className="normal-case">
                {description.replace(/\s*\{ECO:[^}]+}\./g, "").trim()}
                <div className="grid grid-cols-2 pt-2">
                  <ul>
                    {ecoIds.map((item, index) => {
                      return (
                        <li key={index}>
                          <ExternalLink
                            href={`https://www.ebi.ac.uk/QuickGO/term/ECO:${item}`}
                          >
                            ECO:{item}
                          </ExternalLink>
                        </li>
                      );
                    })}
                  </ul>

                  <ul>
                    {pubmedIds.map((item, index) => {
                      return (
                        <li key={index}>
                          <ExternalLink
                            href={`https://pubmed.ncbi.nlm.nih.gov/${item}`}
                          >
                            PubMed:{item}
                          </ExternalLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          },
          isValidString,
        );
      },
    },
    {
      key: 2,
      header: "Pathway Uniprot",
      accessor: "pathway_uniprot",
      tooltip: "Pathway description from Uniprot.",
    },
    {
      key: 3,
      header: "BioCarta",
      accessor: "pathway_bio_carta_full",
      tooltip:
        "Full name(s) of the Pathway(s) the gene belongs to (from BioCarta).",
    },
    {
      key: 4,
      header: "Pathway KEGG ID",
      accessor: "pathway_kegg_id",
      tooltip: "ID(s) of the Pathway(s) the gene belongs to (from KEGG).",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => (
            <ul>
              {str.split(";").map((item, index) => {
                if (item !== "") {
                  return (
                    <li className="py-1 capitalize" key={index}>
                      <ExternalLink
                        href={`https://www.genome.jp/pathway/${item}`}
                      >
                        {item}
                      </ExternalLink>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          ),
          isValidString,
        );
      },
    },
    {
      key: 5,
      header: "Pathway KEGG Full",
      accessor: "pathway_kegg_full",
      tooltip:
        "Full name(s) of the Pathway(s) the gene belongs to (from KEGG).",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => splitText(str, ";"),
          isValidString,
        );
      },
    },
    {
      key: 6,
      header: "ConsensusPathDB",
      accessor: "pathway_consensus_path_db",
      tooltip: "Pathway(s) the gene belongs to (from ConsensusPathDB).",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => splitText(str, ";"),
          isValidString,
        );
      },
    },
    {
      key: 7,
      header: "Protein Class",
      accessor: "protein_class",
      tooltip: "Protein Class.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => splitText(str, ","),
          isValidString,
        );
      },
    },
    {
      key: 8,
      header: "HPA Evidence",
      accessor: "hpa_evidence",
      tooltip: "HPA evidence",
    },
    {
      key: 9,
      header: "Subcellular Location",
      accessor: "subcellular_location",
      tooltip: "Subcellular Location",
    },
    {
      key: 10,
      header: "Secretome Location",
      accessor: "secretome_location",
      tooltip: "Secretome Location",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => (
            <ul>
              {str.split(",").map((item, index) => {
                return (
                  <li key={index} className="capitalize">
                    {item}
                  </li>
                );
              })}
            </ul>
          ),
          isValidString,
        );
      },
    },
  ],
};

export const GENE_HUMAN_PHENOTYPE_COLUMNS: ColumnsType = {
  name: "Human Phenotypes",
  slug: "human-phenotype",
  items: [
    {
      key: 1,
      header: "MIM Disease",
      accessor: "mim_disease",
      tooltip: "MIM Disease",
      Cell: (value) => {
        if (typeof value === "string") {
          return (
            <ul>
              {value.split(";").map((item: any, index: number) => {
                return (
                  <li className="py-1 capitalize" key={index}>
                    {item.replace(/\[.*?\]/g, "")}
                  </li>
                );
              })}
            </ul>
          );
        }
      },
    },
    {
      key: 2,
      header: "MIM Phenotype ID",
      accessor: "mim_disease",
      tooltip: "mim_phenotype_id",
      Cell: (value) => {
        if (typeof value === "string") {
          const pattern = /\[MIM:(\d+)\]/g;
          const matches = value.matchAll(pattern);
          const mimIds = Array.from(matches).map((match) => match[1]);
          return (
            <ul>
              {mimIds.map((item: any, index: number) => {
                return (
                  <li className="py-1 capitalize" key={index}>
                    <ExternalLink href={`https://www.omim.org/entry/${item}`}>
                      {item}
                    </ExternalLink>
                  </li>
                );
              })}
            </ul>
          );
        }
      },
    },
    {
      key: 3,
      header: "Inheritance",
      accessor: "inheritance",
      tooltip: "Inheritance",
      Cell: (value) => {
        if (value) {
          return <span className="capitalize">{value}</span>;
        } else {
          return <span className="capitalize">N/A</span>;
        }
      },
    },
    {
      key: 4,
      header: "Pheno Key",
      accessor: "pheno_key",
      tooltip: "Pheno Key",
      Cell: (value) => {
        const phenoKey: {
          [key: string]: string;
        } = {
          1: "The disorder has been placed on the map based on its association with a gene, but the underlying defect is not known.",
          2: "The disorder has been placed on the map by linkage; no mutation has been found.",
          3: "The molecular basis for the disorder is known, a mutation has been found in the gene.",
          4: "A contiguous gene deletion or duplication syndrome; multiple genes are deleted or duplicated causing the phenotype.",
        };

        if (typeof value === "string") {
          return (
            <ul>
              {value.split(";").map((item: any, index: number) => {
                if (item !== "") {
                  return (
                    <li className="py-1" key={index}>
                      {phenoKey[item]}
                    </li>
                  );
                }
              })}
            </ul>
          );
        }
      },
    },
    {
      key: 5,
      header: "Phenotypes",
      accessor: "pheno",
      tooltip: "Pheno",
    },
    {
      key: 6,
      header: "Orphanet Disorder",
      accessor: "orphanet_disorder",
      tooltip: "Disorder name from Orphanet",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => splitText(str, ";"),
          isValidString,
        );
      },
    },
  ],
};

export const GENE_ANIMAL_PHENOTYPE_COLUMNS: ColumnsType = {
  name: "Animal Phenotypes",
  slug: "animal-phenotype",
  items: [
    {
      key: 1,
      header: "MGI Mouse Gene",
      accessor: "mgi_mouse_gene",
      tooltip: "Homolog mouse gene name from MGI",
    },
    {
      key: 2,
      header: "MGI ID",
      accessor: "mgd_id",
      tooltip: "MGD (Mouse Genome Database) ID",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://www.informatics.jax.org/marker/${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 3,
      header: "MGI Mouse Phenotype",
      accessor: "mgi_mouse_phenotype",
      tooltip: "Phenotype description for the homolog mouse gene from MGI",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => {
            const uniqueItems = Array.from(new Set(str.split(";"))).filter(
              (item) => item !== "",
            );
            const itemsWithParentheses = uniqueItems.filter((item) =>
              item.includes("("),
            );

            return (
              <ul>
                {itemsWithParentheses.map((item, index) => (
                  <li className="py-1 capitalize" key={index}>
                    {item}
                  </li>
                ))}
              </ul>
            );
          },
          isValidString,
        );
      },
    },
    {
      key: 4,
      header: "RGD ID",
      accessor: "rgd_id",
      tooltip: "RGD (Rat Genome Database) ID",
      Cell: (value) => {
        return (
          <ExternalLink
            href={`https://rgd.mcw.edu/rgdweb/report/gene/main.html?id=${value}`}
          >
            {value}
          </ExternalLink>
        );
      },
    },
    {
      key: 5,
      header: "ZFIN Zebrafish Gene",
      accessor: "zfin_zebrafish_gene",
      tooltip: "Homolog zebrafish gene name from ZFIN",
      Cell: (value) => {
        return (
          <ExternalLink href={`https://zfin.org/search?q=${value}`}>
            <span className="capitalize">{value}</span>
          </ExternalLink>
        );
      },
    },
    {
      key: 6,
      header: "ZFIN Zebrafish Structure",
      accessor: "zfin_zebrafish_structure",
      tooltip: "Affected structure of the homolog zebrafish gene from ZFIN",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => <span className="capitalize">{str}</span>,
          isValidString,
        );
      },
    },
    {
      key: 7,
      header: "ZFIN Zebrafish Phenotype Quality",
      accessor: "zfin_zebrafish_phenotype_quality",
      tooltip: "Phenotype description for the homolog zebrafish gene from ZFIN",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => <span className="capitalize">{str}</span>,
          isValidString,
        );
      },
    },
    {
      key: 8,
      header: "ZFIN Zebrafish Phenotype Tag",
      accessor: "zfin_zebrafish_phenotype_tag",
      tooltip: "Phenotype tag for the homolog zebrafish gene from ZFIN",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => <span className="capitalize">{str}</span>,
          isValidString,
        );
      },
    },
  ],
};

export const GENE_EXPRESSION_COLUMNS: ColumnsType = {
  name: "Expression",
  slug: "expression",
  items: [
    {
      key: 1,
      header: "Adipose Subcutaneous",
      accessor: "adipose_subcutaneous",
      tooltip: "Adipose Subcutaneous",
    },
    {
      key: 2,
      header: "Adipose Visceral Omentum",
      accessor: "adipose_visceral_omentum",
      tooltip: "Adipose Visceral Omentum",
    },
    {
      key: 3,
      header: "Adrenal Gland",
      accessor: "adrenal_gland",
      tooltip: "Adrenal Gland",
    },
    {
      key: 4,
      header: "Artery Aorta",
      accessor: "artery_aorta",
      tooltip: "Artery Aorta",
    },
    {
      key: 5,
      header: "Artery Coronary",
      accessor: "artery_coronary",
      tooltip: "Artery Coronary",
    },
    {
      key: 6,
      header: "Artery Tibial",
      accessor: "artery_tibial",
      tooltip: "Artery Tibial",
    },
    {
      key: 7,
      header: "Bladder",
      accessor: "bladder",
      tooltip: "Bladder",
    },
    {
      key: 8,
      header: "Brain Amygdala",
      accessor: "brain_amygdala",
      tooltip: "Brain Amygdala",
    },
    {
      key: 9,
      header: "Brain Anterior Cingulate Cortex BA24",
      accessor: "brain_anterior_cingulate_cortex_ba24",
      tooltip: "Brain Anterior Cingulate Cortex BA24",
    },
    {
      key: 10,
      header: "Brain Caudate Basal Ganglia",
      accessor: "brain_caudate_basal_ganglia",
      tooltip: "Brain Caudate Basal Ganglia",
    },
    {
      key: 11,
      header: "Brain Cerebellar Hemisphere",
      accessor: "brain_cerebellar_hemisphere",
      tooltip: "Brain Cerebellar Hemisphere",
    },
    {
      key: 12,
      header: "Brain Cerebellum",
      accessor: "brain_cerebellum",
      tooltip: "Brain Cerebellum",
    },
    {
      key: 13,
      header: "Brain Cortex",
      accessor: "brain_cortex",
      tooltip: "Brain Cortex",
    },
    {
      key: 14,
      header: "Brain Frontal Cortex BA9",
      accessor: "brain_frontal_cortex_ba9",
      tooltip: "Brain Frontal Cortex BA9",
    },
    {
      key: 15,
      header: "Brain Hippocampus",
      accessor: "brain_hippocampus",
      tooltip: "Brain Hippocampus",
    },
    {
      key: 16,
      header: "Brain Hypothalamus",
      accessor: "brain_hypothalamus",
      tooltip: "Brain Hypothalamus",
    },
    {
      key: 17,
      header: "Brain Nucleus Accumbens Basal Ganglia",
      accessor: "brain_nucleus_accumbens_basal_ganglia",
      tooltip: "Brain Nucleus Accumbens Basal Ganglia",
    },
    {
      key: 18,
      header: "Brain Putamen Basal Ganglia",
      accessor: "brain_putamen_basal_ganglia",
      tooltip: "Brain Putamen Basal Ganglia",
    },
    {
      key: 19,
      header: "Brain Spinal Cord Cervical C-1",
      accessor: "brain_spinal_cord_cervical_c-1",
      tooltip: "Brain Spinal Cord Cervical C-1",
    },
    {
      key: 20,
      header: "Brain Substantia Nigra",
      accessor: "brain_substantia_nigra",
      tooltip: "brain_substantia_nigra",
    },
    {
      key: 21,
      header: "Breast Mammary Tissue",
      accessor: "breast_mammary_tissue",
      tooltip: "Breast Mammary Tissue",
    },
    {
      key: 22,
      header: "Cells Cultured Fibroblasts",
      accessor: "cells_cultured_fibroblasts",
      tooltip: "Cells Cultured Fibroblasts",
    },
    {
      key: 23,
      header: "Cells EBV Transformed Lymphocytes",
      accessor: "cells_ebv_transformed_lymphocytes",
      tooltip: "Cells EBV Transformed Lymphocytes",
    },
    {
      key: 24,
      header: "Cervix Ectocervix",
      accessor: "cervix_ectocervix",
      tooltip: "Cervix Ectocervix",
    },
    {
      key: 25,
      header: "Cervix Endocervix",
      accessor: "cervix_endocervix",
      tooltip: "Cervix Endocervix",
    },
    {
      key: 26,
      header: "Colon Sigmoid",
      accessor: "colon_sigmoid",
      tooltip: "Colon Sigmoid",
    },
    {
      key: 27,
      header: "Colon Transverse",
      accessor: "colon_transverse",
      tooltip: "Colon Transverse",
    },
    {
      key: 28,
      header: "Esophagus Gastroesophageal Junction",
      accessor: "esophagus_gastroesophageal_junction",
      tooltip: "Esophagus Gastroesophageal Junction",
    },
    {
      key: 29,
      header: "Esophagus Mucosa",
      accessor: "esophagus_mucosa",
      tooltip: "Esophagus Mucosa",
    },
    {
      key: 30,
      header: "Esophagus Muscularis",
      accessor: "esophagus_muscularis",
      tooltip: "Esophagus Muscularis",
    },
    {
      key: 31,
      header: "Fallopian Tube",
      accessor: "fallopian_tube",
      tooltip: "Fallopian Tube",
    },
    {
      key: 32,
      header: "Heart Atrial Appendage",
      accessor: "heart_atrial_appendage",
      tooltip: "Heart Atrial Appendage",
    },
    {
      key: 33,
      header: "Heart Left Ventricle",
      accessor: "heart_left_ventricle",
      tooltip: "Heart Left Ventricle",
    },
    {
      key: 34,
      header: "Kidney Cortex",
      accessor: "kidney_cortex",
      tooltip: "Kidney Cortex",
    },

    {
      key: 37,
      header: "Lung",
      accessor: "lung",
      tooltip: "Lung",
    },
    {
      key: 38,
      header: "Minor Salivary Gland",
      accessor: "minor_salivary_gland",
      tooltip: "Minor Salivary Gland",
    },
    {
      key: 39,
      header: "Skeletal Muscle",
      accessor: "muscle_skeletal",
      tooltip: "Skeletal Muscle",
    },
    {
      key: 40,
      header: "Tibial Nerve",
      accessor: "nerve_tibial",
      tooltip: "Tibial Nerve",
    },
    {
      key: 41,
      header: "Ovary",
      accessor: "ovary",
      tooltip: "Ovary",
    },
    {
      key: 42,
      header: "Pancreas",
      accessor: "pancreas",
      tooltip: "Pancreas",
    },
    {
      key: 43,
      header: "Pituitary",
      accessor: "pituitary",
      tooltip: "Pituitary",
    },
    {
      key: 44,
      header: "Prostate",
      accessor: "prostate",
      tooltip: "Prostate",
    },
    {
      key: 45,
      header: "Suprapubic Skin (Not Sun Exposed)",
      accessor: "skin_not_sun_exposed_suprapubic",
      tooltip: "Suprapubic Skin (Not Sun Exposed)",
    },
    {
      key: 46,
      header: "Lower Leg Skin (Sun Exposed)",
      accessor: "skin_sun_exposed_lower_leg",
      tooltip: "Lower Leg Skin (Sun Exposed)",
    },
    {
      key: 47,
      header: "Terminal Ileum (Small Intestine)",
      accessor: "small_intestine_terminal_ileum",
      tooltip: "Terminal Ileum (Small Intestine)",
    },
    {
      key: 48,
      header: "Spleen",
      accessor: "spleen",
      tooltip: "Spleen",
    },
    {
      key: 49,
      header: "Stomach",
      accessor: "stomach",
      tooltip: "Stomach",
    },
    {
      key: 50,
      header: "Testis",
      accessor: "testis",
      tooltip: "Testis",
    },
    {
      key: 51,
      header: "Thyroid",
      accessor: "thyroid",
      tooltip: "Thyroid",
    },
    {
      key: 52,
      header: "Uterus",
      accessor: "uterus",
      tooltip: "Uterus",
    },
    {
      key: 53,
      header: "Vagina",
      accessor: "vagina",
      tooltip: "Vagina",
    },
    {
      key: 54,
      header: "Whole Blood",
      accessor: "whole_blood",
      tooltip: "Whole Blood",
    },
  ],
};

export const GENE_PROTEIN_INTERACTIONS_COLUMNS: ColumnsType = {
  name: "Protein-Protein Interactions",
  slug: "protein-protein-interactions",
  items: [
    {
      key: 1,
      header: "IntAct Interactions",
      accessor: "interactions_int_act",
      tooltip: "IntAct protein interaction data",
    },
    {
      key: 2,
      header: "BioGRID Interactions",
      accessor: "interactions_bio_grid",
      tooltip: "BioGRID protein interaction data",
    },
    {
      key: 3,
      header: "ConsensusPathDB Interactions",
      accessor: "interactions_consensus_path_db",
      tooltip: "ConsensusPathDB interaction data",
    },
  ],
};

export const GENE_PATHWAYS_COLUMNS: ColumnsType = {
  name: "Pathways",
  slug: "pathways",
  items: [
    {
      key: 1,
      header: "KEGG Pathways",
      accessor: "pathway_kegg_full",
      tooltip: "KEGG pathway annotations",
    },
    {
      key: 2,
      header: "BioCarta Pathways",
      accessor: "pathway_bio_carta_full",
      tooltip: "BioCarta pathway annotations",
    },
    {
      key: 3,
      header: "UniProt Pathways",
      accessor: "pathway_uniprot",
      tooltip: "UniProt pathway annotations",
    },
    {
      key: 4,
      header: "ConsensusPathDB",
      accessor: "pathway_consensus_path_db",
      tooltip: "ConsensusPathDB pathway annotations",
    },
  ],
};

export const GENE_CONSTRAINTS_COLUMNS: ColumnsType = {
  name: "Constraints and Heplo",
  slug: "constraints-and-heplo",
  items: [
    {
      key: 1,
      header: "P HI",
      accessor: "p_hi",
      tooltip:
        "Estimated probability of haploinsufficiency of the gene (from doi:10.1371/journal.pgen.1001154)",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 2,
      header: "HI Pred Score",
      accessor: "hi_pred_score",
      tooltip:
        "Estimated probability of haploinsufficiency of the gene (from doi:10.1093/bioinformatics/btx028)",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 3,
      header: "HI Pred",
      accessor: "hi_pred",
      tooltip:
        "HIPred prediction of haploinsufficiency of the gene. Y(es) or N(o). (from doi:10.1093/bioinformatics/btx028)",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (str) => {
            if (str === "Y") {
              return (
                <span className="inline-flex rounded-full bg-green-500 px-2 py-1 text-center text-sm font-medium leading-5 text-white">
                  Yes
                </span>
              );
            } else if (str === "N") {
              return (
                <span className="inline-flex rounded-full bg-red-500 px-2 py-1 text-center text-sm font-medium leading-5 text-white">
                  No
                </span>
              );
            } else {
              return <div>{str}</div>;
            }
          },
          isValidString,
        );
      },
    },
    {
      key: 6,
      header: "RVIS EVS",
      accessor: "rvis_evs",
      tooltip:
        "Residual Variation Intolerance Score, a measure of intolerance of mutational burden, the higher the score the more tolerant to mutational burden the gene is. Based on EVS (ESP6500) data. from doi:10.1371/journal.pgen.1003709",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 7,
      header: "RVIS Percentile EVS",
      accessor: "rvis_percentile_evs",
      tooltip:
        "The percentile rank of the gene based on RVIS, the higher the percentile the more tolerant to mutational burden the gene is. Based on EVS (ESP6500) data.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 8,
      header: "RVIS ExAC",
      accessor: "rvis_ex_ac",
      tooltip:
        "ExAC-based RVIS; setting 'common' MAF filter at 0.05% in at least one of the six individual ethnic strata from ExAC. cited from RVIS document.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 9,
      header: "RVIS Percentile ExAC",
      accessor: "rvis_percentile_ex_ac",
      tooltip:
        "Genome-Wide percentile for the new ExAC-based RVIS; setting 'common' MAF filter at 0.05% in at least one of the six individual ethnic strata from ExAC. cited from RVIS document.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 4,
      header: "LoF Tool Score",
      accessor: "lo_ftool_score",
      tooltip:
        "A percentile score for gene intolerance to functional change. The lower the score the higher gene intolerance to functional change. For details see doi: 10.1093/bioinformatics/btv602.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 5,
      header: "LoF FDR ExAC",
      accessor: "lo_f_fdr_ex_ac",
      tooltip:
        "A gene's corresponding FDR p-value for preferential LoF depletion among the ExAC population. Lower FDR corresponds with genes that are increasingly depleted of LoF variants. cited from RVIS document.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 12,
      header: "GNOMAD P LI",
      accessor: "gnom_ad_p_li",
      tooltip:
        "The probability of being loss-of-function intolerant (intolerant of both heterozygous and  homozygous lof variants) based on gnomAD 2.1 data",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <div>{Round(num)}</div>,
          isValidNumber,
        );
      },
    },
    {
      key: 13,
      header: "GNOMAD P Rec",
      accessor: "gnom_ad_p_rec",
      tooltip:
        "The probability of being intolerant of homozygous, but not heterozygous lof variants based on gnomAD 2.1 data",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <div>{Round(num)}</div>,
          isValidNumber,
        );
      },
    },
    {
      key: 14,
      header: "GNOMAD P Null",
      accessor: "gnom_ad_p_null",
      tooltip:
        "The probability of being tolerant of both heterozygous and homozygous lof variants based on gnomAD 2.1 data",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <div>{Round(num)}</div>,
          isValidNumber,
        );
      },
    },
    {
      key: 10,
      header: "GHIS",
      accessor: "ghis",
      tooltip:
        "A score predicting the gene haploinsufficiency. The higher the score the more likely the gene is haploinsufficient. (from doi: 10.1093/nar/gkv474)",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 11,
      header: "P Rec",
      accessor: "p_rec",
      tooltip:
        "Estimated probability that gene is a recessive disease gene (from DOI:10.1126/science.1215040)",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 12,
      header: "GDI",
      accessor: "gdi",
      tooltip:
        'GDI: gene damage index score, "a genome-wide, gene-level metric of the mutational damage that has accumulated in the general population" from doi: 10.1073/pnas.1518646112. The higher the score the less likely the gene is to be responsible for monogenic diseases.',
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 13,
      header: "GDI PHRED",
      accessor: "gdi_phred",
      tooltip:
        "Phred-scaled GDI scores Gene damage prediction (all disease-causing genes): gene damage prediction (low/medium/high) by GDI for all diseases",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 14,
      header: "S Het",
      accessor: "s_het",
      tooltip: "S Het: posterior estimate of heterozygous selection",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 15,
      header: "Haplo Insufficiency",
      accessor: "phaplo",
      tooltip:
        "pHaplo: posterior probability of being under haploinsufficiency. In this study, we aimed to quantify the properties of haploinsufficiency (i.e., deletion intolerance) and triplosensitivity (i.e., duplication intolerance) throughout the human genome. We harmonized and meta-analyzed rCNVs from nearly one million individuals to construct a genome-wide catalog of dosage sensitivity across 54 disorders, which defined 163 dosage sensitive segments associated with at least one disorder. These segments were typically gene dense and often harbored dominant dosage sensitive driver genes, which we were able to prioritize using statistical fine-mapping. Finally, we designed an ensemble machine-learning model to predict probabilities of dosage sensitivity (pHaplo & pTriplo) for all autosomal genes.",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
    {
      key: 16,
      header: "Triplo Sensitivity",
      accessor: "ptriplo",
      tooltip:
        "pTriplo: posterior probability of being under triplosensitivity. In this study, we aimed to quantify the properties of haploinsufficiency (i.e., deletion intolerance) and triplosensitivity (i.e., duplication intolerance) throughout the human genome. We harmonized and meta-analyzed rCNVs from nearly one million individuals to construct a genome-wide catalog of dosage sensitivity across 54 disorders, which defined 163 dosage sensitive segments associated with at least one disorder. These segments were typically gene dense and often harbored dominant dosage sensitive driver genes, which we were able to prioritize using statistical fine-mapping. Finally, we designed an ensemble machine-learning model to predict probabilities of dosage sensitivity (pHaplo & pTriplo) for all autosomal genes",
      Cell: (value) => {
        return safeCellRenderer(
          value,
          (num) => <span>{Round(num)}</span>,
          isValidNumber,
        );
      },
    },
  ],
};

export const GENE_COLUMNS_MAP: Record<string, ColumnsType> = {
  "info-and-ids": GENE_INFO_AND_IDS_COLUMNS,
  function: GENE_FUNCTION_COLUMNS,
  "human-phenotype": GENE_HUMAN_PHENOTYPE_COLUMNS,
  "animal-phenotype": GENE_ANIMAL_PHENOTYPE_COLUMNS,
  expression: GENE_EXPRESSION_COLUMNS,
  "protein-protein-interactions": GENE_PROTEIN_INTERACTIONS_COLUMNS,
  pathways: GENE_PATHWAYS_COLUMNS,
  "constraints-and-heplo": GENE_CONSTRAINTS_COLUMNS,
};
