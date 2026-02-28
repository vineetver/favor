import type { Metadata } from "next";
import { RequireAuth } from "@shared/components/require-auth";

export const metadata: Metadata = {
  title: "FAVOR-GPT",
  description: "AI-powered genomic analysis workspace",
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="fixed inset-x-0 top-0 bottom-0 z-30 overflow-hidden bg-background px-4 pb-4 pt-[5.75rem]">
        <div className="h-full overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_1px_3px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)]">
          {children}
        </div>
      </div>
    </RequireAuth>
  );
}
