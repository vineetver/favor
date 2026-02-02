"use client";

import { BatchWizard } from "@features/batch";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BatchAnnotationClient() {
  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-100/40 blur-[150px] mix-blend-multiply opacity-60" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] mix-blend-multiply opacity-60" />
      </div>

      <main className="relative z-10 pt-24 pb-32 px-6 sm:px-8 lg:px-12 max-w-4xl mx-auto">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Batch Wizard */}
        <BatchWizard />

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <Link
            href="/docs/batch-annotation"
            className="text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            Need help with file formats?
          </Link>
        </div>
      </main>
    </div>
  );
}
