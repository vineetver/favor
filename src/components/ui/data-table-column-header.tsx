"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/general";
import type { Column } from "@tanstack/react-table";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column?: Column<TData, TValue>;
  title: string;
  tooltip?: string;
  sortable?: boolean;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  tooltip,
  sortable = true,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column || !sortable) {
    return (
      <div className={cn("flex items-center w-full gap-2", className)}>
        <span className="font-bold truncate">{title}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help text-muted-foreground hover:text-foreground transition-colors w-4 h-4 rounded-full border border-muted-foreground hover:border-foreground flex items-center justify-center text-xs flex-shrink-0">
                  ?
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-md">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent group w-full justify-between px-3 min-w-0"
          >
            <div className="flex items-center w-full min-w-0 gap-2">
              <span className="font-bold truncate">
                {title}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help text-muted-foreground hover:text-foreground transition-colors w-4 h-4 rounded-full border border-muted-foreground hover:border-foreground flex items-center justify-center text-xs">
                          ?
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-md">{tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {column.getIsSorted() === "desc" ? (
                    <ArrowDown className="h-3.5 w-3.5" />
                  ) : column.getIsSorted() === "asc" ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function createColumnHeader<TData, TValue>(
  title: string,
  options?: {
    tooltip?: string;
    sortable?: boolean;
    align?: "left" | "center" | "right";
    className?: string;
    enableHiding?: boolean;
    enableFiltering?: boolean;
  },
) {
  const { 
    tooltip, 
    sortable = false, // Changed default to false
    align = "left",
    className,
    enableHiding = true,
    enableFiltering = false 
  } = options || {};

  return ({ column }: { column?: Column<TData, TValue> }) => {
    // Check if the column itself has sorting enabled
    const canSort = column?.getCanSort() && sortable;
    
    return (
      <div className={className} style={{ textAlign: align }}>
        <DataTableColumnHeader
          column={column}
          title={title}
          tooltip={tooltip}
          sortable={canSort}
        />
      </div>
    );
  };
}