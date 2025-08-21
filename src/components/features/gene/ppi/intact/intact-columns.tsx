import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils/general";
import type {
  IntactColumnDef,
  IntactProcessedInteraction,
} from "@/components/features/gene/ppi/intact/intact-types";
import { ExternalLink } from "@/components/ui/external-link";
import { 
  getIntactUniqueValues,
  getIntactUniqueExpansionMethods,
  getIntactUniqueBiologicalRoles 
} from "./intact-transforms";

function isIntactRowHighlighted(
  item: IntactProcessedInteraction,
  selectedNode: string | null,
): boolean {
  if (!selectedNode) return false;
  return item.gene_a === selectedNode || item.gene_b === selectedNode;
}

function extractIntactPubMedIds(
  publicationIdentifier: string | undefined,
): string[] {
  if (!publicationIdentifier) return [];

  const pubmedIds: string[] = [];
  const parts = publicationIdentifier.split("|");

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

export function createIntactColumns(
  selectedNode: string | null,
): IntactColumnDef[] {
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
        const isHighlighted = isIntactRowHighlighted(
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
        const isHighlighted = isIntactRowHighlighted(
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
      accessorKey: "expansion_method",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Expansion"
        />
      ),
      cell: ({ getValue }) => {
        const expansion = getValue() as string;
        return expansion ? (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {expansion}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
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
      accessorKey: "host_organism",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Host"
        />
      ),
      cell: ({ getValue }) => {
        const host = getValue() as string;
        return host ? (
          <Badge variant="outline" className="text-xs whitespace-nowrap">
            {host}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "negative",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Negative"
        />
      ),
      cell: ({ getValue }) => {
        const negative = getValue() as boolean;
        return negative ? (
          <Badge variant="destructive" className="text-xs">
            Yes
          </Badge>
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
      accessorKey: "publication_identifier",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="PubMed"
        />
      ),
      cell: ({ getValue }) => {
        const publicationId = getValue() as string | undefined;
        const pubmedIds = extractIntactPubMedIds(publicationId);

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

export function exportIntactTableData(
  data: IntactProcessedInteraction[],
  columns: IntactColumnDef[],
  filename: string = "intact-interactions.tsv",
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

export function filterIntactTableData(
  data: IntactProcessedInteraction[],
  methodFilter: string,
  typeFilter: string,
  expansionFilter: string = "all",
  roleFilter: string = "all",
): IntactProcessedInteraction[] {
  return data.filter((item) => {
    if (methodFilter !== "all" && item.method !== methodFilter) return false;
    if (typeFilter !== "all" && item.interaction_type !== typeFilter)
      return false;
    if (expansionFilter !== "all" && item.expansion_method !== expansionFilter)
      return false;
    if (
      roleFilter !== "all" &&
      !item.biological_role_a.includes(roleFilter) &&
      !item.biological_role_b.includes(roleFilter)
    )
      return false;
    return true;
  });
}

export function createIntactFacetedFilters(data: IntactProcessedInteraction[]) {
  const uniqueMethods = getIntactUniqueValues(data, (item) => item.method);
  const uniqueTypes = getIntactUniqueValues(data, (item) => item.interaction_type);
  const uniqueExpansionMethods = getIntactUniqueExpansionMethods(data);
  const uniqueBiologicalRoles = getIntactUniqueBiologicalRoles(data);

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
    }] : []),
    ...(uniqueExpansionMethods.length > 0 ? [{
      columnId: 'expansion_method',
      title: 'Expansion Method',
      options: uniqueExpansionMethods.map(method => ({ label: method, value: method }))
    }] : []),
    ...(uniqueBiologicalRoles.length > 0 ? [{
      columnId: 'biological_role',
      title: 'Biological Role',
      options: uniqueBiologicalRoles.map(role => ({ label: role, value: role }))
    }] : [])
  ];
}
