"use client";

import { useMemo, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataGrid } from "@/components/ui/data-grid";
import { RuntimeError } from "@/components/ui/error-states";
import { LinkedGenesPanel } from "@/components/features/ccre/linked-genes/linked-genes-panel";
import {
  getCCRETissueByRegion,
  getCCRETissueByVCF,
} from "@/lib/variant/ccre/api";
import { ccreColumns, tissueColumns } from "@/lib/variant/ccre/table-columns";
import { useTissueStore } from "@/lib/stores/tissue-store";
import type { CCRE, CCRETissue } from "@/lib/variant/ccre/types";

interface CCRETableViewProps {
  vcf?: string;
  region?: string;
  searchDistance: number[];
  debouncedSearchDistance: number[];
  cCREsData: CCRE[] | undefined | null;
  isCCRELoading: boolean;
}

const CCRETableViewImpl = ({
  vcf,
  region,
  searchDistance,
  debouncedSearchDistance,
  cCREsData,
  isCCRELoading,
}: CCRETableViewProps) => {
  const { selectedTissue, selectedSubtissue } = useTissueStore();

  const tissueQueryConfig = useMemo(
    () => ({
      queryKey: [
        "ccre-tissue",
        vcf || region,
        debouncedSearchDistance[0],
        selectedTissue,
        selectedSubtissue,
      ],
      queryFn: () => {
        if ((!vcf && !region) || !selectedTissue || !selectedSubtissue)
          return Promise.resolve([]);

        if (vcf) {
          return getCCRETissueByVCF(
            vcf,
            debouncedSearchDistance[0],
            selectedTissue,
            selectedSubtissue,
          );
        } else if (region) {
          return getCCRETissueByRegion(
            region,
            debouncedSearchDistance[0],
            selectedTissue,
            selectedSubtissue,
          );
        }
        return Promise.resolve([]);
      },
      enabled: Boolean((vcf || region) && selectedTissue && selectedSubtissue),
    }),
    [vcf, region, debouncedSearchDistance, selectedTissue, selectedSubtissue],
  );

  const {
    data: tissueData,
    isLoading: isTissueLoading,
    error: tissueError,
    refetch: refetchTissue,
  } = useQuery(tissueQueryConfig);

  const displayData = useMemo(() => {
    if (selectedTissue && selectedSubtissue && tissueData) {
      return tissueData;
    }
    return cCREsData || [];
  }, [selectedTissue, selectedSubtissue, tissueData, cCREsData]);

  const showTissueColumns = useMemo(
    () => Boolean(selectedTissue && selectedSubtissue),
    [selectedTissue, selectedSubtissue],
  );

  const isLoading = useMemo(
    () => (showTissueColumns ? isTissueLoading : isCCRELoading),
    [showTissueColumns, isTissueLoading, isCCRELoading],
  );

  const columns = useMemo(
    () => (showTissueColumns ? tissueColumns : ccreColumns),
    [showTissueColumns],
  );

  const renderExpandedRow = useCallback(
    (row: CCRE | CCRETissue) => <LinkedGenesPanel accession={row.accession} />,
    [],
  );

  const exportData = useCallback(
    (data: (CCRE | CCRETissue)[]) => {
      const headers = showTissueColumns
        ? [
            "Accession",
            "Chromosome",
            "Start",
            "End",
            "Class",
            "DNase",
            "ATAC",
            "H3K27ac",
            "H3K4me3",
            "CTCF",
          ]
        : ["Accession", "Annotations", "Chromosome", "Start", "End"];

      const rows = data.map((row) => {
        if (showTissueColumns) {
          const tissueRow = row as CCRETissue;
          return [
            tissueRow.accession,
            tissueRow.chromosome,
            tissueRow.start_position.toString(),
            tissueRow.end_position.toString(),
            tissueRow.datatype,
            tissueRow.dnase?.toString() || "N/A",
            tissueRow.atac?.toString() || "N/A",
            tissueRow.h3k27ac?.toString() || "N/A",
            tissueRow.h3k4me3?.toString() || "N/A",
            tissueRow.ctcf?.toString() || "N/A",
          ];
        } else {
          const ccreRow = row as CCRE;
          return [
            ccreRow.accession,
            ccreRow.annotations,
            ccreRow.chromosome,
            ccreRow.start_position.toString(),
            ccreRow.end_position.toString(),
          ];
        }
      });

      const tsv = [
        headers.join("\t"),
        ...rows.map((row) => row.join("\t")),
      ].join("\n");
      const blob = new Blob([tsv], { type: "text/tab-separated-values" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ccre_data_${searchDistance[0]}bp.tsv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [showTissueColumns, searchDistance],
  );

  const refetchTissueCallback = useCallback(
    () => refetchTissue(),
    [refetchTissue],
  );

  if (showTissueColumns && tissueError) {
    return (
      <RuntimeError
        error={tissueError as Error}
        reset={refetchTissueCallback}
        categoryName="Tissue-specific cCRE Data"
        description="We encountered an error while loading tissue-specific cCRE data. This could be due to a network issue or a temporary server problem."
      />
    );
  }

  const tableTitle = useMemo(
    () =>
      `cCREs within ${searchDistance[0].toLocaleString()}bp of ${vcf || "variant"}`,
    [searchDistance, vcf],
  );

  const exportFilename = useMemo(
    () => `ccre_data_${searchDistance[0]}bp.tsv`,
    [searchDistance],
  );

  const emptyState = useMemo(
    () => ({
      title: "No cCRE data found",
      description:
        "No cCRE data is available for this variant at the current distance.",
      dataType: "cCRE data",
    }),
    [],
  );

  return (
    <DataGrid
      columns={columns as any}
      data={displayData || []}
      title={tableTitle}
      showSearch={false}
      expandable={true}
      renderExpandedRow={renderExpandedRow}
      pinnedColumns={{ right: ["gene-links"] }}
      onExport={exportData}
      exportFilename={exportFilename}
      initialPageSize={10}
      isLoading={isLoading}
      emptyState={emptyState}
    />
  );
};

export const CCRETableView = memo(CCRETableViewImpl);
