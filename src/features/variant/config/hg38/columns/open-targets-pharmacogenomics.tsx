import { ExternalLink } from "@shared/components/ui/external-link";
import type { OpenTargetsPharmacogenomicsRow } from "@features/variant/types/opentargets";
import {
  Badge,
  categories,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<OpenTargetsPharmacogenomicsRow>();

// Evidence level categories (PharmGKB-style)
const evidenceLevelCategories = categories([
  {
    label: "1A",
    match: "1A",
    color: "emerald",
    description:
      "High-level evidence: CPIC/DPWG guidelines with strong support",
  },
  {
    label: "1B",
    match: "1B",
    color: "emerald",
    description:
      "High-level evidence: annotated by PharmGKB with strong support",
  },
  {
    label: "2A",
    match: "2A",
    color: "blue",
    description: "Moderate evidence: variants with functional significance",
  },
  {
    label: "2B",
    match: "2B",
    color: "blue",
    description: "Moderate evidence: moderate support for association",
  },
  {
    label: "3",
    match: "3",
    color: "amber",
    description: "Low-level evidence: annotation based on preliminary studies",
  },
  {
    label: "4",
    match: "4",
    color: "orange",
    description: "Preliminary evidence requiring further validation",
  },
]);

// PGx category types
const pgxCategoryCategories = categories([
  {
    label: "Efficacy",
    match: /efficacy/i,
    color: "emerald",
    description: "Drug efficacy or response",
  },
  {
    label: "Toxicity",
    match: /toxicity|adverse/i,
    color: "red",
    description: "Drug toxicity or adverse reactions",
  },
  {
    label: "Dosage",
    match: /dosage/i,
    color: "blue",
    description: "Drug dosage recommendations",
  },
  {
    label: "Metabolism",
    match: /metabolism/i,
    color: "violet",
    description: "Drug metabolism or pharmacokinetics",
  },
  {
    label: "Other",
    match: /.*/,
    color: "purple",
    description: "Other pharmacogenomic associations",
  },
]);

export const openTargetsPharmacogenomicsColumns = [
  col.display("drugName", {
    header: "Drug",
    description: tooltip({
      title: "Drug Name",
      description:
        "Name of the drug with pharmacogenomic association. Linked to Open Targets drug page when available.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const drugName = row.original.drugName;
      const drugId = row.original.drugId;
      if (!drugName || drugName === "Unknown") return "-";
      if (drugId) {
        return (
          <ExternalLink
            href={`https://platform.opentargets.org/drug/${drugId}`}
            className="font-medium"
          >
            {drugName}
          </ExternalLink>
        );
      }
      return <span className="font-medium">{drugName}</span>;
    },
  }),

  col.display("targetSymbol", {
    header: "Target",
    description: tooltip({
      title: "Drug Target",
      description: "Gene symbol for the drug target or pharmacogene.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const symbol = row.original.targetSymbol;
      const targetId = row.original.targetId;
      if (!symbol) return "-";
      if (targetId) {
        return (
          <ExternalLink
            href={`https://platform.opentargets.org/target/${targetId}`}
          >
            {symbol}
          </ExternalLink>
        );
      }
      return <span>{symbol}</span>;
    },
  }),

  col.display("pgxCategory", {
    header: "Category",
    description: tooltip({
      title: "PGx Category",
      description: "Category of pharmacogenomic association.",
      categories: pgxCategoryCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.pgxCategory;
      if (!val) return "-";
      const color = pgxCategoryCategories.getColor(val);
      return <Badge color={color}>{val}</Badge>;
    },
  }),

  col.display("evidenceLevel", {
    header: "Evidence",
    description: tooltip({
      title: "Evidence Level",
      description: "PharmGKB clinical annotation evidence level.",
      citation: "PharmGKB",
      categories: evidenceLevelCategories,
    }),
    cell: ({ row }) => {
      const val = row.original.evidenceLevel;
      if (!val) return "-";
      const color = evidenceLevelCategories.getColor(val.toUpperCase());
      return <Badge color={color}>Level {val}</Badge>;
    },
  }),

  col.display("phenotypeText", {
    header: "Phenotype",
    description: tooltip({
      title: "Phenotype",
      description:
        "Clinical phenotype or drug response associated with this variant-drug combination.",
    }),
    cell: ({ row }) => {
      const val = row.original.phenotypeText;
      if (!val) return "-";
      return val.length > 80 ? (
        <span title={val} className="cursor-help">
          {val.slice(0, 80)}...
        </span>
      ) : (
        <span>{val}</span>
      );
    },
  }),

  col.display("genotypeId", {
    header: "Genotype",
    description: tooltip({
      title: "Genotype ID",
      description:
        "Specific genotype configuration for this pharmacogenomic association.",
    }),
    cell: ({ row }) => {
      const val = row.original.genotypeId;
      return val ? <span className="font-mono text-sm">{val}</span> : "-";
    },
  }),

  col.display("isDirectTarget", {
    header: "Direct",
    description: tooltip({
      title: "Direct Target",
      description: "Whether the drug directly targets the gene product.",
    }),
    cell: ({ row }) => {
      const val = row.original.isDirectTarget;
      return (
        <Badge color={val ? "emerald" : "gray"}>{val ? "Yes" : "No"}</Badge>
      );
    },
  }),

  col.display("literature", {
    header: "Refs",
    description: tooltip({
      title: "Literature References",
      description:
        "PubMed references supporting this pharmacogenomic association.",
    }),
    cell: ({ row }) => {
      const refs = row.original.literature;
      if (!refs || refs.length === 0) return "-";
      return (
        <ExternalLink
          href={`https://pubmed.ncbi.nlm.nih.gov/${refs[0]}`}
          className="text-sm"
        >
          {refs.length} ref{refs.length > 1 ? "s" : ""}
        </ExternalLink>
      );
    },
  }),
];
