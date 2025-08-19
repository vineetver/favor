import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ExternalLink } from "@/components/ui/external-link";
import type { GWAS } from "./api";
import type { ProcessedGwasData } from "./types";
import { useMemo } from "react";

const formatPValue = (value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toExponential(2);
};

const formatFrequency = (value: string): string => {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(3);
};

const PValueCell = ({ value }: { value: string }) => {
  const { formattedValue, isSignificant } = useMemo(() => {
    const pValue = parseFloat(value);
    return {
      formattedValue: formatPValue(value),
      isSignificant: pValue < 5e-8
    };
  }, [value]);

  return (
    <div className={`font-mono text-left ${isSignificant ? "text-red-600 font-semibold" : "text-foreground"}`}>
      {formattedValue}
      {isSignificant && <span className="ml-1 text-xs">***</span>}
    </div>
  );
};


const EffectSizeCell = ({ value }: { value: string | null }) => {
  const { formattedValue, colorClass, isHighEffect } = useMemo(() => {
    if (!value) return { formattedValue: "—", colorClass: "text-muted-foreground text-left", isHighEffect: false };
    
    const numValue = parseFloat(value);
    const isProtective = numValue < 1;
    const isRisk = numValue > 1;
    const isHighEffect = Math.abs(Math.log(numValue)) > 0.693; // |log(OR)| > 0.693 (OR < 0.5 or OR > 2)
    
    return {
      formattedValue: numValue.toFixed(3),
      colorClass: `font-mono text-left ${isProtective ? "text-blue-600" : isRisk ? "text-orange-600" : ""}`,
      isHighEffect
    };
  }, [value]);

  return (
    <div className={`${colorClass} flex items-center gap-1`}>
      {formattedValue}
      {isHighEffect && (
        <svg width="10" height="10" viewBox="0 0 12 12" className="text-current">
          <path
            d="M2,10 L6,2 L10,10 Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      )}
    </div>
  );
};

const AlleleFreqCell = ({ value }: { value: string }) => {
  const { formattedValue, colorClass, isVeryRare } = useMemo(() => {
    const freq = parseFloat(value);
    const isRare = freq < 0.05;
    const isCommon = freq > 0.5;
    const isVeryRare = freq < 0.01;
    
    return {
      formattedValue: formatFrequency(value),
      colorClass: `font-mono text-left ${isRare ? "text-purple-600" : isCommon ? "text-green-600" : ""}`,
      isVeryRare
    };
  }, [value]);

  return (
    <div className={`${colorClass} flex items-center gap-1`}>
      {formattedValue}
      {isVeryRare && (
        <svg width="10" height="10" viewBox="0 0 12 12" className="text-purple-600">
          <path
            d="M2,10 L6,2 L10,10 Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      )}
    </div>
  );
};

const GeneCell = ({ gene }: { gene: string }) => {
  const geneData = useMemo(() => {
    const genes = gene?.split(',').map(g => g.trim()) || [];
    return { genes, hasMultiple: genes.length > 1 };
  }, [gene]);

  return (
    <div>
      {geneData.genes.length === 1 ? (
        <span className="font-semibold text-blue-700">{geneData.genes[0]}</span>
      ) : geneData.hasMultiple ? (
        <div className="space-y-1">
          <span className="font-semibold text-blue-700">{geneData.genes[0]}</span>
          <div className="text-xs text-muted-foreground">
            +{geneData.genes.length - 1} more
          </div>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
};

const StudyCell = ({ author }: { author: string }) => {
  const lastName = useMemo(() => {
    return author?.split(' ').pop() || author;
  }, [author]);

  return (
    <div className="text-sm text-left">
      <div className="font-medium" title={author}>
        {lastName}
      </div>
    </div>
  );
};

export const gwasColumns: ColumnDef<GWAS | ProcessedGwasData>[] = [
  {
    accessorKey: "gwas_disease_trait",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Trait" 
        tooltip="Disease or phenotypic trait associated with this genetic variant"
        sortable={false}
      />
    ),
    cell: ({ row }) => (
      <div
        className="leading-tight text-left whitespace-normal"
        title={row.getValue("gwas_disease_trait")}
      >
        {row.getValue("gwas_disease_trait")}
      </div>
    ),
    size: 200,
  },
  {
    accessorKey: "gwas_p_value",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="P-value" 
        tooltip="Statistical significance of association (values < 5×10⁻⁸ are genome-wide significant)"
      />
    ),
    cell: ({ row }) => <PValueCell value={row.getValue("gwas_p_value") as string} />,
    size: 120,
    sortingFn: (rowA, rowB) => {
      const a = parseFloat(rowA.getValue("gwas_p_value") as string);
      const b = parseFloat(rowB.getValue("gwas_p_value") as string);
      return a - b;
    },
  },
  {
    accessorKey: "gwas_or_or_beta",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Effect Size" 
        tooltip="Odds Ratio (OR) for binary traits or Beta coefficient for quantitative traits"
      />
    ),
    cell: ({ row }) => <EffectSizeCell value={row.getValue("gwas_or_or_beta") as string | null} />,
    size: 90,
    sortingFn: (rowA, rowB) => {
      const valueA = rowA.getValue("gwas_or_or_beta") as string | null;
      const valueB = rowB.getValue("gwas_or_or_beta") as string | null;
      
      if (!valueA && !valueB) return 0;
      if (!valueA) return 1;
      if (!valueB) return -1;
      
      const a = parseFloat(valueA);
      const b = parseFloat(valueB);
      return Math.abs(Math.log(b)) - Math.abs(Math.log(a)); // Sort by effect magnitude
    },
    enableSorting: true,
  },
  {
    accessorKey: "gwas_95_ci_text",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="95% CI" 
        tooltip="95% confidence interval for the effect size estimate"
        sortable={false}
      />
    ),
    cell: ({ row }) => {
      const value = row.getValue("gwas_95_ci_text") as string | null;
      return (
        <div className="font-mono text-left text-sm">
          {value || "—"}
        </div>
      );
    },
    size: 110,
  },
  {
    accessorKey: "gwas_risk_allele_frequency",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Allele Freq" 
        tooltip="Frequency of the risk allele in the study population (0.0-1.0)"
      />
    ),
    cell: ({ row }) => <AlleleFreqCell value={row.getValue("gwas_risk_allele_frequency") as string} />,
    size: 80,
    sortingFn: (rowA, rowB) => {
      const a = parseFloat(rowA.getValue("gwas_risk_allele_frequency") as string);
      const b = parseFloat(rowB.getValue("gwas_risk_allele_frequency") as string);
      return a - b;
    },
    enableSorting: true,
  },
  {
    accessorKey: "gwas_strongest_snp_risk_allele",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Risk Allele" 
        tooltip="The allele associated with increased risk or trait value"
        sortable={false}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-left bg-muted/50 rounded px-2 py-1 inline-block">
        {row.getValue("gwas_strongest_snp_risk_allele")}
      </div>
    ),
    size: 80,
  },
  {
    accessorKey: "gwas_first_author",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Study" 
        tooltip="First author and lead of the GWAS study"
        sortable={false}
      />
    ),
    cell: ({ row }) => <StudyCell author={row.getValue("gwas_first_author") as string} />,
    size: 80,
  },
  {
    accessorKey: "gwas_pubmedid",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Publication" 
        tooltip="Link to the original research publication in PubMed"
        sortable={false}
      />
    ),
    cell: ({ row }) => {
      const pubmedId = row.getValue("gwas_pubmedid") as string;
      return (
        <div className="text-left">
          <ExternalLink
            href={`https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/`}
            className="font-mono text-blue-600 hover:text-blue-800 text-sm"
          >
            PMID:{pubmedId}
          </ExternalLink>
        </div>
      );
    },
    size: 100,
  },
];
