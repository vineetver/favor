"use client";

import { DataGrid } from "@/components/ui/data-grid";
import { cv2fColumns } from "@/lib/variant/cv2f/table-columns";
import { roundNumber } from "@/lib/annotations/helpers";
import type { CV2F } from "@/lib/variant/cv2f/types";

interface CV2FDisplayProps {
  data: CV2F[] | null;
}

export function CV2FDisplay({ data }: CV2FDisplayProps) {
  const exportTSV = (filteredData: CV2F[]) => {
    const headers = [
      "rsID",
      "Cm (Overall)",
      "CV2F",
      "Liver CV2F",
      "Blood CV2F",
      "Brain CV2F",
      "GM12878 CV2F",
      "K562 CV2F",
      "HepG2 CV2F",
    ];
    
    const rows = filteredData.map((row) => [
      row.Rsid,
      row.Cm ? roundNumber(typeof row.Cm === 'string' ? parseFloat(row.Cm) : row.Cm).toString() : "N/A",
      row.Cv2f ? roundNumber(typeof row.Cv2f === 'string' ? parseFloat(row.Cv2f) : row.Cv2f).toString() : "N/A",
      row.LiverCv2f ? roundNumber(typeof row.LiverCv2f === 'string' ? parseFloat(row.LiverCv2f) : row.LiverCv2f).toString() : "N/A",
      row.BloodCv2f ? roundNumber(typeof row.BloodCv2f === 'string' ? parseFloat(row.BloodCv2f) : row.BloodCv2f).toString() : "N/A",
      row.BrainCv2f ? roundNumber(typeof row.BrainCv2f === 'string' ? parseFloat(row.BrainCv2f) : row.BrainCv2f).toString() : "N/A",
      row.Gm12878Cv2f ? roundNumber(typeof row.Gm12878Cv2f === 'string' ? parseFloat(row.Gm12878Cv2f) : row.Gm12878Cv2f).toString() : "N/A",
      row.K562Cv2f ? roundNumber(typeof row.K562Cv2f === 'string' ? parseFloat(row.K562Cv2f) : row.K562Cv2f).toString() : "N/A",
      row.HepG2CV2F ? roundNumber(typeof row.HepG2CV2F === 'string' ? parseFloat(row.HepG2CV2F) : row.HepG2CV2F).toString() : "N/A",
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv2f_data.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const facetedFilters: any[] = [];

  return (
    <DataGrid
      columns={cv2fColumns}
      data={data || []}
      title="CV2F Data"
      description="Coefficient of Variation (CV2F) measures the variability of variant allele frequency across single cells"
      searchPlaceholder="Search by rsID..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="cv2f_data.tsv"
      initialPageSize={20}
      emptyState={{
        title: "No CV2F data",
        description: "No CV2F data is available for this region or gene.",
        icon: "database",
        dataType: "CV2F data",
      }}
    />
  );
}