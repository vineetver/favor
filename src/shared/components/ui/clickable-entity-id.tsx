"use client";

import { useSearch } from "@features/search";
import { cn } from "@infra/utils";

interface ClickableEntityIdProps {
  id: string;
  mono?: boolean;
  className?: string;
}

export function ClickableEntityId({ id, mono = false, className }: ClickableEntityIdProps) {
  const { openSearch } = useSearch();

  return (
    <button
      type="button"
      onClick={() => openSearch(id)}
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer",
        mono && "font-mono",
        className
      )}
    >
      {id}
    </button>
  );
}
