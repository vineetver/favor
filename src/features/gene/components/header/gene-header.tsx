"use client";

import type { Gene } from "@features/gene/types";
import { Button } from "@shared/components/ui/button";
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
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {genome.toUpperCase()}
        </span>
        <span className="text-border">·</span>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
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
            <span className="text-lg font-mono text-muted-foreground">
              {gene.gene_id_versioned}
            </span>
          </div>

          {/* Gene Info Row */}
          <div className="flex items-center gap-4 flex-wrap text-sm">
            {gene.gene_name && (
              <span className="text-body">{gene.gene_name}</span>
            )}

            <span className="font-mono text-subtle">
              {gene.chromosome}:{gene.start_position}-{gene.end_position}
            </span>

            {gene.gene_type && (
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                {gene.gene_type}
              </span>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" aria-label="Share gene">
            <Share2 className="w-5 h-5" />
          </Button>

          <Button variant="outline">
            <Download />
            Generate Report
          </Button>
        </div>
      </div>
    </div>
  );
}
