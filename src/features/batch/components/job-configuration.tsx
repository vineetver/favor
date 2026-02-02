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
import type { ValidateResponse } from "../types";

// ============================================================================
// Types
// ============================================================================

interface JobConfigurationProps {
  validation: ValidateResponse;
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
  validation,
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
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
          <FileOutput className="w-3.5 h-3.5" />
          Output options
        </div>

        {/* Include Not Found Toggle */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="space-y-1">
            <Label
              htmlFor={switchId}
              className="text-sm font-medium text-slate-900 cursor-pointer"
            >
              Include unmatched variants
            </Label>
            <p className="text-xs text-slate-500">
              Output rows for variants not found in database.{" "}
              <span className="text-slate-400">Increases output file size.</span>
            </p>
          </div>
          <Switch
            id={switchId}
            checked={includeNotFound}
            onCheckedChange={setIncludeNotFound}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Section: Notifications (Collapsed) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <Bell className="w-3.5 h-3.5" />
            Notifications
            <span className="normal-case font-normal text-slate-400">(optional)</span>
          </div>
          {showNotifications ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showNotifications && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={emailId} className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
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
              <p className="text-xs text-slate-500">
                We'll send a single email when your job finishes (success or failure).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button - Always visible, right-aligned feel */}
      <div className="pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            {validation.is_estimate ? "~" : ""}
            {formatNumber(validation.estimated_rows)} variants to process
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
