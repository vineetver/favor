"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";
import type { Target } from "@/lib/opentargets/types";

interface TargetTractabilityDisplayProps {
  target: Target;
  geneName: string;
}

const MODALITY_CATEGORIES = {
  "Small molecule": [
    "Approved Drug",
    "Advanced Clinical", 
    "Phase 1 Clinical",
    "Structure with Ligand",
    "High-Quality Ligand",
    "High-Quality Pocket",
    "Med-Quality Pocket",
    "Druggable Family"
  ],
  "Antibody": [
    "Approved Drug",
    "Advanced Clinical",
    "Phase 1 Clinical", 
    "UniProt loc high conf",
    "GO CC high conf",
    "UniProt loc med conf",
    "UniProt SigP or TMHMM",
    "GO CC med conf",
    "Human Protein Atlas loc"
  ],
  "PROTAC": [
    "Approved Drug",
    "Advanced Clinical",
    "Phase 1 Clinical",
    "Literature",
    "UniProt Ubiquitination",
    "Database Ubiquitination",
    "Half-life Data",
    "Small Molecule Binder"
  ],
  "Other modalities": [
    "Approved Drug",
    "Advanced Clinical", 
    "Phase 1 Clinical"
  ]
} as const;

const MODALITY_ORDER = [
  "Small molecule",
  "Antibody", 
  "PROTAC",
  "Other modalities"
] as const;

export function TargetTractabilityDisplay({ target, geneName }: TargetTractabilityDisplayProps) {
  const tractability = target.tractability || [];

  const groupedByModality = MODALITY_ORDER.reduce((acc, modality) => {
    acc[modality] = MODALITY_CATEGORIES[modality].map(categoryLabel => {
      const foundItem = tractability.find(item => item.label === categoryLabel);
      return foundItem || { label: categoryLabel, modality, value: false };
    });
    return acc;
  }, {} as Record<string, Array<{ label: string; modality: string; value: boolean }>>);

  if (tractability.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No tractability data found for {geneName} in OpenTargets Platform
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {MODALITY_ORDER.map((modality) => {
            const items = groupedByModality[modality] || [];
            const hasAnyData = items.some(item => item.value);
            
            return (
              <div key={modality} className="space-y-3">
                <h3 className="font-medium text-gray-900">{modality}</h3>
                <div className="space-y-2">
                  {hasAnyData ? (
                    items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {item.value ? (
                          <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-gray-300 flex-shrink-0" />
                        )}
                        <span className={item.value ? "text-gray-900" : "text-gray-400"}>
                          {item.label}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">No data available</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}