import type { Metadata } from "next";
import { JobsListClient } from "./jobs-list-client";

export const metadata: Metadata = {
  title: "Batch Jobs | FAVOR",
  description: "View and manage your batch annotation jobs",
};

export default function BatchJobsPage() {
  return <JobsListClient />;
}
