import type { Disease } from "@features/disease/types";
import { Button } from "@shared/components/ui/button";
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
        <span className="text-border">▸</span>
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Share disease"
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
