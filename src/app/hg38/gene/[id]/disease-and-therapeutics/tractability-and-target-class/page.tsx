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

  // Get max evidence rows for alignment
  const maxEvidenceRows = Math.max(...MODALITIES.map((m) => EVIDENCE_CRITERIA[m]?.length || 0));

  const ensemblId = gene.gene_id_versioned?.split(".")[0] || id;

  return (
    <Card className="overflow-hidden border border-slate-200 py-0 gap-0">
      <CardHeader className="border-b border-slate-200 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-heading">
              Tractability & Target Class
            </CardTitle>
            <div className="text-xs text-subtle">
              Target druggability assessment
            </div>
          </div>
          <ExternalLink
            href={`https://platform.opentargets.org/target/${ensemblId}`}
            className="text-xs text-subtle hover:text-primary"
            iconSize="sm"
          >
            Open Targets
          </ExternalLink>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Tractability Matrix */}
        {tractability.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header Row */}
              <thead>
                <tr className="border-b border-slate-200">
                  {MODALITIES.map((modality) => {
                    const counts = getCounts(modality);
                    return (
                      <th
                        key={modality}
                        className="text-left pl-8 pr-4 py-2.5"
                      >
                        <span className="text-body-sm font-semibold text-heading">
                          {MODALITY_LABELS[modality]}
                        </span>
                        <span className="ml-1.5 text-body-sm text-subtle">
                          ({counts.supported}/{counts.total})
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Clinical Section Header */}
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  {MODALITIES.map((modality) => (
                    <td key={modality} className="pl-8 pr-4 py-1.5">
                      <span className="text-label text-subtle">Clinical</span>
                    </td>
                  ))}
                </tr>
                {/* Clinical Rows */}
                {CLINICAL_CRITERIA.map((criteria) => (
                  <tr key={criteria} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                    {MODALITIES.map((modality) => (
                      <td key={modality} className="pl-4 pr-4 py-1.5">
                        <CriteriaRow
                          label={SHORT_LABELS[criteria] || criteria}
                          value={getValue(modality, criteria)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Evidence Section Header */}
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  {MODALITIES.map((modality) => (
                    <td key={modality} className="pl-8 pr-4 py-1.5">
                      {EVIDENCE_CRITERIA[modality]?.length > 0 ? (
                        <span className="text-label text-subtle">Evidence</span>
                      ) : (
                        <span className="text-label text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Evidence Rows - padded to max length */}
                {Array.from({ length: maxEvidenceRows }).map((_, rowIndex) => (
                  <tr key={`evidence-${rowIndex}`} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                    {MODALITIES.map((modality) => {
                      const criteria = EVIDENCE_CRITERIA[modality]?.[rowIndex];
                      return (
                        <td key={modality} className="px-4 py-1.5">
                          {criteria ? (
                            <CriteriaRow
                              label={SHORT_LABELS[criteria] || criteria}
                              value={getValue(modality, criteria)}
                            />
                          ) : (
                            <span className="text-body-sm text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Target Class */}
        {targetClass.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200">
            <h2 className="text-label text-subtle mb-2">
              Target Class
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {targetClass.map((item, index) => (
                <span
                  key={`${item.id}-${item.level}-${index}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-body-sm text-body font-medium"
                >
                  {item.label}
                  <span className="rounded bg-slate-100 px-1 py-0.5 text-caption">
                    {item.level}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

function CriteriaRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 text-body-sm", !value && "opacity-40")}>
      {value ? (
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      ) : (
        <span className="w-2 h-2 rounded-full border-[1.5px] border-slate-300 shrink-0" />
      )}
      <span className="text-body">{label}</span>
    </div>
  );
}
