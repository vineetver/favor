"use client";

import type { ContextHeaderProps } from "./types";

export function ContextHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: ContextHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
