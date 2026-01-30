import { fetchGene } from "@features/gene/api";
import { cn } from "@infra/utils";
import { notFound } from "next/navigation";
import { ExternalLink } from "@shared/components/ui/external-link";
import { NoDataState } from "@shared/components/ui/error-states";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";

interface TractabilityPageProps {
  params: Promise<{
    id: string;
  }>;
}

type TractabilityItem = {
  modality: string;
  id: string;
  value: boolean;
};

type TargetClassItem = {
  id: number;
  label: string;
  level: string;
};

const MODALITIES = ["SM", "AB", "PR", "OC"] as const;
const MODALITY_LABELS: Record<string, string> = {
  SM: "Small molecule",
  AB: "Antibody",
  PR: "PROTAC",
  OC: "Other",
};

// Clinical criteria (shared across all modalities)
const CLINICAL_CRITERIA = ["Approved Drug", "Advanced Clinical", "Phase 1 Clinical"];

// Evidence criteria per modality
const EVIDENCE_CRITERIA: Record<string, string[]> = {
  SM: [
    "Structure with Ligand",
    "High-Quality Ligand",
    "High-Quality Pocket",
    "Med-Quality Pocket",
    "Druggable Family",
  ],
  AB: [
    "UniProt loc high conf",
    "GO CC high conf",
    "UniProt loc med conf",
    "UniProt SigP or TMHMM",
    "GO CC med conf",
    "Human Protein Atlas loc",
  ],
  PR: [
    "Literature",
    "UniProt Ubiquitination",
    "Database Ubiquitination",
    "Half-life Data",
    "Small Molecule Binder",
  ],
  OC: [],
};

// Short labels for display
const SHORT_LABELS: Record<string, string> = {
  "Approved Drug": "Approved drug",
  "Advanced Clinical": "Advanced clinical",
  "Phase 1 Clinical": "Phase 1 clinical",
  "Structure with Ligand": "Structure + ligand",
  "High-Quality Ligand": "HQ ligand",
  "High-Quality Pocket": "HQ pocket",
  "Med-Quality Pocket": "Med pocket",
  "Druggable Family": "Druggable family",
  "UniProt loc high conf": "UniProt loc (high)",
  "GO CC high conf": "GO CC (high)",
  "UniProt loc med conf": "UniProt loc (med)",
  "UniProt SigP or TMHMM": "SigP / TMHMM",
  "GO CC med conf": "GO CC (med)",
  "Human Protein Atlas loc": "HPA localization",
  "Literature": "Literature",
  "UniProt Ubiquitination": "UniProt ubiq",
  "Database Ubiquitination": "DB ubiquitination",
  "Half-life Data": "Half-life data",
  "Small Molecule Binder": "Small mol binder",
};

export default async function TractabilityPage({ params }: TractabilityPageProps) {
  const { id } = await params;
  const geneResponse = await fetchGene(id);
  const gene = geneResponse?.data;

  if (!gene) {
    notFound();
  }

  const tractability: TractabilityItem[] = gene.opentargets?.tractability || [];
  const targetClass: TargetClassItem[] = gene.opentargets?.target_class || [];

  // Early return for empty state
  if (tractability.length === 0 && targetClass.length === 0) {
    return (
      <NoDataState
        categoryName="Tractability & Target Class"
        description="No tractability or target class data is available for this gene."
      />
    );
  }

  // Create lookup map: modality:id -> value
  const tractabilityMap = new Map<string, boolean>();
  for (const item of tractability) {
    tractabilityMap.set(`${item.modality}:${item.id}`, item.value);
  }

  const getValue = (modality: string, criteria: string): boolean => {
    return tractabilityMap.get(`${modality}:${criteria}`) ?? false;
  };

  // Calculate counts per modality
  const getCounts = (modality: string) => {
    const allCriteria = [...CLINICAL_CRITERIA, ...(EVIDENCE_CRITERIA[modality] || [])];
    const supported = allCriteria.filter((c) => getValue(modality, c)).length;
    return { supported, total: allCriteria.length };
  };

  const ensemblId = gene.gene_id_versioned?.split(".")[0] || id;

  return (
    <Card className="overflow-hidden border border-slate-200 py-0 gap-0">
      <CardHeader className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Tractability & Target Class
            </CardTitle>
            <div className="text-sm text-slate-500">
              Druggability assessment across different therapeutic modalities
            </div>
          </div>
          <ExternalLink
            href={`https://platform.opentargets.org/target/${ensemblId}`}
            className="text-sm text-slate-500 hover:text-primary"
            iconSize="sm"
          >
            Open Targets
          </ExternalLink>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Tractability Matrix */}
        {tractability.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200">
              {MODALITIES.map((modality) => (
                <ModalityColumn
                  key={modality}
                  modality={modality}
                  modalityLabel={MODALITY_LABELS[modality]}
                  counts={getCounts(modality)}
                  clinicalCriteria={CLINICAL_CRITERIA}
                  evidenceCriteria={EVIDENCE_CRITERIA[modality] || []}
                  getValue={getValue}
                  shortLabels={SHORT_LABELS}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Supported</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border-[1.5px] border-slate-300" />
                  <span>Not supported</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Target Class */}
        {targetClass.length > 0 && (
          <div className="px-6 py-5 border-t border-slate-200">
            <div className="space-y-3">
              <div>
                <h2 className="text-sm font-medium text-slate-600">Target Class</h2>
                <div className="text-sm text-slate-500">
                  Protein family classification from ChEMBL
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {targetClass.map((item, index) => (
                  <span
                    key={`${item.id}-${item.level}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                  >
                    <span className="text-slate-900 font-medium">{item.label}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      L{item.level}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CriteriaRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", !value && "opacity-40")}>
      {value ? (
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      ) : (
        <span className="w-2 h-2 rounded-full border-[1.5px] border-slate-300 shrink-0" />
      )}
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}

interface ModalityColumnProps {
  modality: string;
  modalityLabel: string;
  counts: { supported: number; total: number };
  clinicalCriteria: string[];
  evidenceCriteria: string[];
  getValue: (modality: string, criteria: string) => boolean;
  shortLabels: Record<string, string>;
}

function ModalityColumn({
  modality,
  modalityLabel,
  counts,
  clinicalCriteria,
  evidenceCriteria,
  getValue,
  shortLabels,
}: ModalityColumnProps) {
  const isActive = counts.supported > 0;

  return (
    <div className={cn("flex flex-col", isActive && "bg-emerald-50/30")}>
      {/* Column Header */}
      <div className="px-6 py-3.5 bg-slate-50/50 border-b border-slate-200">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {modalityLabel}
            </span>
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <div className="text-sm text-slate-500">
            {counts.supported}/{counts.total} criteria
          </div>
        </div>
      </div>

      {/* Clinical Section */}
      <div className="bg-slate-100/80 px-6 py-1.5">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Clinical
        </span>
      </div>
      <div className="px-6 py-2.5 space-y-2">
        {clinicalCriteria.map((criteria) => (
          <CriteriaRow
            key={criteria}
            label={shortLabels[criteria] || criteria}
            value={getValue(modality, criteria)}
          />
        ))}
      </div>

      {/* Evidence Section - only if modality has evidence criteria */}
      {evidenceCriteria.length > 0 && (
        <>
          <div className="bg-slate-100/80 px-6 py-1.5">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Evidence
            </span>
          </div>
          <div className="px-6 py-2.5 space-y-2">
            {evidenceCriteria.map((criteria) => (
              <CriteriaRow
                key={criteria}
                label={shortLabels[criteria] || criteria}
                value={getValue(modality, criteria)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
