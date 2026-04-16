import { ShareTokenProvider } from "@features/batch";
import { RequireAuth } from "@shared/components/require-auth";
import { Suspense } from "react";
import { AnalyticsClient } from "./analytics-client";

interface AnalyticsPageProps {
  params: Promise<{ job_id: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { job_id } = await params;
  return (
    <RequireAuth>
      {/* ShareTokenProvider uses useSearchParams, which needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <ShareTokenProvider>
          <AnalyticsClient jobId={job_id} />
        </ShareTokenProvider>
      </Suspense>
    </RequireAuth>
  );
}
