import { fetchGene } from "@features/gene/api";
import { notFound } from "next/navigation";
import { ExternalLink } from "@shared/components/ui/external-link";
import { Card } from "@shared/components/ui/card";

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
  const gene = await fetchGene(id);

  if (!gene) {
    notFound();
  }

  const tractability: TractabilityItem[] = gene.opentargets?.tractability || [];
  const targetClass: TargetClassItem[] = gene.opentargets?.target_class || [];

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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-heading">
            Tractability & Target Class
          </h1>
          <p className="text-[13px] text-subtle mt-0.5">
            Target druggability assessment
          </p>
        </div>
        <ExternalLink
          href={`https://platform.opentargets.org/target/${ensemblId}`}
          className="text-[11px] text-slate-400 hover:text-primary"
          iconSize="sm"
        >
          Open Targets
        </ExternalLink>
      </div>

      {/* Tractability Matrix */}
      {tractability.length > 0 && (
        <Card className="overflow-hidden p-0">
          <table className="w-full">
            {/* Header Row */}
            <thead>
              <tr className="border-b border-slate-200">
                {MODALITIES.map((modality) => {
                  const counts = getCounts(modality);
                  return (
                    <th
                      key={modality}
                      className="text-left px-5 py-4 border-r border-slate-100 last:border-r-0"
                    >
                      <span className="text-[13px] font-semibold text-heading">
                        {MODALITY_LABELS[modality]}
                      </span>
                      <span className="ml-1.5 text-[11px] font-normal text-subtle">
                        ({counts.supported}/{counts.total})
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Clinical Section Header */}
              <tr className="border-b border-slate-100">
                {MODALITIES.map((modality) => (
                  <td key={modality} className="px-5 pt-4 pb-2 border-r border-slate-100 last:border-r-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Clinical
                    </span>
                  </td>
                ))}
              </tr>
              {/* Clinical Rows */}
              {CLINICAL_CRITERIA.map((criteria) => (
                <tr key={criteria} className="border-b border-slate-50">
                  {MODALITIES.map((modality) => (
                    <td key={modality} className="px-5 py-1.5 border-r border-slate-100 last:border-r-0">
                      <CriteriaRow
                        label={SHORT_LABELS[criteria] || criteria}
                        value={getValue(modality, criteria)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {/* Evidence Section Header */}
              <tr className="border-b border-slate-100">
                {MODALITIES.map((modality) => (
                  <td key={modality} className="px-5 pt-4 pb-2 border-r border-slate-100 last:border-r-0">
                    {EVIDENCE_CRITERIA[modality]?.length > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Evidence
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              {/* Evidence Rows - padded to max length */}
              {Array.from({ length: maxEvidenceRows }).map((_, rowIndex) => (
                <tr key={`evidence-${rowIndex}`} className="border-b border-slate-50 last:border-b-0">
                  {MODALITIES.map((modality) => {
                    const criteria = EVIDENCE_CRITERIA[modality]?.[rowIndex];
                    return (
                      <td key={modality} className="px-5 py-1.5 border-r border-slate-100 last:border-r-0">
                        {criteria ? (
                          <CriteriaRow
                            label={SHORT_LABELS[criteria] || criteria}
                            value={getValue(modality, criteria)}
                          />
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Target Class Chips */}
      {targetClass.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-3">
            Target Class
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {targetClass.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[12px] font-medium text-slate-700"
              >
                {item.label}
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                  {item.level}
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {tractability.length === 0 && targetClass.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-[13px] text-slate-400">
            No tractability or target class data available.
          </p>
        </div>
      )}
    </div>
  );
}

function CriteriaRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 text-[13px] ${!value ? "opacity-40" : ""}`}>
      {value ? (
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
      ) : (
        <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
      )}
      <span className="text-slate-700">
        {label}
      </span>
    </div>
  );
}
