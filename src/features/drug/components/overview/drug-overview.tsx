"use client";

import { useState, useMemo } from "react";
import { Copy, ExternalLink } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Drug, CrossReference } from "@features/drug/types/drug";
import { cn } from "@infra/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { ClickableEntityId } from "@shared/components/ui/clickable-entity-id";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { MoleculeViewer } from "@shared/components/ui/molecule-viewer";

interface DrugOverviewProps {
  drug: Drug;
}

// ============================================================================
// Table Row Types
// ============================================================================

interface DrugCrossRefRow {
  id: string;
  source: string;
  referenceId: string;
  url?: string;
}

interface LinkedEntityRow {
  id: string;
  entityType: "Disease" | "Target" | "Child Molecule";
  entityId: string;
}

interface NameRow {
  id: string;
  nameType: "Trade Name" | "Synonym";
  name: string;
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

const getCrossRefHref = (source: string | undefined, id: string) => {
  if (!source) return null;
  const normalized = source.toLowerCase();
  if (normalized === "dailymed") {
    return `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(id)}`;
  }
  return null;
};

const transformDrugCrossRefs = (crossRefs?: CrossReference[]): DrugCrossRefRow[] => {
  if (!crossRefs) return [];
  const rows: DrugCrossRefRow[] = [];

  crossRefs.forEach((ref, refIdx) => {
    ref.ids?.forEach((id, idIdx) => {
      rows.push({
        id: `${ref.source}-${refIdx}-${idIdx}`,
        source: ref.source || "Unknown",
        referenceId: id,
        url: getCrossRefHref(ref.source, id) ?? undefined,
      });
    });
  });

  return rows;
};

const transformLinkedEntities = (drug: Drug): LinkedEntityRow[] => {
  const rows: LinkedEntityRow[] = [];

  drug.linked_diseases?.rows?.forEach((id, idx) => {
    rows.push({ id: `disease-${idx}`, entityType: "Disease", entityId: id });
  });

  drug.linked_targets?.rows?.forEach((id, idx) => {
    rows.push({ id: `target-${idx}`, entityType: "Target", entityId: id });
  });

  drug.child_chembl_ids?.forEach((id, idx) => {
    rows.push({ id: `child-${idx}`, entityType: "Child Molecule", entityId: id });
  });

  return rows;
};

const transformNamesAndSynonyms = (drug: Drug): NameRow[] => {
  const rows: NameRow[] = [];

  drug.trade_names?.forEach((name, idx) => {
    rows.push({ id: `trade-${idx}`, nameType: "Trade Name", name });
  });

  drug.synonyms?.forEach((name, idx) => {
    rows.push({ id: `synonym-${idx}`, nameType: "Synonym", name });
  });

  return rows;
};

// ============================================================================
// Main Component
// ============================================================================

export function DrugOverview({ drug }: DrugOverviewProps) {
  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Transform data
  const crossRefData = useMemo(
    () => transformDrugCrossRefs(drug.cross_references),
    [drug.cross_references]
  );
  const linkedEntityData = useMemo(() => transformLinkedEntities(drug), [drug]);
  const nameData = useMemo(() => transformNamesAndSynonyms(drug), [drug]);

  // Filters
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState<string>("all");

  // Filtered data
  const filteredEntityData = useMemo(() => {
    if (entityFilter === "all") return linkedEntityData;
    const filterMap: Record<string, LinkedEntityRow["entityType"]> = {
      disease: "Disease",
      target: "Target",
      child: "Child Molecule",
    };
    return linkedEntityData.filter((row) => row.entityType === filterMap[entityFilter]);
  }, [linkedEntityData, entityFilter]);

  const filteredNameData = useMemo(() => {
    if (nameFilter === "all") return nameData;
    const filterMap: Record<string, NameRow["nameType"]> = {
      trade: "Trade Name",
      synonym: "Synonym",
    };
    return nameData.filter((row) => row.nameType === filterMap[nameFilter]);
  }, [nameData, nameFilter]);

  // Counts for subtitle
  const linkedDiseaseCount = linkedEntityData.filter((r) => r.entityType === "Disease").length;
  const linkedTargetCount = linkedEntityData.filter((r) => r.entityType === "Target").length;
  const childCount = linkedEntityData.filter((r) => r.entityType === "Child Molecule").length;

  // Dimension configs
  const entityDimensions: DimensionConfig[] = [
    {
      label: "Entity Type",
      options: [
        { value: "all", label: "All" },
        { value: "disease", label: "Diseases" },
        { value: "target", label: "Targets" },
        { value: "child", label: "Child Molecules" },
      ],
      value: entityFilter,
      onChange: setEntityFilter,
      presentation: "segmented",
    },
  ];

  const nameDimensions: DimensionConfig[] = [
    {
      label: "Name Type",
      options: [
        { value: "all", label: "All Names" },
        { value: "trade", label: "Trade Names" },
        { value: "synonym", label: "Synonyms" },
      ],
      value: nameFilter,
      onChange: setNameFilter,
      presentation: "segmented",
    },
  ];

  // Column definitions
  const crossRefColumns: ColumnDef<DrugCrossRefRow>[] = [
    {
      id: "source",
      accessorKey: "source",
      header: "Source",
      enableSorting: true,
    },
    {
      id: "referenceId",
      accessorKey: "referenceId",
      header: "Reference ID",
      enableSorting: true,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.referenceId}</span>,
    },
    {
      id: "link",
      header: "Link",
      cell: ({ row }) => {
        if (!row.original.url) return "—";
        return (
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        );
      },
    },
  ];

