import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface VariantSummaryCardProps {
  children: ReactNode;
  onChatClick: () => void;
  isUpdating?: boolean;
}

/**
 * Reusable card wrapper for the variant summary component
 * Provides consistent styling and header with FAVOR-GPT branding
 */
export function VariantSummaryCard({
  children,
  onChatClick,
  isUpdating = false,
}: VariantSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            AI-Powered Analysis by{" "}
            <button
              onClick={onChatClick}
              className="inline-flex items-center rounded-lg text-slate-900 hover:bg-slate-100 hover:text-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 px-1.5 py-0.5"
              aria-label="Open FAVOR-GPT chat"
            >
              FAVOR-GPT
            </button>
          </h2>
          {isUpdating && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-base text-slate-500 leading-relaxed">
        {children}
      </CardContent>
    </Card>
  );
}
