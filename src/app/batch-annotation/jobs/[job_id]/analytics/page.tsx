import { AnalyticsClient } from "./analytics-client";

interface AnalyticsPageProps {
  params: Promise<{ job_id: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { job_id } = await params;
  return <AnalyticsClient jobId={job_id} />;
}
