"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@shared/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import { cn } from "@infra/utils";
import {
  getCohortSchemaClient,
  getCohortSampleClient,
  type SchemaColumn,
} from "@features/batch/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ResourceKind = "schema" | "sample";

export interface ResourceViewerState {
  open: boolean;
  kind: ResourceKind;
  cohortId: string;
  cohortLabel: string;
}

const CLOSED: ResourceViewerState = {
  open: false,
  kind: "schema",
  cohortId: "",
  cohortLabel: "",
};

export { CLOSED as RESOURCE_VIEWER_CLOSED };

// ---------------------------------------------------------------------------
// Schema view
// ---------------------------------------------------------------------------

const KIND_COLORS: Record<string, string> = {
  numeric: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  categorical: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  identity: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  array: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

function SchemaView({ cohortId }: { cohortId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cohort-schema-client", cohortId],
    queryFn: () => getCohortSchemaClient(cohortId),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load schema: {(error as Error).message}
      </div>
    );
  }

  if (!data) return null;

  const columns = data.columns ?? [];

  return (
    <div className="space-y-4 p-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-2 text-[13px]">
        {data.data_type && (
          <Badge variant="secondary" className="font-normal">
            {data.data_type}
          </Badge>
        )}
        {data.row_count != null && (
          <Badge variant="secondary" className="font-normal">
            {data.row_count.toLocaleString()} rows
          </Badge>
        )}
        <Badge variant="secondary" className="font-normal">
          {columns.length} columns
        </Badge>
      </div>

      {data.text_summary && (
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {data.text_summary}
        </p>
      )}

      {/* Columns table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-8">
                Column
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider h-8">
                Type
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col) => (
              <TableRow key={col.name}>
                <TableCell className="font-mono text-[12px] py-1.5">
                  {col.name}
                </TableCell>
                <TableCell className="py-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                      KIND_COLORS[col.kind] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {col.kind}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample (rows) view
// ---------------------------------------------------------------------------

function SampleView({ cohortId }: { cohortId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["cohort-sample-client", cohortId],
    queryFn: () => getCohortSampleClient(cohortId, { limit: 20 }),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load sample: {(error as Error).message}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="p-4 text-[13px] text-muted-foreground">No rows.</div>
    );
  }

  // Collect all column keys from rows
  const allKeys = Array.from(
    new Set(data.rows.flatMap((r) => Object.keys(r))),
  );

  return (
    <div className="space-y-3 p-4">
      <p className="text-[13px] text-muted-foreground">
        Showing {data.rows.length} of {data.total.toLocaleString()} rows
      </p>

      <div className="rounded-lg border border-border overflow-auto max-h-[70vh]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {allKeys.map((key) => (
                <TableHead
                  key={key}
                  className="text-[11px] font-semibold uppercase tracking-wider h-8 whitespace-nowrap"
                >
                  {key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row, i) => (
              <TableRow key={i}>
                {allKeys.map((key) => (
                  <TableCell
                    key={key}
                    className="py-1.5 text-[12px] whitespace-nowrap max-w-[200px] truncate"
                    title={String(row[key] ?? "")}
                  >
                    {formatCell(row[key])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "\u2014";
  if (typeof value === "number") {
    // Show up to 4 decimal places for floats, none for integers
    return Number.isInteger(value) ? String(value) : value.toPrecision(4);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ResourceViewerProps {
  state: ResourceViewerState;
  onClose: () => void;
}

export function ResourceViewer({ state, onClose }: ResourceViewerProps) {
  return (
    <Sheet open={state.open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] sm:max-w-[90vw] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-[13px] font-semibold text-foreground">
            {state.cohortLabel}
            <span className="text-muted-foreground font-normal">
              {" / "}
              {state.kind}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {state.open && state.kind === "schema" && (
            <SchemaView cohortId={state.cohortId} />
          )}
          {state.open && state.kind === "sample" && (
            <SampleView cohortId={state.cohortId} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
