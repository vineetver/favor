import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils/general";

export interface PPIInteraction {
  id: string;
  gene_a: string;
  gene_b: string;
  method?: string;
  degree?: string;
  confidence?: number | undefined;
  source: string;
  publication?: string | undefined;
  interaction_type?: string;
}

function isRowHighlighted(item: PPIInteraction, selectedNode: string | null): boolean {
  if (!selectedNode) return false;
  return item.gene_a === selectedNode || item.gene_b === selectedNode;
}

export function createPPIColumns(selectedNode: string | null): ColumnDef<PPIInteraction>[] {
  return [
    {
      accessorKey: "gene_a",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Gene A"
        />
      ),
      cell: ({ row, getValue }) => {
        const geneA = getValue() as string;
        const isHighlighted = isRowHighlighted(row.original, selectedNode);
        return (
          <code
            className={cn(
              "px-2 py-1 rounded text-sm font-semibold",
              isHighlighted ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted",
            )}
          >
            {geneA}
          </code>
        );
      },
    },
    {
      accessorKey: "gene_b",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Gene B"
        />
      ),
      cell: ({ row, getValue }) => {
        const geneB = getValue() as string;
        const isHighlighted = isRowHighlighted(row.original, selectedNode);
        return (
          <code
            className={cn(
              "px-2 py-1 rounded text-sm font-semibold",
              isHighlighted ? "bg-blue-100 dark:bg-blue-900/30" : "bg-muted",
            )}
          >
            {geneB}
          </code>
        );
      },
    },
    {
      accessorKey: "method",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Detection Method"
        />
      ),
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
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Interaction Type"
        />
      ),
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
      accessorKey: "confidence",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Confidence"
        />
      ),
      cell: ({ getValue }) => {
        const confidence = getValue() as number | undefined;
        return confidence !== undefined &&
          confidence !== null &&
          typeof confidence === "number" ? (
          <span className="text-sm font-mono bg-green-50 px-2 py-1 rounded">
            {confidence.toFixed(3)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      accessorKey: "degree",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Degree"
        />
      ),
      cell: ({ getValue }) => {
        const degree = getValue() as string;
        return degree ? (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {degree}
          </Badge>
        ) : null;
      },
    },
    {
      accessorKey: "publication",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Publication"
        />
      ),
      cell: ({ getValue }) => {
        const publication = getValue() as string | undefined;
        return publication && publication.trim() ? (
          <span className="text-sm truncate max-w-32" title={publication}>
            {publication}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
  ];
}

export function createPPIFacetedFilters(data: PPIInteraction[]) {
  const uniqueMethods = Array.from(
    new Set(data.map((item) => item.method).filter(Boolean) as string[]),
  ).sort();

  const uniqueTypes = Array.from(
    new Set(
      data.map((item) => item.interaction_type).filter(Boolean) as string[],
    ),
  ).sort();

  return [
    ...(uniqueMethods.length > 0 ? [{
      columnId: 'method',
      title: 'Method',
      options: uniqueMethods.map(method => ({ label: method, value: method }))
    }] : []),
    ...(uniqueTypes.length > 0 ? [{
      columnId: 'interaction_type',
      title: 'Interaction Type',
      options: uniqueTypes.map(type => ({ label: type, value: type }))
    }] : [])
  ];
}