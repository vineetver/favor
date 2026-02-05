import type { Drug } from "@features/drug/types";
import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Download, Share2 } from "lucide-react";

interface DrugHeaderProps {
  drug: Drug;
}

export function DrugHeader({ drug }: DrugHeaderProps) {
  if (!drug) return null;

  const getPhaseLabel = (phase: number | null): string => {
    if (phase === null) return "Unknown";
    if (phase === 4) return "Phase 4";
    if (phase === 3) return "Phase 3";
    if (phase === 2) return "Phase 2";
    if (phase === 1) return "Phase 1";
    if (phase === 0) return "Preclinical";
    return "Unknown";
  };

  const getApprovalStatus = (): { label: string; color: string } => {
    if (drug.is_withdrawn === true) {
      return {
        label: "Withdrawn",
        color: "bg-red-100 text-red-700 border-red-200",
      };
    }
    if (drug.is_approved === true) {
      return {
        label: "Approved",
        color: "bg-green-100 text-green-700 border-green-200",
      };
    }
    return {
      label: "Investigational",
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    };
  };

  const approvalStatus = getApprovalStatus();

  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-3 text-breadcrumb mb-4">
        <span className="text-subtle">Drugs</span>
        <span className="text-border">▸</span>
        <span className="text-breadcrumb-mono">{drug.chembl_id}</span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <h1 className="text-page-title">
            {drug.name}
          </h1>

          {/* Status Chips Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Drug Type */}
            {drug.drug_type && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {drug.drug_type}
              </span>
            )}

            {/* Approval Status */}
            <span
              className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border",
                approvalStatus.color,
              )}
            >
              {approvalStatus.label}
            </span>

            {/* Max Phase */}
            {drug.max_clinical_trial_phase !== null &&
              drug.max_clinical_trial_phase !== undefined && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                  {getPhaseLabel(drug.max_clinical_trial_phase)}
                </span>
              )}
          </div>

          {/* Metadata Row */}
          {drug.year_first_approved ? (
            <div className="text-sm text-muted-foreground">
              First approved{" "}
              <span className="font-semibold text-foreground">
                {drug.year_first_approved}
              </span>
            </div>
          ) : null}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Action Buttons */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Share drug"
          >
            <Share2 className="w-5 h-5" />
          </Button>

          <Button>
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        </div>
      </div>
    </div>
  );
}
