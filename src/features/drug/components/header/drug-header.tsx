import { Download, Share2 } from "lucide-react";
import type { Drug } from "@/features/drug/types";
import { cn } from "@/lib/utils";

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
      return { label: "Withdrawn", color: "bg-red-100 text-red-700 border-red-200" };
    }
    if (drug.is_approved === true) {
      return { label: "Approved", color: "bg-green-100 text-green-700 border-green-200" };
    }
    return { label: "Investigational", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
  };

  const approvalStatus = getApprovalStatus();

  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="text-slate-400">Drugs</span>
        <span className="text-slate-300">▸</span>
        <span className="font-mono text-slate-500">{drug.chembl_id}</span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
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
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border",
              approvalStatus.color
            )}>
              {approvalStatus.label}
            </span>

            {/* Max Phase */}
            {drug.max_clinical_trial_phase !== null && drug.max_clinical_trial_phase !== undefined && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                {getPhaseLabel(drug.max_clinical_trial_phase)}
              </span>
            )}
          </div>

          {/* Metadata Row */}
          {drug.year_first_approved ? (
            <div className="text-sm text-slate-500">
              First approved <span className="font-semibold text-slate-700">{drug.year_first_approved}</span>
            </div>
          ) : null}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Action Buttons */}
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Share drug"
          >
            <Share2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/25"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
