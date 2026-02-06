"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { memo } from "react";
import { PATH_RECIPES, type PathRecipe } from "./types";

interface PathRecipeSelectorProps {
  value: PathRecipe;
  onChange: (value: PathRecipe) => void;
  className?: string;
}

function PathRecipeSelectorInner({
  value,
  onChange,
  className,
}: PathRecipeSelectorProps) {
  const recipes = Object.entries(PATH_RECIPES) as [PathRecipe, typeof PATH_RECIPES[PathRecipe]][];

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1", className)}>
        <span className="text-xs text-muted-foreground mr-2">Recipe:</span>
        <div className="flex rounded-lg border border-border bg-muted p-0.5">
          {recipes.map(([key, config]) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(key)}
                  className={cn(
                    "h-7 px-3 text-xs rounded-md transition-all",
                    value === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-transparent"
                  )}
                >
                  {config.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">{config.description}</p>
                  <div className="text-[10px] text-muted-foreground">
                    <div>Edges: {config.edgeTypes.join(", ")}</div>
                    <div>Nodes: {config.nodeTypes.join(", ")}</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

export const PathRecipeSelector = memo(PathRecipeSelectorInner);
