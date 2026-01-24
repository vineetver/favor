import type { Disease } from "@features/disease/types";
import { Download, Share2 } from "lucide-react";

interface DiseaseHeaderProps {
  disease: Disease;
}

export function DiseaseHeader({ disease }: DiseaseHeaderProps) {
  if (!disease) return null;

  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-3 text-breadcrumb mb-4">
        <span className="text-subtle">Diseases</span>
        <span className="text-slate-300">▸</span>
        <span className="text-breadcrumb-mono">{disease.disease_id}</span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <h1 className="text-page-title">
            {disease.name}
          </h1>

          {/* Status Chips Row */}
          {disease.leaf && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                Leaf Node
              </span>
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Action Buttons */}
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Share disease"
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
