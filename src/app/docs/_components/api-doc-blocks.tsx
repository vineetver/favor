import { Badge } from "@shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";

interface FieldRow {
  name: string;
  type: string;
  required?: boolean;
  notes?: string;
}

interface ApiEndpointProps {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth: "Public" | "Authenticated";
  summary: string;
  requestFields?: FieldRow[];
  responseFields?: FieldRow[];
  notes?: string[];
}

export function ApiEndpoint({
  method,
  path,
  auth,
  summary,
  requestFields,
  responseFields,
  notes,
}: ApiEndpointProps) {
  const methodClass =
    method === "GET"
      ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
      : method === "POST"
        ? "bg-blue-600/10 text-blue-700 dark:text-blue-300"
        : method === "DELETE"
          ? "bg-rose-600/10 text-rose-700 dark:text-rose-300"
          : "bg-amber-600/10 text-amber-700 dark:text-amber-300";

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${methodClass}`}
          >
            {method}
          </span>
          <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">
            {path}
          </code>
          <Badge variant="outline" className="text-[11px]">
            {auth}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{summary}</p>
      </header>

      {(requestFields && requestFields.length > 0) ||
      (responseFields && responseFields.length > 0) ? (
        <div className="space-y-4 p-4 sm:p-5">
          {requestFields && requestFields.length > 0 ? (
            <FieldTable title="Request fields" rows={requestFields} />
          ) : null}
          {responseFields && responseFields.length > 0 ? (
            <FieldTable title="Response fields" rows={responseFields} />
          ) : null}
        </div>
      ) : null}

      {notes && notes.length > 0 ? (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Behavior notes
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function FieldTable({ title, rows }: { title: string; rows: FieldRow[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Required</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${title}-${row.name}`}>
              <TableCell className="font-mono text-xs">{row.name}</TableCell>
              <TableCell className="text-xs">{row.type}</TableCell>
              <TableCell className="text-xs">
                {row.required ? "Yes" : "No"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.notes ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
