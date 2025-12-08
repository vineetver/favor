import type { Variant } from "../../../types/types";
import { createColumns, cell, tooltip, type BadgeColor, DOT_COLORS } from "@/lib/table/column-builder";

const col = createColumns<Variant>();

// Chromatin state badge with colored indicator
function ChromatinBadge({ value, color }: { value: unknown; color: BadgeColor }) {
  return (
    <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
      <svg className={`h-2 w-2 mr-1 ${DOT_COLORS[color]}`} viewBox="0 0 6 6">
        <circle cx={3} cy={3} r={3} />
      </svg>
      {String(value)}
    </span>
  );
}

// Helper to create chromatin state columns
function chromatinCol(id: keyof Variant, header: string, title: string, description: string, color: BadgeColor) {
  return col.accessor(id, {
    accessor: id,
    header,
    description: tooltip({
      title,
      description: `${description} Value indicates the number of cell types (out of 48) where this chromatin state is observed.`,
      range: "[0, 48]",
      citation: "Ernst and Kellis, 2015",
      guides: [
        { threshold: "Higher values (>24)", meaning: "Commonly in this state across cell types" },
        { threshold: "Lower values", meaning: "Cell-type specific state" },
      ],
    }),
    cell: cell.custom((val: number) => <ChromatinBadge value={val} color={color} />),
  });
}

export const chromatinStateColumns = [
  chromatinCol("chmm_e1", "TssA (Active TSS)", "Active TSS (TssA)", "Chromatin state indicating Active Transcription Start Site. Associated with actively transcribed genes.", "red"),
  chromatinCol("chmm_e2", "PromU (Promoter Upstream TSS)", "Promoter Upstream TSS (PromU)", "Chromatin state indicating Promoter Upstream of Transcription Start Site.", "amber"),
  chromatinCol("chmm_e3", "PromD1 (Promoter Downstream TSS with DNase)", "Promoter Downstream TSS with DNase (PromD1)", "Chromatin state indicating Promoter Downstream of TSS with DNase accessibility.", "amber"),
  chromatinCol("chmm_e4", "PromD2 (Promoter Downstream TSS)", "Promoter Downstream TSS (PromD2)", "Chromatin state indicating Promoter Downstream of Transcription Start Site.", "amber"),
  chromatinCol("chmm_e5", "Tx5' (Transcription 5')", "Transcription 5' (Tx5')", "Chromatin state indicating Transcription at the 5' end of genes.", "green"),
  chromatinCol("chmm_e6", "Tx (Transcription)", "Transcription (Tx)", "Chromatin state indicating Active Transcription in gene bodies.", "green"),
  chromatinCol("chmm_e7", "Tx3' (Transcription 3')", "Transcription 3' (Tx3')", "Chromatin state indicating Transcription at the 3' end of genes.", "green"),
  chromatinCol("chmm_e8", "TxWk (Transcription Weak)", "Weak Transcription (TxWk)", "Chromatin state indicating Weak Transcription signal.", "green"),
];

export const chromatinStateGroup = col.group("chromatin-states", "Chromatin State", chromatinStateColumns);
