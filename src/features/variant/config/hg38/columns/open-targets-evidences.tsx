import { ExternalLink } from "@/components/ui/external-link";
import type { OpenTargetsEvidenceRow } from "@/features/variant/types/opentargets";
import {
  Badge,
  categories,
  cell,
  createColumns,
  tooltip,
} from "@/lib/table/column-builder";

const col = createColumns<OpenTargetsEvidenceRow>();

// Data source categories
const datasourceCategories = categories([
  {
    label: "OT Genetics",
    match: "ot_genetics_portal",
    color: "blue",
    description: "Open Targets Genetics Portal",
  },
  {
    label: "Gene Burden",
    match: "gene_burden",
    color: "violet",
    description: "Gene burden analysis from rare variant studies",
  },
  {
    label: "ClinVar",
    match: "eva",
    color: "red",
    description: "ClinVar clinical variant database",
  },
  {
    label: "ClinVar Somatic",
    match: "eva_somatic",
    color: "rose",
    description: "ClinVar somatic variant annotations",
  },
  {
    label: "Gene2Phenotype",
    match: "gene2phenotype",
    color: "emerald",
    description: "Gene2Phenotype database",
  },
  {
    label: "GEL",
    match: "genomics_england",
    color: "teal",
    description: "Genomics England PanelApp",
  },
  {
    label: "UniProt Lit",
    match: "uniprot_literature",
    color: "amber",
    description: "UniProt literature curation",
  },
  {
    label: "UniProt Var",
    match: "uniprot_variants",
    color: "orange",
    description: "UniProt variant annotations",
  },
  {
    label: "Orphanet",
    match: "orphanet",
    color: "purple",
    description: "Orphanet rare disease database",
  },
  {
    label: "ClinGen",
    match: "clingen",
    color: "cyan",
    description: "ClinGen clinical genome resource",
  },
]);

// Data type categories
const datatypeCategories = categories([
  {
    label: "Genetic Association",
    match: "genetic_association",
    color: "blue",
    description: "Evidence from genetic association studies",
  },
  {
    label: "Somatic Mutation",
    match: "somatic_mutation",
    color: "red",
    description: "Evidence from somatic mutation data",
  },
  {
    label: "Known Drug",
    match: "known_drug",
    color: "emerald",
    description: "Evidence from known drug mechanisms",
  },
  {
    label: "Literature",
    match: "literature",
    color: "amber",
    description: "Evidence from literature mining",
  },
  {
    label: "RNA Expression",
    match: "rna_expression",
    color: "violet",
    description: "Evidence from RNA expression data",
  },
  {
    label: "Animal Model",
    match: "animal_model",
    color: "teal",
    description: "Evidence from animal model studies",
  },
]);

export const openTargetsEvidencesColumns = [
  col.display("diseaseName", {
    header: "Disease",
    description: tooltip({
      title: "Disease Name",
      description: "Name of the associated disease or phenotype.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const name = row.original.diseaseName;
      const diseaseId = row.original.diseaseId;
      if (!name) return "-";
      const display = name.length > 50 ? `${name.slice(0, 50)}...` : name;
      return (
        <ExternalLink
          href={`https://platform.opentargets.org/disease/${diseaseId}`}
          title={name}
        >
          {display}
        </ExternalLink>
      );
    },
  }),

  col.display("targetSymbol", {
    header: "Target",
    description: tooltip({
      title: "Target Gene",
      description: "Gene symbol for the target associated with this evidence.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const symbol = row.original.targetSymbol;
      const targetId = row.original.targetId;
      if (!symbol) return "-";
      return (
        <ExternalLink
          href={`https://platform.opentargets.org/target/${targetId}`}
          className="font-medium"
        >
          {symbol}
        </ExternalLink>
      );
    },
  }),

  col.display("score", {
    header: "Score",
    description: tooltip({
      title: "Evidence Score",
      description:
        "Open Targets evidence score representing the strength of the target-disease association.",
      range: "[0, 1]",
      guides: [
        { threshold: "> 0.7", meaning: "Strong evidence" },
        { threshold: "0.4 - 0.7", meaning: "Moderate evidence" },
        { threshold: "< 0.4", meaning: "Weaker evidence" },
      ],
    }),
    cell: ({ row }) => {
      const score = row.original.score;
      const color = score > 0.7 ? "emerald" : score > 0.4 ? "amber" : "gray";
      return <Badge color={color}>{score.toFixed(3)}</Badge>;
    },
  }),

  col.display("datasourceId", {
    header: "Source",
    description: tooltip({
      title: "Data Source",
      description: "Database or resource providing this evidence.",
      categories: datasourceCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.datasourceId;
      const category = datasourceCategories.getCategory(val);
      const color = category?.color ?? "gray";
      const label = category?.label ?? val;
      return <Badge color={color}>{label}</Badge>;
    },
  }),

  col.display("datatypeId", {
    header: "Type",
    description: tooltip({
      title: "Evidence Type",
      description: "Category of evidence supporting the association.",
      categories: datatypeCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.datatypeId;
      const category = datatypeCategories.getCategory(val);
      const color = category?.color ?? "gray";
      const label = category?.label ?? val.replace(/_/g, " ");
      return <Badge color={color}>{label}</Badge>;
    },
  }),

  col.accessor("variantEffect", {
    accessor: "variantEffect",
    header: "Effect",
    description: tooltip({
      title: "Variant Effect",
      description: "Functional effect of the variant on the gene/protein.",
    }),
    cell: cell.text(),
  }),

  col.accessor("consequence", {
    accessor: "consequence",
    header: "Consequence",
    description: tooltip({
      title: "Molecular Consequence",
      description:
        "Sequence Ontology term describing the variant's molecular consequence.",
      citation: "Sequence Ontology",
    }),
    cell: cell.text(),
  }),

  col.display("therapeuticAreas", {
    header: "Therapeutic Areas",
    description: tooltip({
      title: "Therapeutic Areas",
      description: "Broad disease categories relevant to this evidence.",
    }),
    cell: ({ row }) => {
      const areas = row.original.therapeuticAreas;
      if (!areas || areas.length === 0) return "-";
      return (
        <div className="flex flex-wrap gap-1">
          {areas.slice(0, 2).map((area, i) => (
            <Badge key={i} color="purple">
              {area}
            </Badge>
          ))}
          {areas.length > 2 && (
            <span className="text-sm text-muted-foreground">
              +{areas.length - 2}
            </span>
          )}
        </div>
      );
    },
  }),
];
