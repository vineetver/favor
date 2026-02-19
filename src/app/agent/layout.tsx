import type { Metadata } from "next";

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
    <div className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-hidden bg-background shadow-[inset_0_1px_0_0_rgba(0,0,0,0.06),inset_0_4px_12px_-4px_rgba(0,0,0,0.05)]">
      {children}
    </div>
  );
}
