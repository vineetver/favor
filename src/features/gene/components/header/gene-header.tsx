"use client";

import type { Gene } from "@features/gene/types";
import { Download, Share2 } from "lucide-react";

interface GeneHeaderProps {
  gene: Gene;
  genome?: "hg38" | "hg19";
}

export function GeneHeader({ gene, genome = "hg38" }: GeneHeaderProps) {
  return (
    <div className="py-8">
      {/* Breadcrumb Row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          {genome.toUpperCase()}
        </span>
        <span className="text-slate-300">·</span>
        <span className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          Gene
        </span>
      </div>

      {/* Main Content Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-page-title">{gene.gene_symbol}</h1>
            <span className="text-lg font-mono text-slate-400">
              {gene.gene_id_versioned}
            </span>
          </div>

          {/* Gene Info Row */}
          <div className="flex items-center gap-6 flex-wrap text-sm">
            {/* Gene Name */}
            {gene.gene_name && (
              <div className="flex items-center gap-2">
                <span className="text-label">Name</span>
                <span className="font-medium text-slate-700">
                  {gene.gene_name}
                </span>
              </div>
            )}

            {/* Location */}
            <div className="flex items-center gap-2">
              <span className="text-label">Location</span>
              <span className="font-mono text-slate-700">
                {gene.chromosome}:{gene.start_position}-
                {gene.end_position}
              </span>
            </div>

            {/* Strand */}
            <div className="flex items-center gap-2">
              <span className="text-label">Strand</span>
              <span className="font-mono text-slate-700">{gene.strand}</span>
            </div>

            {/* Gene Type */}
            {gene.gene_type && (
              <div className="flex items-center gap-2">
                <span className="text-label">Type</span>
                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                  {gene.gene_type}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Share gene"
          >
            <Share2 className="w-5 h-5" />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/25"
          >
            <Download className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
