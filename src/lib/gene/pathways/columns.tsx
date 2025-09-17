import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "@/components/ui/external-link";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils/general";

export interface PathwayGeneData {
  pathway: string;
  gene_name: string;
  source: string;
}

export interface PathwayInteractionData {
  pathway: string;
  gene_name: string;
  source: string;
  method?: string;
  degree?: string;
  interactor_b?: string;
}

interface HighlightData {
  selectedPathway: string | null;
  selectedNode: string | null;
  pathwayGenes: string[];
  pathwayInteractions: any[];
}

const isRowHighlighted = (
  item: PathwayGeneData | PathwayInteractionData,
  highlightData?: HighlightData,
) => {
  if (!highlightData) return false;

  const { selectedPathway, selectedNode } = highlightData;

  if (selectedPathway && item.pathway === selectedPathway) return true;
  if (
    selectedNode &&
    (item.gene_name === selectedNode ||
      ("interactor_b" in item && item.interactor_b === selectedNode))
  )
    return true;

  return false;
};

export const createPathwayGenesColumns = (
  highlightData?: HighlightData,
): ColumnDef<PathwayGeneData>[] => [
  {
    accessorKey: "pathway",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Pathway"
        tooltip="Biological pathway name"
      />
    ),
    cell: ({ getValue }) => {
      const pathway = getValue() as string;
      return (
        <div className="font-medium max-w-xs">
          <div className="truncate" title={pathway}>
            {pathway}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "gene_name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Gene"
        tooltip="Gene name/symbol"
      />
    ),
    cell: ({ row, getValue }) => {
      const geneName = getValue() as string;
      const isHighlighted = isRowHighlighted(row.original, highlightData);
      return (
        <code
          className={cn(
            "px-2 py-1 rounded text-sm",
            isHighlighted ? "bg-blue-100" : "bg-muted",
          )}
        >
          {geneName}
        </code>
      );
    },
  },
  {
    accessorKey: "source",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Source"
        tooltip="Pathway database source"
      />
    ),
    cell: ({ getValue }) => {
      const source = getValue() as string;
      return (
        <Badge variant="outline" className="text-xs">
          {source}
        </Badge>
      );
    },
  },
  {
    id: "external",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="External"
        tooltip="External database links"
      />
    ),
    cell: ({ row }) => {
      const { source, pathway } = row.original;
      if (source === "KEGG") {
        return (
          <ExternalLink
            href={`https://www.genome.jp/entry/pathway+${pathway}`}
            className="text-xs"
          >
            KEGG →
          </ExternalLink>
        );
      }
      if (source === "WikiPathways") {
        return (
          <ExternalLink
            href={`https://www.wikipathways.org/instance/${pathway}`}
            className="text-xs"
          >
            WikiPathways →
          </ExternalLink>
        );
      }
      if (source === "BioCyc") {
        return (
          <ExternalLink
            href={`https://biocyc.org/META/NEW-IMAGE?type=PATHWAY&object=${pathway}`}
            className="text-xs"
          >
            BioCyc →
          </ExternalLink>
        );
      }
      return null;
    },
  },
];

export const createPathwayInteractionsColumns = (
  highlightData?: HighlightData,
): ColumnDef<PathwayInteractionData>[] => [
  {
    accessorKey: "pathway",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Pathway"
        tooltip="Biological pathway name"
      />
    ),
    cell: ({ getValue }) => {
      const pathway = getValue() as string;
      return (
        <div className="font-medium max-w-xs">
          <div className="truncate" title={pathway}>
            {pathway}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "gene_name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Gene"
        tooltip="Gene name/symbol"
      />
    ),
    cell: ({ row, getValue }) => {
      const geneName = getValue() as string;
      const isHighlighted = isRowHighlighted(row.original, highlightData);
      return (
        <code
          className={cn(
            "px-2 py-1 rounded text-sm",
            isHighlighted ? "bg-blue-100" : "bg-muted",
          )}
        >
          {geneName}
        </code>
      );
    },
  },
  {
    accessorKey: "interactor_b",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Interacts With"
        tooltip="Protein interaction partner"
      />
    ),
    cell: ({ row, getValue }) => {
      const interactorB = getValue() as string;
      const isHighlighted = isRowHighlighted(row.original, highlightData);
      return interactorB ? (
        <code
          className={cn(
            "px-2 py-1 rounded text-sm",
            isHighlighted ? "bg-blue-100" : "bg-muted",
          )}
        >
          {interactorB}
        </code>
      ) : null;
    },
  },
  {
    accessorKey: "method",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Method"
        tooltip="Detection method used for interaction"
      />
    ),
    cell: ({ getValue }) => {
      const method = getValue() as string;
      return method ? (
        <Badge variant="outline" className="text-xs">
          {method}
        </Badge>
      ) : null;
    },
  },
  {
    accessorKey: "degree",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Degree"
        tooltip="Interaction confidence or degree"
      />
    ),
    cell: ({ getValue }) => {
      const degree = getValue() as string;
      return degree ? (
        <Badge variant="secondary" className="text-xs">
          {degree}
        </Badge>
      ) : null;
    },
  },
  {
    accessorKey: "source",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Source"
        tooltip="Pathway database source"
      />
    ),
    cell: ({ getValue }) => {
      const source = getValue() as string;
      return (
        <Badge variant="outline" className="text-xs">
          {source}
        </Badge>
      );
    },
  },
  {
    id: "external",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="External"
        tooltip="External database links"
      />
    ),
    cell: ({ row }) => {
      const { source, pathway } = row.original;
      if (source === "KEGG") {
        return (
          <ExternalLink
            href={`https://www.genome.jp/entry/pathway+${pathway}`}
            className="text-xs"
          >
            KEGG →
          </ExternalLink>
        );
      }
      if (source === "WikiPathways") {
        return (
          <ExternalLink
            href={`https://www.wikipathways.org/instance/${pathway}`}
            className="text-xs"
          >
            WikiPathways →
          </ExternalLink>
        );
      }
      if (source === "BioCyc") {
        return (
          <ExternalLink
            href={`https://biocyc.org/META/NEW-IMAGE?type=PATHWAY&object=${pathway}`}
            className="text-xs"
          >
            BioCyc →
          </ExternalLink>
        );
      }
      return null;
    },
  },
];

export const createPathwayFacetedFilters = (
  data: (PathwayGeneData | PathwayInteractionData)[],
  type: "genes" | "interactions",
) => {
  const uniqueSources = Array.from(
    new Set(data.map((item) => item.source)),
  ).sort();

  const baseFilters = [
    {
      columnId: "source",
      title: "Source",
      options: uniqueSources.map((source) => ({
        label: source,
        value: source,
      })),
    },
  ];

  if (type === "interactions") {
    const interactionData = data as PathwayInteractionData[];
    const uniqueMethods = Array.from(
      new Set(
        interactionData.map((item) => item.method).filter(Boolean) as string[],
      ),
    ).sort();

    const uniqueDegrees = Array.from(
      new Set(
        interactionData.map((item) => item.degree).filter(Boolean) as string[],
      ),
    ).sort();

    if (uniqueMethods.length > 0) {
      baseFilters.push({
        columnId: "method",
        title: "Method",
        options: uniqueMethods.map((method) => ({
          label: method,
          value: method,
        })),
      });
    }

    if (uniqueDegrees.length > 0) {
      baseFilters.push({
        columnId: "degree",
        title: "Degree",
        options: uniqueDegrees.map((degree) => ({
          label: degree,
          value: degree,
        })),
      });
    }
  }

  return baseFilters;
};
