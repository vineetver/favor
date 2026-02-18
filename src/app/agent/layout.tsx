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
    <main className="mt-16 flex h-[calc(100vh-4rem)]">{children}</main>
  );
}
