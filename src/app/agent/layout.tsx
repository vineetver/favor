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
    <div className="fixed inset-x-0 top-16 bottom-0 z-30 overflow-hidden border-t border-border/60 bg-background">
      {children}
    </div>
  );
}
