import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@shared/components/ui/card";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

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
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            AI-Powered Analysis by{" "}
            <Button
              variant="ghost"
              size="sm"
              onClick={onChatClick}
              aria-label="Open FAVOR-GPT chat"
              className="text-foreground hover:text-primary"
            >
              FAVOR-GPT
            </Button>
          </h2>
          {isUpdating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-base text-muted-foreground leading-relaxed">
        {children}
      </CardContent>
    </Card>
  );
}
