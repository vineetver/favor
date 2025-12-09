import type { OpenTargetsProteinCodingRow } from "@/features/variant/types/opentargets";
import { createColumns, cell, tooltip, Badge } from "@/lib/table/column-builder";
import { ExternalLink } from "@/components/ui/external-link";

const col = createColumns<OpenTargetsProteinCodingRow>();

export const openTargetsProteinCodingColumns = [
  col.display("targetSymbol", {
    header: "Gene",
    description: tooltip({
      title: "Gene Symbol",
      description: "HGNC-approved gene symbol for the affected protein-coding gene.",
      citation: "Open Targets Platform",
    }),
    cell: ({ row }) => {
      const symbol = row.original.targetSymbol;
      const targetId = row.original.targetId;
      if (!symbol) return "-";
      if (targetId) {
        return (
          <ExternalLink href={`https://platform.opentargets.org/target/${targetId}`} className="font-medium">
            {symbol}
          </ExternalLink>
        );
      }
      return <span className="font-medium">{symbol}</span>;
    },
  }),

  col.display("aaChange", {
    header: "AA Change",
    description: tooltip({
      title: "Amino Acid Change",
      description: "Amino acid substitution notation showing reference amino acid, position, and alternate amino acid.",
    }),
    cell: ({ row }) => {
      const { referenceAminoAcid, aminoAcidPosition, alternateAminoAcid } = row.original;
      return (
        <span className="font-mono">
          {referenceAminoAcid}
          <span className="text-muted-foreground">{aminoAcidPosition}</span>
          {alternateAminoAcid}
        </span>
      );
    },
  }),

  col.display("variantEffect", {
    header: "Effect Score",
    description: tooltip({
      title: "Variant Effect Score",
      description: "Predicted functional effect score for the amino acid substitution.",
      range: "[0, 1]",
      guides: [
        { threshold: "> 0.5", meaning: "Likely damaging" },
        { threshold: "0 - 0.5", meaning: "Uncertain effect" },
        { threshold: "< 0", meaning: "Likely tolerated" },
      ],
    }),
    cell: ({ row }) => {
      const score = row.original.variantEffect;
      if (score === null) return "-";
      const color = score > 0.5 ? "red" : score > 0 ? "amber" : "green";
      return (
        <Badge color={color}>
          {score.toFixed(4)}
        </Badge>
      );
    },
  }),

  col.accessor("consequences", {
    accessor: "consequences",
    header: "Consequences",
    description: tooltip({
      title: "Molecular Consequences",
      description: "Sequence Ontology terms describing the variant's effect on the protein.",
      citation: "Sequence Ontology",
    }),
    cell: cell.text(),
  }),

  col.display("diseases", {
    header: "Diseases",
    description: tooltip({
      title: "Associated Diseases",
      description: "Diseases associated with variants affecting this protein position.",
    }),
    cell: ({ row }) => {
      const diseases = row.original.diseases;
      if (!diseases || diseases.length === 0) return "-";
      const display = diseases.slice(0, 2).join(", ");
      const more = diseases.length > 2 ? ` +${diseases.length - 2}` : "";
      return (
        <span title={diseases.join(", ")} className="cursor-help">
          {display}
          {more && <span className="text-muted-foreground">{more}</span>}
        </span>
      );
    },
  }),

  col.display("therapeuticAreas", {
    header: "Therapeutic Areas",
    description: tooltip({
      title: "Therapeutic Areas",
      description: "Broad disease categories relevant to this protein.",
    }),
    cell: ({ row }) => {
      const areas = row.original.therapeuticAreas;
      if (!areas || areas.length === 0) return "-";
      return (
        <div className="flex flex-wrap gap-1">
          {areas.slice(0, 3).map((area, i) => (
            <Badge key={i} color="purple">{area}</Badge>
          ))}
          {areas.length > 3 && (
            <span className="text-xs text-muted-foreground">+{areas.length - 3}</span>
          )}
        </div>
      );
    },
  }),

  col.display("uniprotAccessions", {
    header: "UniProt",
    description: tooltip({
      title: "UniProt Accession",
      description: "UniProt protein identifier linked to the UniProtKB entry.",
      citation: "UniProt Consortium",
    }),
    cell: ({ row }) => {
      const accessions = row.original.uniprotAccessions;
      if (!accessions || accessions.length === 0) return "-";
      const first = accessions[0];
      return (
        <ExternalLink href={`https://www.uniprot.org/uniprotkb/${first}`} className="font-mono text-xs">
          {first}
        </ExternalLink>
      );
    },
  }),
];
