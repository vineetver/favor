"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import type { Target, AssociatedDrug } from "@/lib/opentargets/types";

interface TargetDrugsDisplayProps {
  target: Target & { knownDrugs: { count: number; rows: AssociatedDrug[] } };
  geneName: string;
}

const PHASE_COLORS = {
  0: "bg-gray-100 text-gray-800",
  1: "bg-blue-100 text-blue-800",
  2: "bg-green-100 text-green-800",
  3: "bg-orange-100 text-orange-800",
  4: "bg-purple-100 text-purple-800",
} as const;

const PHASE_LABELS = {
  0: "Preclinical",
  1: "Phase I",
  2: "Phase II",
  3: "Phase III",
  4: "Approved",
} as const;

export function TargetDrugsDisplay({
  target,
  geneName,
}: TargetDrugsDisplayProps) {
  const drugs = target.knownDrugs?.rows || [];

  if (drugs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No known drugs found for {geneName} in OpenTargets Platform
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {target.knownDrugs.count} Known Drugs
        </h2>
        <Badge variant="outline">{geneName}</Badge>
      </div>

      <div className="grid gap-4">
        {drugs.map((drugAssociation, index) => {
          const drug = drugAssociation.drug;
          const phase =
            drugAssociation.clinicalTrialPhase ||
            drug.maximumClinicalTrialPhase ||
            0;
          const phaseColor =
            PHASE_COLORS[phase as keyof typeof PHASE_COLORS] || PHASE_COLORS[0];
          const phaseLabel =
            PHASE_LABELS[phase as keyof typeof PHASE_LABELS] || "Unknown";

          return (
            <Card key={`${drug.id}-${index}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{drug.name}</CardTitle>
                      {drug.hasBeenWithdrawn && (
                        <Badge variant="destructive" className="text-xs">
                          Withdrawn
                        </Badge>
                      )}
                      {drug.blackBoxWarning && (
                        <Badge
                          variant="outline"
                          className="text-xs border-orange-500 text-orange-700"
                        >
                          Black Box Warning
                        </Badge>
                      )}
                    </div>

                    {drug.drugType && (
                      <p className="text-sm text-muted-foreground">
                        Type: {drug.drugType}
                      </p>
                    )}
                  </div>

                  <Badge className={phaseColor}>{phaseLabel}</Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {drugAssociation.mechanismOfAction && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Mechanism of Action
                    </div>
                    <p className="text-sm">
                      {drugAssociation.mechanismOfAction}
                    </p>
                  </div>
                )}

                {drugAssociation.approvedIndications &&
                  drugAssociation.approvedIndications.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Approved Indications
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {drugAssociation.approvedIndications.map(
                          (indication, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs"
                            >
                              {indication}
                            </Badge>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {drug.withdrawnReason && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Withdrawal Reason
                    </div>
                    <p className="text-sm text-red-600">
                      {drug.withdrawnReason}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Drug ID: {drug.id}
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
