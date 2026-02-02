import type { Metadata } from "next";
import { JobDetailClient } from "./job-detail-client";

export const metadata: Metadata = {
  title: "Job Details | FAVOR",
  description: "View batch annotation job status and results",
};

interface PageProps {
  params: Promise<{ job_id: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { job_id } = await params;
  return <JobDetailClient jobId={job_id} />;
}
