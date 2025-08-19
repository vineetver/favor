"use client";

import React, { useMemo } from "react";
import { NoDataState } from "@/components/ui/error-states";
import { DataGrid } from "@/components/ui/data-grid";
import { ResponsiveTabs } from "@/components/ui/responsive-tabs";
import { GwasScatterChart } from "./gwas-scatter-chart";
import type { Variant } from "@/lib/variant/api";
import type { GWAS } from "@/lib/variant/gwas/api";
import { gwasColumns } from "@/lib/variant/gwas/columns";

interface GwasCatalogDataDisplayProps {
  variant: Variant;
  gwas: GWAS[] | null;
}


function GwasTable({ data }: { data: GWAS[] }) {
  const exportTSV = (filteredData: GWAS[]) => {
    const headers = [
      "Disease/Trait", 
      "Risk Allele",
      "P-value",
      "-log10(P)",
      "RAF",
      "OR/Beta",
      "95% CI",
      "Mapped Gene",
      "First Author",
      "PubMed ID"
    ];
    const rows = filteredData.map((row) => [
      row.gwas_disease_trait,
      row.gwas_strongest_snp_risk_allele,
      row.gwas_p_value,
      row.gwas_p_value_mlog,
      row.gwas_risk_allele_frequency,
      row.gwas_or_or_beta || "",
      row.gwas_95_ci_text || "",
      row.gwas_mapped_gene,
      row.gwas_first_author,
      row.gwas_pubmedid
    ]);
    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gwas_catalog_data.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data || data.length === 0) {
    return <NoDataState categoryName="GWAS Catalog Data" />;
  }

  return (
    <DataGrid
      columns={gwasColumns}
      data={data}
      title="GWAS Catalog Associations"
      searchPlaceholder="Search by trait, gene, author, rsid..."
      onExport={exportTSV}
      exportFilename="gwas_catalog_data.tsv"
      initialPageSize={25}
      emptyState={{
        title: "No GWAS data found",
        description: "No GWAS catalog associations are available for this variant.",
        dataType: "GWAS Catalog Data"
      }}
    />
  );
}

const MemoizedGwasTable = React.memo(GwasTable);
const MemoizedGwasScatterChart = React.memo(GwasScatterChart);

export function GwasCatalogDataDisplay({ gwas }: GwasCatalogDataDisplayProps) {
  if (!gwas || gwas.length === 0) {
    return <NoDataState categoryName="GWAS Catalog Data" />;
  }

  const tabs = useMemo(() => [
    {
      id: "table",
      label: "Table View",
      shortLabel: "Table",
      count: gwas.length,
      content: <MemoizedGwasTable data={gwas} />
    },
    {
      id: "visualization", 
      label: "Visualization",
      shortLabel: "Chart",
      content: <MemoizedGwasScatterChart data={gwas} />
    }
  ], [gwas]);

  return (
    <div className="space-y-6">
      <ResponsiveTabs 
        tabs={tabs}
        defaultValue="table"
        variant="flat"
      />
    </div>
  );
}
