"use client";

import { useEffect, useMemo } from "react";
import { useMaveUrlState } from "../../hooks/use-mave-url-state";
import { defaultCalibrationTitle } from "../../lib/bands";
import type { MavedbVariant, Page, ScoresetDetail } from "../../types";
import { CalibrationCard } from "./calibration-card";
import { ChartCard } from "./chart-card";
import { DetailHero } from "./detail-hero";
import { VariantsTable } from "./variants-table";

interface ScoresetDetailViewProps {
  geneSymbol: string;
  detail: ScoresetDetail;
  variantsInitial?: Page<MavedbVariant>;
}

export function ScoresetDetailView({
  geneSymbol,
  detail,
  variantsInitial,
}: ScoresetDetailViewProps) {
  const { state, set } = useMaveUrlState();

  const fallbackCal = useMemo(
    () => defaultCalibrationTitle(detail.calibrations_by_title),
    [detail.calibrations_by_title],
  );
  const activeCal =
    state.cal && detail.calibrations_by_title[state.cal]
      ? state.cal
      : fallbackCal;

  // Mirror the resolved calibration into the URL once on mount so deep links
  // are stable. Idempotent — only writes when the URL is missing or stale.
  useEffect(() => {
    if (!activeCal) return;
    if (state.cal === activeCal) return;
    set({ cal: activeCal });
  }, [activeCal, state.cal, set]);

  const activeBands = activeCal
    ? (detail.calibrations_by_title[activeCal] ?? [])
    : [];
  const calibrationCount = Object.keys(detail.calibrations_by_title).length;

  return (
    <div className="space-y-5">
      <DetailHero
        geneSymbol={geneSymbol}
        detail={detail}
        variantCount={detail.scoreset.num_variants}
        calibrationCount={calibrationCount}
      />

      <ChartCard
        urn={detail.scoreset.urn}
        calibrationsByTitle={detail.calibrations_by_title}
        activeCalibration={activeCal}
        onActiveCalibrationChange={(title) => set({ cal: title })}
        view={state.view}
      />

      {activeCal && activeBands.length > 0 && (
        <CalibrationCard
          title={activeCal}
          bands={activeBands}
          active
          onActivate={() => {}}
          hideActivate
        />
      )}

      <VariantsTable
        urn={detail.scoreset.urn}
        bands={activeBands}
        totalVariants={detail.scoreset.num_variants}
        initialData={variantsInitial}
        searchQuery={state.q}
        scoreMin={state.smin}
        scoreMax={state.smax}
      />
    </div>
  );
}
