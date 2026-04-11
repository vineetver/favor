import { RequireAuth } from "@shared/components/require-auth";
import type { Metadata } from "next";
import { JobsListClient } from "./jobs-list-client";

export const metadata: Metadata = {
  title: "Batch Jobs | FAVOR",
  description: "View and manage your batch annotation jobs",
};

export default function BatchJobsPage() {
  return (
    <RequireAuth>
      <JobsListClient />
    </RequireAuth>
  );
}
