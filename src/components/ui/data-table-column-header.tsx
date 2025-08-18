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
      <div className={cn("flex items-center space-x-2", className)}>
        <span className="font-medium">{title}</span>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="cursor-help text-muted-foreground">?</span>
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
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span className="font-medium">{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4" />
            )}
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
      {tooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span className="cursor-help text-muted-foreground">?</span>
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
    sortable = true, 
    align = "left",
    className,
    enableHiding = true,
    enableFiltering = false 
  } = options || {};

  return ({ column }: { column?: Column<TData, TValue> }) => (
    <div className={className} style={{ textAlign: align }}>
      <DataTableColumnHeader
        column={column}
        title={title}
        tooltip={tooltip}
        sortable={sortable}
      />
    </div>
  );
}