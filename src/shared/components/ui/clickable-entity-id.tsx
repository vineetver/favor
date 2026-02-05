"use client";

import { useSearch } from "@features/search";
import { cn } from "@infra/utils";
import { Button } from "./button";

interface ClickableEntityIdProps {
  id: string;
  mono?: boolean;
  className?: string;
}

export function ClickableEntityId({
  id,
  mono = false,
  className,
}: ClickableEntityIdProps) {
  const { openSearch } = useSearch();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => openSearch(id)}
      className={cn(
        "h-auto px-2.5 py-1 rounded-full text-xs",
        mono && "font-mono",
        className,
      )}
    >
      {id}
    </Button>
  );
}
