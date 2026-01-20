import { Download, Share2 } from "lucide-react";
import type { Disease } from "@/features/disease/types";

interface DiseaseHeaderProps {
  disease: Disease;
}

export function DiseaseHeader({ disease }: DiseaseHeaderProps) {
  if (!disease) return null;

  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="text-slate-400">Diseases</span>
        <span className="text-slate-300">▸</span>
        <span className="font-mono text-slate-500">{disease.disease_id}</span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              {disease.name}
            </h1>
            <span className="text-lg font-mono text-slate-400">
              {disease.disease_id}
            </span>
          </div>

          {/* Status Chips Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Source */}
            {disease.source && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {disease.source}
              </span>
            )}

            {/* Disorder Type */}
            {disease.epidemiology?.disorder_type && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                {disease.epidemiology.disorder_type}
              </span>
            )}

            {/* Therapeutic Area */}
            {disease.isTherapeuticArea && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                Therapeutic Area
              </span>
            )}

            {/* Leaf Node */}
            {disease.leaf && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                Leaf Node
              </span>
            )}
          </div>

          {/* Metadata Row */}
          {disease.code && (
            <div className="text-sm text-slate-500">
              Code <span className="font-semibold font-mono text-slate-700">{disease.code}</span>
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
