"use client";

import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NoDataState } from "@/components/ui/error-states";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { Target, AssociatedDisease } from "@/lib/opentargets/types";

interface TargetDiseasesDisplayProps {
  target: Target & { associatedDiseases: { count: number; rows: AssociatedDisease[] } };
  geneName: string;
}

interface ProcessedDiseaseData {
  id: string;
  name: string;
  description?: string;
  score: number;
  therapeuticAreas?: string[];
  therapeuticAreasString: string;
  scoreRange: string;
  datasourceScores: Record<string, number>;
}

// Define datasource categories based on OpenTargets structure
const DATASOURCE_CATEGORIES = {
  "GWAS & Genetics": [
    "gwas_associations",
    "gene_burden", 
    "clinvar",
    "genomics_england", 
    "gene2phenotype",
    "uniprot_literature",
    "uniprot_variants",
    "orphanet",
    "clingen"
  ],
  "Literature & Curation": [
    "cancer_gene_census",
    "intogen",
    "cancer_biomarkers", 
    "chembl",
    "crispr_screens",
    "project_score"
  ],
  "Pathway & Expression": [
    "slap_enrich",
    "progeny", 
    "reactome",
    "gene_signatures",
    "europe_pmc"
  ],
  "Expression & Phenotype": [
    "expression_atlas",
    "impc"
  ]
};

function categorizeDataSource(dsId: string): string {
  for (const [category, sources] of Object.entries(DATASOURCE_CATEGORIES)) {
    if (sources.includes(dsId)) {
      return category;
    }
  }
  return "Other";
}

