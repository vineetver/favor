import type { Metadata } from "next";
import { RequireAuth } from "@shared/components/require-auth";
import { BatchAnnotationClient } from "./batch-annotation-client";

export const metadata: Metadata = {
  title: "Batch Annotation | FAVOR",
  description: "Upload VCF or CSV files for large-scale variant annotation",
};

export default function BatchAnnotationPage() {
  return (
    <RequireAuth>
      <BatchAnnotationClient />
    </RequireAuth>
  );
}
