import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils/general";
import type {
  BiogridColumnDef,
  BiogridProcessedInteraction,
} from "@/components/features/gene/ppi/biogrid/biogrid-types";
import { ExternalLink } from "@/components/ui/external-link";
import { getBiogridUniqueValues } from "@/components/features/gene/ppi/biogrid/biogrid-transforms";

function isBiogridRowHighlighted(
  item: BiogridProcessedInteraction,
  selectedNode: string | null,
): boolean {
  if (!selectedNode) return false;
  return item.gene_a === selectedNode || item.gene_b === selectedNode;
}

function extractBiogridPubMedIds(
  publicationIdentifiers: string | undefined,
): string[] {
  if (!publicationIdentifiers) return [];

  const pubmedIds: string[] = [];
  const parts = publicationIdentifiers.split("|");

  parts.forEach((part) => {
    if (part.includes("pubmed:")) {
      const match = part.match(/pubmed:(\d+)/);
      if (match && match[1]) {
        pubmedIds.push(match[1]);
      }
    }
  });

  return pubmedIds;
}

export function createBiogridColumns(
  selectedNode: string | null,
): BiogridColumnDef[] {
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
        const isHighlighted = isBiogridRowHighlighted(
          row.original,
          selectedNode,
        );
        return (
          <code
            className={cn(
              "px-2 py-1 rounded font-semibold",
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
        const isHighlighted = isBiogridRowHighlighted(
          row.original,
          selectedNode,
        );
        return (
          <code
            className={cn(
              "px-2 py-1 rounded font-semibold",
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
          title="Method"
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
          title="Type"
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
          <div className="flex items-center">
            <span className="font-mono bg-green-50 px-2 py-1 rounded">
              {confidence.toFixed(3)}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
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
        return publication ? (
          <span>{publication}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "publication_identifiers",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="PubMed"
        />
      ),
      cell: ({ getValue }) => {
        const publicationIds = getValue() as string | undefined;
        const pubmedIds = extractBiogridPubMedIds(publicationIds);

        if (pubmedIds.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }

        return (
          <div className="flex items-center gap-1">
            {pubmedIds.slice(0, 3).map((pmid) => (
              <ExternalLink
                key={pmid}
                className="text-blue-500"
                href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                title={`PubMed ID: ${pmid}`}
              >
                {pmid}
              </ExternalLink>
            ))}
            {pubmedIds.length > 3 && (
              <span className="text-muted-foreground">
                +{pubmedIds.length - 3}
              </span>
            )}
          </div>
        );
      },
    },
  ];
}

export function createBiogridFacetedFilters(data: BiogridProcessedInteraction[]) {
  const uniqueMethods = getBiogridUniqueValues(data, (item) => item.method);
  const uniqueTypes = getBiogridUniqueValues(data, (item) => item.interaction_type);

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

export function exportBiogridTableData(
  data: BiogridProcessedInteraction[],
  columns: BiogridColumnDef[],
  filename: string = "biogrid-interactions.tsv",
) {
  const headers = columns.map((col) => {
    if (typeof col.header === "string") return col.header;
    if ("accessorKey" in col && col.accessorKey)
      return col.accessorKey.toString();
    return "column";
  });

  const rows = data.map((row) =>
    columns.map((col) => {
      if ("accessorKey" in col && col.accessorKey) {
        const value = (row as any)[col.accessorKey];
        return typeof value === "string" ? value : String(value || "");
      }
      return "";
    }),
  );

  const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
    "\n",
  );
  const blob = new Blob([tsv], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function filterBiogridTableData(
  data: BiogridProcessedInteraction[],
  methodFilter: string,
  typeFilter: string,
): BiogridProcessedInteraction[] {
  return data.filter((item) => {
    if (methodFilter !== "all" && item.method !== methodFilter) return false;
    if (typeFilter !== "all" && item.interaction_type !== typeFilter)
      return false;
    return true;
  });
}