function ScoreCell({ score }: { score: number }) {
  if (score === 0) {
    return (
      <div className="flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="rounded-full w-6 h-6 border-2 border-gray-300 bg-white cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>No data (0.000)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  const getColor = (score: number) => {
    if (score < 0.1) return "bg-blue-100";
    if (score < 0.2) return "bg-blue-200";
    if (score < 0.3) return "bg-blue-300";
    if (score < 0.4) return "bg-blue-400";
    if (score < 0.5) return "bg-blue-500";
    if (score < 0.6) return "bg-blue-600";
    if (score < 0.7) return "bg-blue-700";
    if (score < 0.8) return "bg-blue-800";
    if (score < 0.9) return "bg-blue-900";
    return "bg-blue-950";
  };

  return (
    <div className="flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`rounded-full w-6 h-6 cursor-help ${getColor(score)}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>Score: {score.toFixed(3)}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function TargetDiseasesDisplay({ target, geneName }: TargetDiseasesDisplayProps) {
  const diseases = target.associatedDiseases?.rows || [];

  const { processedData, columns, datasourceCategories } = useMemo(() => {
    if (diseases.length === 0) {
      return { processedData: [], columns: [], datasourceCategories: {} };
    }

    // Get all unique datasources and categorize them
    const allDatasources = Array.from(
      new Set(
        diseases.flatMap(d => d.datasourceScores?.map(ds => ds.id) || [])
      )
    ).sort();

    // Group datasources by category
    const datasourceCategories: Record<string, string[]> = {};
    allDatasources.forEach(dsId => {
      const category = categorizeDataSource(dsId);
      if (!datasourceCategories[category]) {
        datasourceCategories[category] = [];
      }
      datasourceCategories[category].push(dsId);
    });

    // Process data
    const processedData: ProcessedDiseaseData[] = diseases.map(association => {
      const datasourceScores: Record<string, number> = {};
      allDatasources.forEach(dsId => {
        const ds = association.datasourceScores?.find(ds => ds.id === dsId);
        datasourceScores[dsId] = ds?.score || 0;
      });

      // Determine score range for filtering
      const score = association.score;
      let scoreRange = "<0.2";
      if (score >= 0.8) scoreRange = "0.8+";
      else if (score >= 0.6) scoreRange = "0.6-0.8";
      else if (score >= 0.4) scoreRange = "0.4-0.6";
      else if (score >= 0.2) scoreRange = "0.2-0.4";

      const therapeuticAreas = association.disease.therapeuticAreas?.map(ta => ta.name) || [];
      const therapeuticAreasString = therapeuticAreas.join(", ");

      return {
        id: association.disease.id,
        name: association.disease.name,
        description: association.disease.description,
        score: association.score,
        therapeuticAreas,
        therapeuticAreasString,
        scoreRange,
        datasourceScores,
      };
    });

    // Create simple flat columns (no grouping for now, focus on making it work)
    const columns: ColumnDef<ProcessedDiseaseData>[] = [
      {
        accessorKey: "name",
        header: "Disease",
        cell: ({ row }) => (
          <div className="max-w-xs">
            <div className="font-medium text-sm">{row.original.name}</div>
            {row.original.description && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {row.original.description}
              </div>
            )}
            {row.original.therapeuticAreas && row.original.therapeuticAreas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {row.original.therapeuticAreas.slice(0, 2).map(area => (
                  <Badge key={area} variant="secondary" className="text-xs">
                    {area}
                  </Badge>
                ))}
                {row.original.therapeuticAreas.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{row.original.therapeuticAreas.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ),
        enableSorting: true,
        size: 300,
        filterFn: (row, id, value) => {
          const cellValue = row.getValue(id);
          return cellValue ? cellValue.toString().toLowerCase().includes(value.toLowerCase()) : false;
        },
      },
      {
        accessorKey: "score",
        header: "Association Score",
        cell: ({ row }) => (
          <div className="text-center">
            <ScoreCell score={row.original.score} />
            <div className="text-xs text-muted-foreground mt-1">
              {row.original.score.toFixed(3)}
            </div>
          </div>
        ),
        enableSorting: true,
        sortDescFirst: true,
        size: 120,
      },
    ];

    // Don't add virtual filter columns to the table - handle filtering via facetedFilters instead

    // Add individual datasource columns (flat structure)
    allDatasources.forEach(dsId => {
      const category = categorizeDataSource(dsId);
      columns.push({
        id: dsId,
        header: dsId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        cell: ({ row }: { row: any }) => (
          <ScoreCell score={row.original.datasourceScores[dsId]} />
        ),
        enableSorting: true,
        sortDescFirst: true,
        size: 80,
        meta: {
          category: category,
        },
      });
    });

    return { processedData, columns, datasourceCategories };
  }, [diseases]);

  if (diseases.length === 0) {
    return (
      <NoDataState
        categoryName="Disease Associations"
        title="No Disease Associations Available"
        description={`No disease association data is available for ${geneName} in OpenTargets Platform.`}
      />
    );
  }

  // For now, remove faceted filters since they require columns
  // We can add custom filtering UI later if needed
  const facetedFilters = useMemo(() => [], []);

  const exportTSV = (filteredData: ProcessedDiseaseData[]) => {
    const headers = ["Disease", "Description", "Association Score", "Therapeutic Areas", ...Object.keys(filteredData[0]?.datasourceScores || {})];
    
    const rows = filteredData.map(row => [
      row.name,
      row.description || "",
      row.score.toString(),
      row.therapeuticAreas?.join("; ") || "",
      ...Object.values(row.datasourceScores).map(score => score.toString()),
    ]);

    const tsv = [headers.join("\t"), ...rows.map(row => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${geneName}-opentargets-diseases.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Legend Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <h3 className="font-medium text-sm mb-3">Association score</h3>
                <div className="flex items-center gap-2">
                  {/* Gradient Bar */}
                  <div className="relative">
                    <div className="w-60 h-6 bg-gradient-to-r from-blue-100 via-blue-300 via-blue-500 via-blue-700 to-blue-900 rounded"></div>
                    {/* Score markers */}
                    <div className="flex justify-between w-60 mt-1 text-xs text-muted-foreground">
                      <span>0.1</span>
                      <span>0.2</span>
                      <span>0.3</span>
                      <span>0.4</span>
                      <span>0.6</span>
                      <span>0.7</span>
                      <span>0.8</span>
                      <span>0.9</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm mb-3">No data</h3>
                <div className="flex justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white"></div>
                </div>
              </div>
            </div>
            <Badge variant="outline">{geneName}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <DataGrid
        columns={columns}
        data={processedData}
        title="Associated Diseases"
        description={`Disease associations for ${geneName} from OpenTargets Platform`}
        searchPlaceholder="Search diseases..."
        facetedFilters={facetedFilters}
        onExport={exportTSV}
        exportFilename={`${geneName}-opentargets-diseases.tsv`}
        initialPageSize={25}
        initialSorting={[{ id: "score", desc: true }]}
        emptyState={{
          title: "No disease associations available",
          description: "No disease association data is available.",
          dataType: "disease associations",
        }}
        getRowId={(row) => row.id}
      />
    </div>
  );
}