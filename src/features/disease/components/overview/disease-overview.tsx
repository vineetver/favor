"use client";

import { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Disease, DiseaseSynonyms, DiseasePrevalence } from "@features/disease/types/disease";
import { cn } from "@infra/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { ClickableEntityId } from "@shared/components/ui/clickable-entity-id";
import { DataSurface } from "@shared/components/ui/data-surface/data-surface";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";

interface DiseaseOverviewProps {
  disease: Disease;
}

// ============================================================================
// Table Row Types
// ============================================================================

interface CrossRefRow {
  id: string;
  source: string;
  referenceId: string;
}

interface OntologyRow {
  id: string;
  relationshipType: "Parent" | "Ancestor" | "Child" | "Descendant" | "Therapeutic Area";
  entityId: string;
}

interface SynonymRow {
  id: string;
  type: "Exact" | "Broad" | "Narrow" | "Related";
  synonym: string;
}

interface EpidemRow {
  id: string;
  geographic?: string;
  prevalenceClass?: string;
  prevalenceType?: string;
  value?: number;
  qualification?: string;
  validationStatus?: string;
  source?: string;
}

interface ObsoleteRow {
  id: string;
  type: "Term" | "Cross Reference";
  value: string;
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

const transformCrossRefs = (dbxrefs?: string[]): CrossRefRow[] => {
  if (!dbxrefs) return [];
  return dbxrefs.map((ref, idx) => {
    const [source, ...idParts] = ref.split(":");
    return {
      id: `${ref}-${idx}`,
      source: source || "Unknown",
      referenceId: idParts.join(":") || ref,
    };
  });
};

const transformOntologyRelationships = (disease: Disease): OntologyRow[] => {
  const rows: OntologyRow[] = [];

  disease.parents?.forEach((id, idx) => {
    rows.push({ id: `parent-${idx}`, relationshipType: "Parent", entityId: id });
  });
  disease.ancestors?.forEach((id, idx) => {
    rows.push({ id: `ancestor-${idx}`, relationshipType: "Ancestor", entityId: id });
  });
  disease.children?.forEach((id, idx) => {
    rows.push({ id: `child-${idx}`, relationshipType: "Child", entityId: id });
  });
  disease.descendants?.forEach((id, idx) => {
    rows.push({ id: `descendant-${idx}`, relationshipType: "Descendant", entityId: id });
  });
  disease.therapeutic_areas?.forEach((id, idx) => {
    rows.push({ id: `therapeutic-${idx}`, relationshipType: "Therapeutic Area", entityId: id });
  });

  return rows;
};

const transformSynonyms = (synonyms?: DiseaseSynonyms): SynonymRow[] => {
  if (!synonyms) return [];
  const rows: SynonymRow[] = [];

  synonyms.hasExactSynonym?.forEach((syn, idx) => {
    rows.push({ id: `exact-${idx}`, type: "Exact", synonym: syn });
  });
  synonyms.hasBroadSynonym?.forEach((syn, idx) => {
    rows.push({ id: `broad-${idx}`, type: "Broad", synonym: syn });
  });
  synonyms.hasNarrowSynonym?.forEach((syn, idx) => {
    rows.push({ id: `narrow-${idx}`, type: "Narrow", synonym: syn });
  });
  synonyms.hasRelatedSynonym?.forEach((syn, idx) => {
    rows.push({ id: `related-${idx}`, type: "Related", synonym: syn });
  });

  return rows;
};

const transformEpidemiology = (prevalence?: DiseasePrevalence[]): EpidemRow[] => {
  if (!prevalence) return [];
  return prevalence.map((prev, idx) => ({
    id: `prev-${idx}`,
    geographic: prev.geographic,
    prevalenceClass: prev.prevalence_class,
    prevalenceType: prev.prevalence_type,
    value: prev.value,
    qualification: prev.prevalence_qualification,
    validationStatus: prev.validation_status,
    source: prev.source,
  }));
};

const transformObsoleteTerms = (
  obsoleteTerms?: string[],
  obsoleteXrefs?: string[]
): ObsoleteRow[] => {
  const rows: ObsoleteRow[] = [];

  obsoleteTerms?.forEach((term, idx) => {
    rows.push({ id: `term-${idx}`, type: "Term", value: term });
  });
  obsoleteXrefs?.forEach((xref, idx) => {
    rows.push({ id: `xref-${idx}`, type: "Cross Reference", value: xref });
  });

  return rows;
};

// ============================================================================
// Main Component
// ============================================================================

export function DiseaseOverview({ disease }: DiseaseOverviewProps) {
  // Transform data
  const crossRefData = useMemo(() => transformCrossRefs(disease.dbxrefs), [disease.dbxrefs]);
  const ontologyData = useMemo(() => transformOntologyRelationships(disease), [disease]);
  const synonymData = useMemo(() => transformSynonyms(disease.synonyms), [disease.synonyms]);
  const epidemiologyData = useMemo(
    () => transformEpidemiology(disease.epidemiology?.prevalence),
    [disease.epidemiology?.prevalence]
  );
  const obsoleteData = useMemo(
    () => transformObsoleteTerms(disease.obsolete_terms, disease.obsolete_xrefs),
    [disease.obsolete_terms, disease.obsolete_xrefs]
  );

  // Filters
  const [relFilter, setRelFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Filtered data
  const filteredOntologyData = useMemo(() => {
    if (relFilter === "all") return ontologyData;
    const filterMap: Record<string, OntologyRow["relationshipType"]> = {
      parent: "Parent",
      ancestor: "Ancestor",
      child: "Child",
      descendant: "Descendant",
      therapeutic: "Therapeutic Area",
    };
    return ontologyData.filter((row) => row.relationshipType === filterMap[relFilter]);
  }, [ontologyData, relFilter]);

  const filteredSynonymData = useMemo(() => {
    if (typeFilter === "all") return synonymData;
    const filterMap: Record<string, SynonymRow["type"]> = {
      exact: "Exact",
      broad: "Broad",
      narrow: "Narrow",
      related: "Related",
    };
    return synonymData.filter((row) => row.type === filterMap[typeFilter]);
  }, [synonymData, typeFilter]);

  // Dimension configs
  const ontologyDimensions: DimensionConfig[] = [
    {
      label: "Relationship Type",
      options: [
        { value: "all", label: "All" },
        { value: "parent", label: "Parents" },
        { value: "ancestor", label: "Ancestors" },
        { value: "child", label: "Children" },
        { value: "descendant", label: "Descendants" },
        { value: "therapeutic", label: "Therapeutic Areas" },
      ],
      value: relFilter,
      onChange: setRelFilter,
      presentation: "dropdown",
    },
  ];

  const synonymDimensions: DimensionConfig[] = [
    {
      label: "Synonym Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "exact", label: "Exact" },
        { value: "broad", label: "Broad" },
        { value: "narrow", label: "Narrow" },
        { value: "related", label: "Related" },
      ],
      value: typeFilter,
      onChange: setTypeFilter,
      presentation: "segmented",
    },
  ];

  // Column definitions
  const crossRefColumns: ColumnDef<CrossRefRow>[] = [
    {
      id: "source",
      accessorKey: "source",
      header: "Source System",
      enableSorting: true,
    },
    {
      id: "referenceId",
      accessorKey: "referenceId",
      header: "Reference ID",
      enableSorting: true,
      cell: ({ row }) => <ClickableEntityId id={row.original.referenceId} mono />,
    },
  ];

  const ontologyColumns: ColumnDef<OntologyRow>[] = [
    {
      id: "relationshipType",
      accessorKey: "relationshipType",
      header: "Relationship Type",
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

  const synonymColumns: ColumnDef<SynonymRow>[] = [
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      enableSorting: true,
    },
    {
      id: "synonym",
      accessorKey: "synonym",
      header: "Synonym",
      enableSorting: true,
    },
  ];

  const epidemColumns: ColumnDef<EpidemRow>[] = [
    {
      id: "geographic",
      accessorKey: "geographic",
      header: "Geographic",
      enableSorting: true,
      cell: ({ row }) => row.original.geographic ?? "—",
    },
    {
      id: "prevalenceClass",
      accessorKey: "prevalenceClass",
      header: "Prevalence Class",
      enableSorting: true,
      cell: ({ row }) => row.original.prevalenceClass ?? "—",
    },
    {
      id: "prevalenceType",
      accessorKey: "prevalenceType",
      header: "Type",
      enableSorting: true,
      cell: ({ row }) => row.original.prevalenceType ?? "—",
    },
    {
      id: "value",
      accessorKey: "value",
      header: "Value",
      enableSorting: true,
      cell: ({ row }) => row.original.value?.toLocaleString() ?? "—",
    },
    {
      id: "qualification",
      accessorKey: "qualification",
      header: "Qualification",
      enableSorting: true,
      cell: ({ row }) => row.original.qualification ?? "—",
    },
    {
      id: "validationStatus",
      accessorKey: "validationStatus",
      header: "Validation",
      enableSorting: true,
      cell: ({ row }) => row.original.validationStatus ?? "—",
    },
    {
      id: "source",
      accessorKey: "source",
      header: "Source",
      enableSorting: true,
      cell: ({ row }) => row.original.source ?? "—",
    },
  ];

  const obsoleteColumns: ColumnDef<ObsoleteRow>[] = [
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      enableSorting: true,
    },
    {
      id: "value",
      accessorKey: "value",
      header: "Value",
      enableSorting: true,
      cell: ({ row }) =>
        row.original.type === "Cross Reference" ? (
          <ClickableEntityId id={row.original.value} mono />
        ) : (
          <span className="text-sm">{row.original.value}</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      {disease.description && (
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 leading-relaxed">
            {disease.description}
          </CardContent>
        </Card>
      )}

      {/* Info Cards - 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {disease.source && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Source
                  </dt>
                  <dd className="text-sm font-medium text-slate-900 mt-0.5">{disease.source}</dd>
                </div>
              )}
              {disease.code && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Code
                  </dt>
                  <dd className="text-sm font-mono font-medium text-slate-900 mt-0.5">
                    {disease.code}
                  </dd>
                </div>
              )}
              {disease.epidemiology?.orphanet_code && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Orphanet Code
                  </dt>
                  <dd className="text-sm font-mono font-medium text-slate-900 mt-0.5">
                    {disease.epidemiology.orphanet_code}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Classification Card */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {disease.epidemiology?.disorder_type && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Disorder Type
                  </dt>
                  <dd className="text-sm font-medium text-slate-900 mt-0.5">
                    {disease.epidemiology.disorder_type}
                  </dd>
                </div>
              )}
              {disease.isTherapeuticArea !== undefined && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Therapeutic Area
                  </dt>
                  <dd className="text-sm font-medium mt-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                        disease.isTherapeuticArea
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {disease.isTherapeuticArea ? "Yes" : "No"}
                    </span>
                  </dd>
                </div>
              )}
              {disease.leaf !== undefined && (
                <div>
                  <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Leaf Node
                  </dt>
                  <dd className="text-sm font-medium mt-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                        disease.leaf
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {disease.leaf ? "Yes" : "No"}
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Ontology Sources Card */}
        {disease.ontology?.sources && (
          <Card>
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Ontology Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                {disease.ontology.sources.name && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Name
                    </dt>
                    <dd className="text-sm font-medium text-slate-900 mt-0.5">
                      {disease.ontology.sources.name}
                    </dd>
                  </div>
                )}
                {disease.ontology.sources.url && (
                  <div>
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      URL
                    </dt>
                    <dd className="text-sm mt-0.5">
                      <a
                        href={disease.ontology.sources.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        {disease.ontology.sources.url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tables - full width */}
      {crossRefData.length > 0 && (
        <DataSurface
          columns={crossRefColumns}
          data={crossRefData}
          title="Cross References"
          subtitle="External database identifiers and references for this disease across multiple biomedical databases"
          searchPlaceholder="Search references..."
          searchColumn="referenceId"
          exportable
          exportFilename={`disease-${disease.disease_id}-cross-refs`}
          defaultPageSize={10}
        />
      )}

      {ontologyData.length > 0 && (
        <DataSurface
          columns={ontologyColumns}
          data={filteredOntologyData}
          title="Ontology Relationships"
          subtitle="Disease hierarchy showing parent-child relationships, ancestors, descendants, and therapeutic area classifications"
          searchPlaceholder="Search entity IDs..."
          searchColumn="entityId"
          dimensions={ontologyDimensions}
          exportable
          exportFilename={`disease-${disease.disease_id}-ontology`}
          defaultPageSize={10}
        />
      )}

      {synonymData.length > 0 && (
        <DataSurface
          columns={synonymColumns}
          data={filteredSynonymData}
          title="Synonyms"
          subtitle="Alternative names and terminology used to describe this disease, including exact, broad, narrow, and related terms"
          searchPlaceholder="Search synonyms..."
          searchColumn="synonym"
          dimensions={synonymDimensions}
          exportable
          exportFilename={`disease-${disease.disease_id}-synonyms`}
          defaultPageSize={10}
        />
      )}

      {epidemiologyData.length > 0 && (
        <DataSurface
          columns={epidemColumns}
          data={epidemiologyData}
          title="Epidemiology"
          subtitle="Disease prevalence statistics including geographic distribution, prevalence classes, and validation status from clinical sources"
          exportable
          exportFilename={`disease-${disease.disease_id}-epidemiology`}
          defaultPageSize={10}
        />
      )}

      {obsoleteData.length > 0 && (
        <DataSurface
          columns={obsoleteColumns}
          data={obsoleteData}
          title="Obsolete Terms & References"
          subtitle="Deprecated terminology and database references that are no longer actively used but maintained for historical tracking"
          searchPlaceholder="Search obsolete terms..."
          searchColumn="value"
          exportable
          exportFilename={`disease-${disease.disease_id}-obsolete`}
          defaultPageSize={10}
        />
      )}
    </div>
  );
}
