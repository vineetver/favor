"use client";

import React from "react";
import { DataGrid } from "@/components/ui/data-grid";
import type { ProcessedGwasData } from "@/lib/variant/gwas/types";
import { gwasColumns } from "@/lib/variant/gwas/columns";

interface GwasScatterTableProps {
  data: ProcessedGwasData[];
  title?: string;
  onRowClick?: (row: ProcessedGwasData) => void;
  selectedRowId?: string | null;
}

export const GwasScatterTable = React.memo<GwasScatterTableProps>(
  function GwasScatterTable({ data, title, onRowClick, selectedRowId }) {
    const exportTSV = (filteredData: ProcessedGwasData[]) => {
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
        "PubMed ID",
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
        row.gwas_pubmedid,
      ]);
      const tsv = [
        headers.join("\t"),
        ...rows.map((row) => row.join("\t")),
      ].join("\n");
      const blob = new Blob([tsv], { type: "text/tab-separated-values" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gwas_category_data.tsv";
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <DataGrid
        columns={gwasColumns as any}
        data={data}
        title={title}
        searchPlaceholder="Search by trait, gene, author..."
        onExport={exportTSV}
        exportFilename="gwas_category_data.tsv"
        showExport={true}
        showColumnToggle={true}
        initialPageSize={25}
        onRowClick={onRowClick}
        selectedRowId={selectedRowId || undefined}
        getRowId={(row) => row.uniqueKey}
        emptyState={{
          title: "No GWAS data found",
          description: "No GWAS scatter data is available.",
          dataType: "GWAS Data",
        }}
      />
    );
  },
);
