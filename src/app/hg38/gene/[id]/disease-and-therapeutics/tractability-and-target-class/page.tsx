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
const MODALITY_LABELS: Record<string, { short: string; full: string }> = {
  SM: { short: "Small molecule", full: "Small molecule drugs that bind to target pockets" },
  AB: { short: "Antibody", full: "Antibody-based therapies targeting cell surface proteins" },
  PR: { short: "PROTAC", full: "Targeted protein degradation via ubiquitin-proteasome system" },
  OC: { short: "Other", full: "Other therapeutic modalities" },
};

const CLINICAL_CRITERIA = ["Approved Drug", "Advanced Clinical", "Phase 1 Clinical"];

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

const FRIENDLY_LABELS: Record<string, string> = {
  "Approved Drug": "Approved drug exists",
  "Advanced Clinical": "In advanced clinical trials",
  "Phase 1 Clinical": "In Phase 1 trials",
  "Structure with Ligand": "3D structure with bound molecule",
  "High-Quality Ligand": "High-quality chemical tool available",
  "High-Quality Pocket": "Well-defined binding pocket",
  "Med-Quality Pocket": "Moderate binding pocket",
  "Druggable Family": "Belongs to a druggable protein family",
  "UniProt loc high conf": "Cell surface location (high confidence)",
  "GO CC high conf": "Cell surface by Gene Ontology (high)",
  "UniProt loc med conf": "Cell surface location (moderate confidence)",
  "UniProt SigP or TMHMM": "Has signal peptide or transmembrane domain",
  "GO CC med conf": "Cell surface by Gene Ontology (moderate)",
  "Human Protein Atlas loc": "Localized by Human Protein Atlas",
  "Literature": "Published evidence",
  "UniProt Ubiquitination": "Known ubiquitination sites",
  "Database Ubiquitination": "Database-predicted ubiquitination",
  "Half-life Data": "Protein half-life measured",
  "Small Molecule Binder": "Known small molecule binder",
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

  if (tractability.length === 0 && targetClass.length === 0) {
    return (
      <NoDataState
        categoryName="Tractability & Target Class"
        description="No tractability or target class data is available for this gene."
      />
    );
  }

  const tractabilityMap = new Map<string, boolean>();
  for (const item of tractability) {
    tractabilityMap.set(`${item.modality}:${item.id}`, item.value);
  }

  const getValue = (modality: string, criteria: string): boolean => {
    return tractabilityMap.get(`${modality}:${criteria}`) ?? false;
  };

  const getCounts = (modality: string) => {
    const allCriteria = [...CLINICAL_CRITERIA, ...(EVIDENCE_CRITERIA[modality] || [])];
    const supported = allCriteria.filter((c) => getValue(modality, c)).length;
    return { supported, total: allCriteria.length };
  };

  const ensemblId = gene.gene_id_versioned?.split(".")[0] || id;

  return (
    <Card className="overflow-hidden border border-border py-0 gap-0">
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Tractability & Target Class
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              Can this target be reached by different types of drugs?
            </div>
          </div>
          <ExternalLink
            href={`https://platform.opentargets.org/target/${ensemblId}`}
            className="text-xs text-primary hover:underline"
            iconSize="sm"
          >
            Open Targets
          </ExternalLink>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {tractability.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
              {MODALITIES.map((modality) => (
                <ModalityColumn
                  key={modality}
                  modality={modality}
                  counts={getCounts(modality)}
                  clinicalCriteria={CLINICAL_CRITERIA}
                  evidenceCriteria={EVIDENCE_CRITERIA[modality] || []}
                  getValue={getValue}
                />
              ))}
            </div>

            <div className="px-5 py-2.5 border-t border-border bg-muted/40">
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
                  <span>Supported</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  <span>Not supported</span>
                </div>
              </div>
            </div>
          </>
        )}

        {targetClass.length > 0 && (
          <div className="px-5 py-5 border-t border-border">
            <div className="space-y-2.5">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Target Class
              </div>
              <div className="flex flex-wrap gap-1.5">
                {targetClass.map((item, index) => (
                  <span
                    key={`${item.id}-${item.level}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded bg-muted px-2 py-1 text-[11px]"
                  >
                    <span className="text-foreground font-medium">{item.label}</span>
                    <span className="text-muted-foreground">L{item.level}</span>
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
    <div className={cn("flex items-center gap-2", !value && "opacity-30")}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          value ? "bg-emerald-500" : "bg-border",
        )}
      />
      <span className="text-[13px] text-foreground">{label}</span>
    </div>
  );
}

interface ModalityColumnProps {
  modality: string;
  counts: { supported: number; total: number };
  clinicalCriteria: string[];
  evidenceCriteria: string[];
  getValue: (modality: string, criteria: string) => boolean;
}

function ModalityColumn({
  modality,
  counts,
  clinicalCriteria,
  evidenceCriteria,
  getValue,
}: ModalityColumnProps) {
  const meta = MODALITY_LABELS[modality];
  const isActive = counts.supported > 0;

  return (
    <div className="flex flex-col">
      <div className="px-5 py-3 bg-muted/40 border-b border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-foreground">
              {meta.short}
            </span>
            {isActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {counts.supported}/{counts.total} criteria
          </div>
        </div>
      </div>

      <div className="bg-muted/60 px-5 py-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          Clinical
        </span>
      </div>
      <div className="px-5 py-2 space-y-1.5">
        {clinicalCriteria.map((criteria) => (
          <CriteriaRow
            key={criteria}
            label={FRIENDLY_LABELS[criteria] || criteria}
            value={getValue(modality, criteria)}
          />
        ))}
      </div>

      {evidenceCriteria.length > 0 && (
        <>
          <div className="bg-muted/60 px-5 py-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Evidence
            </span>
          </div>
          <div className="px-5 py-2 space-y-1.5">
            {evidenceCriteria.map((criteria) => (
              <CriteriaRow
                key={criteria}
                label={FRIENDLY_LABELS[criteria] || criteria}
                value={getValue(modality, criteria)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
