import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils/general";
import { ExternalLink } from "lucide-react";
import type { UnifiedPPIInteraction } from "@/lib/gene/ppi/types";

export function isRowHighlighted(item: UnifiedPPIInteraction, selectedNode: string | null): boolean {
  if (!selectedNode) return false;
  return item.gene_a === selectedNode || item.gene_b === selectedNode;
}

function extractPubMedIds(publicationIdentifiers: string | undefined): string[] {
  if (!publicationIdentifiers) return [];
  
  const pubmedIds: string[] = [];
  const parts = publicationIdentifiers.split('|');
  
  parts.forEach(part => {
    if (part.includes('pubmed:')) {
      const match = part.match(/pubmed:(\d+)/);
      if (match && match[1]) {
        pubmedIds.push(match[1]);
      }
    }
  });
  
  return pubmedIds;
}

export function createBasePPIColumns(selectedNode: string | null): ColumnDef<UnifiedPPIInteraction>[] {
  return [
    {
      accessorKey: "gene_a",
      header: createColumnHeader("Gene A"),
      cell: ({ row, getValue }) => {
        const geneA = getValue() as string;
        const isHighlighted = isRowHighlighted(row.original, selectedNode);
        return (
          <code className={cn(
            "px-2 py-1 rounded text-sm font-semibold",
            isHighlighted ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"
          )}>
            {geneA}
          </code>
        );
      },
    },
    {
      accessorKey: "gene_b",
      header: createColumnHeader("Gene B"),
      cell: ({ row, getValue }) => {
        const geneB = getValue() as string;
        const isHighlighted = isRowHighlighted(row.original, selectedNode);
        return (
          <code className={cn(
            "px-2 py-1 rounded text-sm font-semibold",
            isHighlighted ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted"
          )}>
            {geneB}
          </code>
        );
      },
    },
    {
      accessorKey: "method",
      header: createColumnHeader("Method"),
      cell: ({ getValue }) => {
        const method = getValue() as string;
        return method ? (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {method}
          </Badge>
        ) : null;
      },
    },
    {
      accessorKey: "interaction_type",
      header: createColumnHeader("Type"),
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return type ? (
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {type}
          </Badge>
        ) : null;
      },
    },
    {
      accessorKey: "confidence_numeric",
      header: createColumnHeader("Confidence"),
      cell: ({ getValue }) => {
        const confidence = getValue() as number | undefined;
        return confidence !== undefined && confidence !== null && typeof confidence === 'number' ? (
          <div className="flex items-center justify-center">
            <span className="text-sm font-mono bg-green-50 px-2 py-1 rounded">
              {confidence.toFixed(3)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      accessorKey: "publication_identifiers",
      header: createColumnHeader("PubMed"),
      cell: ({ getValue }) => {
        const publicationIds = getValue() as string | undefined;
        const pubmedIds = extractPubMedIds(publicationIds);
        
        if (pubmedIds.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        
        return (
          <div className="flex items-center gap-1">
            {pubmedIds.slice(0, 3).map((pmid) => (
              <Button
                key={pmid}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-blue-50"
                onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, '_blank')}
                title={`PubMed ID: ${pmid}`}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                {pmid}
              </Button>
            ))}
            {pubmedIds.length > 3 && (
              <span className="text-xs text-muted-foreground">+{pubmedIds.length - 3}</span>
            )}
          </div>
        );
      },
    },
  ];
}

export function exportTableData(data: UnifiedPPIInteraction[], columns: ColumnDef<UnifiedPPIInteraction>[], filename: string = "protein-protein-interactions.tsv") {
  const headers = columns.map(col => {
    if (typeof col.header === "string") return col.header;
    if ("accessorKey" in col && col.accessorKey) return col.accessorKey.toString();
    return "column";
  });
  
  const rows = data.map(row => 
    columns.map(col => {
      if ("accessorKey" in col && col.accessorKey) {
        const value = (row as any)[col.accessorKey];
        return typeof value === "string" ? value : String(value || "");
      }
      return "";
    })
  );
  
  const tsv = [headers.join("\t"), ...rows.map(row => row.join("\t"))].join("\n");
  const blob = new Blob([tsv], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getUniqueTableValues<T>(data: T[], accessor: (item: T) => string | undefined): string[] {
  return Array.from(new Set(data.map(accessor).filter(Boolean) as string[])).sort();
}

export function filterTableData(
  data: UnifiedPPIInteraction[],
  methodFilter: string,
  typeFilter: string
): UnifiedPPIInteraction[] {
  return data.filter(item => {
    if (methodFilter !== "all" && item.method !== methodFilter) return false;
    if (typeFilter !== "all" && item.interaction_type !== typeFilter) return false;
    return true;
  });
}