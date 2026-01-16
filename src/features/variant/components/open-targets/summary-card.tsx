"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  icon?: ReactNode;
  title: string;
  value: ReactNode;
  description?: string;
  color?: "default" | "red" | "orange" | "amber" | "emerald" | "blue" | "purple" | "gray";
  className?: string;
}

const colorStyles = {
  default: "bg-muted/50 border-border/50",
  red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50",
  orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/50",
  amber: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
  emerald: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
  blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
  purple: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50",
  gray: "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800/50",
};

export function SummaryCard({
  icon,
  title,
  value,
  description,
  color = "default",
  className,
}: SummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 flex flex-col gap-2",
        colorStyles[color],
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        <span>{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface SummarySectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function SummarySection({
  title,
  description,
  children,
  className,
}: SummarySectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {children}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color?: "red" | "orange" | "amber" | "emerald" | "blue" | "purple" | "gray";
}

const progressColors = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  gray: "bg-slate-500",
};

export function ProgressBar({ label, value, total, color = "blue" }: ProgressBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", progressColors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