  const linkedEntityColumns: ColumnDef<LinkedEntityRow>[] = [
    {
      id: "entityType",
      accessorKey: "entityType",
      header: "Entity Type",
      enableSorting: true,
    },
    {
      id: "entityId",
      accessorKey: "entityId",
      header: "Entity ID",
      enableSorting: true,
      cell: ({ row }) => <ClickableEntityId id={row.original.entityId} mono />,
    },
  ];

  const nameColumns: ColumnDef<NameRow>[] = [
    {
      id: "nameType",
      accessorKey: "nameType",
      header: "Type",
      enableSorting: true,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
    },
  ];

  // Safety status helpers
  const withdrawnStatus =
    drug.is_withdrawn === true ? "Yes" : drug.is_withdrawn === false ? "No" : "Unknown";
  const withdrawnClasses =
    drug.is_withdrawn === true
      ? "bg-red-100 text-red-700"
      : drug.is_withdrawn === false
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-50 text-slate-500";
  const blackBoxStatus =
    drug.has_black_box_warning === true
      ? "Yes"
      : drug.has_black_box_warning === false
        ? "No"
        : "Unknown";
  const blackBoxClasses =
    drug.has_black_box_warning === true
      ? "bg-orange-100 text-orange-700"
      : drug.has_black_box_warning === false
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-50 text-slate-500";

  return (
    <div className="space-y-6">
      {/* Summary */}
      {drug.description && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-relaxed">
            {drug.description}
          </CardContent>
        </Card>
      )}

      {/* Info Cards - 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Basic Info Card */}
        {drug.parent_id && (
          <Card>
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Basic Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Parent Molecule
                  </dt>
                  <dd className="text-sm font-mono font-medium text-slate-900 mt-0.5">
                    {drug.parent_id}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Chemistry Card */}
        {(drug.canonical_smiles || drug.inchi_key) && (
          <Card>
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Chemistry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Molecule Structure Visualization */}
                {drug.canonical_smiles && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Structure
                    </dt>
                    <dd className="flex justify-center">
                      <MoleculeViewer smiles={drug.canonical_smiles} width={350} height={250} />
                    </dd>
                  </div>
                )}

                {drug.inchi_key && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        InChIKey
                      </dt>
                      <button
                        onClick={() => copyToClipboard(drug.inchi_key!)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <dd className="text-xs font-mono text-slate-700 bg-slate-50 rounded-lg p-2.5 break-all">
                      {drug.inchi_key}
                    </dd>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Safety Card */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Safety
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Withdrawn
                </dt>
                <dd className="text-sm font-medium mt-0.5">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                      withdrawnClasses
                    )}
                  >
                    {withdrawnStatus}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Black Box Warning
                </dt>
                <dd className="text-sm font-medium mt-0.5">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                      blackBoxClasses
                    )}
                  >
                    {blackBoxStatus}
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Tables - full width */}
      {crossRefData.length > 0 && (
        <DataSurface
          columns={crossRefColumns}
          data={crossRefData}
          title="Cross References"
          subtitle="External database identifiers for this drug across pharmaceutical and chemical databases"
          searchPlaceholder="Search references..."
          searchColumn="referenceId"
          exportable
          exportFilename={`drug-${drug.chembl_id}-cross-refs`}
          defaultPageSize={10}
        />
      )}

      {linkedEntityData.length > 0 && (
        <DataSurface
          columns={linkedEntityColumns}
          data={filteredEntityData}
          title="Linked Entities"
          subtitle={`Biological associations including ${linkedDiseaseCount} diseases, ${linkedTargetCount} protein targets, and ${childCount} related molecular structures`}
          searchPlaceholder="Search entity IDs..."
          searchColumn="entityId"
          dimensions={entityDimensions}
          exportable
          exportFilename={`drug-${drug.chembl_id}-linked-entities`}
          defaultPageSize={10}
        />
      )}

      {nameData.length > 0 && (
        <DataSurface
          columns={nameColumns}
          data={filteredNameData}
          title="Names & Synonyms"
          subtitle="Brand names, trade names, and alternative chemical nomenclature for this compound"
          searchPlaceholder="Search names..."
          searchColumn="name"
          dimensions={nameDimensions}
          exportable
          exportFilename={`drug-${drug.chembl_id}-names`}
          defaultPageSize={10}
        />
      )}
    </div>
  );
}
