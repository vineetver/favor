import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

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
    <div className="rounded-lg border border-border/50 bg-card shadow-md text-sm">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 sm:px-6 border-b border-border/40">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            AI-Powered Analysis by{" "}
            <button
              onClick={onChatClick}
              className="inline-flex items-center rounded-md text-foreground hover:bg-muted/50 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-border px-1 py-0.5"
              aria-label="Open FAVOR-GPT chat"
            >
              FAVOR-GPT
            </button>
          </h2>
          {isUpdating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 pb-5 sm:px-6">{children}</div>
    </div>
  );
}
