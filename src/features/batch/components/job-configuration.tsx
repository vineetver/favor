"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import {
  Bell,
  ChevronDown,
  ChevronUp,
  FileOutput,
  Loader2,
  Mail,
  Play,
} from "lucide-react";
import { useId, useState } from "react";
import { getDataTypeLabel } from "../lib/format";
import type { DataType, TypedValidateResponse } from "../types";

// ============================================================================
// Types
// ============================================================================

interface JobConfigurationProps {
  typedValidation: TypedValidateResponse;
  dataType: DataType | string;
  isTypedCohort: boolean;
  onSubmit: (config: JobConfig) => void;
  isSubmitting?: boolean;
  className?: string;
}

export interface JobConfig {
  includeNotFound: boolean;
  email?: string;
  orgName?: string;
}

// ============================================================================
// Utilities
// ============================================================================

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

// ============================================================================
// Main Component
// ============================================================================

export function JobConfiguration({
  typedValidation,
  dataType,
  isTypedCohort,
  onSubmit,
  isSubmitting = false,
  className,
}: JobConfigurationProps) {
  const [includeNotFound, setIncludeNotFound] = useState(true);
  const [email, setEmail] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const switchId = useId();
  const emailId = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      includeNotFound,
      email: email.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>
      {/* Section: Output Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <FileOutput className="w-3.5 h-3.5" />
          Output options
        </div>

        {/* Typed cohort summary */}
        {isTypedCohort && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border border-border">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{getDataTypeLabel(dataType)}</span>
              <span className="ml-2">
                {typedValidation.schema_preview.length} columns mapped
              </span>
            </div>
          </div>
        )}

        {/* Include Not Found Toggle — only for variant lists */}
        {!isTypedCohort && (
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted border border-border">
            <div className="space-y-1">
              <Label
                htmlFor={switchId}
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Include unmatched variants
              </Label>
              <p className="text-xs text-muted-foreground">
                Output rows for variants not found in database.{" "}
                <span className="text-muted-foreground/70">Increases output file size.</span>
              </p>
            </div>
            <Switch
              id={switchId}
              checked={includeNotFound}
              onCheckedChange={setIncludeNotFound}
              disabled={isSubmitting}
            />
          </div>
        )}
      </div>

      {/* Section: Notifications (Collapsed) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <Bell className="w-3.5 h-3.5" />
            Notifications
            <span className="normal-case font-normal text-muted-foreground/70">(optional)</span>
          </div>
          {showNotifications ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground/70" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
          )}
        </button>

        {showNotifications && (
          <div className="p-4 rounded-lg bg-muted border border-border space-y-4">
            <div className="space-y-2">
              <Label htmlFor={emailId} className="text-sm font-medium text-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                Email when complete
              </Label>
              <Input
                id={emailId}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                We'll send a single email when your job finishes (success or failure).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button - Always visible, right-aligned feel */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            ~{formatNumber(typedValidation.row_count_estimate)} rows to process
          </div>
          <Button type="submit" disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Processing
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
