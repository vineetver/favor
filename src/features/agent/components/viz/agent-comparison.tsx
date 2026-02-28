import { Badge } from "@shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import type { ComparisonVizSpec } from "../../viz/types";

export function AgentComparison({ spec }: { spec: ComparisonVizSpec }) {
  const entityLabels = spec.entities.map((e) => e.label);

  return (
    <div className="space-y-2">
      {spec.overallSimilarity != null && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Overall similarity:
          </span>
          <Badge variant="secondary" className="text-xs">
            {(spec.overallSimilarity * 100).toFixed(0)}%
          </Badge>
        </div>
      )}
      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Edge Type</TableHead>
              <TableHead className="text-xs text-right">Shared</TableHead>
              {entityLabels.map((label) => (
                <TableHead key={label} className="text-xs text-right">
                  {label} only
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {spec.rows.map((row) => (
              <TableRow key={row.edgeType}>
                <TableCell className="text-xs font-medium">
                  {row.edgeType}
                </TableCell>
                <TableCell className="text-xs text-right tabular-nums">
                  {row.sharedCount}
                </TableCell>
                {entityLabels.map((label) => (
                  <TableCell
                    key={label}
                    className="text-xs text-right tabular-nums text-muted-foreground"
                  >
                    {row.uniqueCounts[label] ?? 0}
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
