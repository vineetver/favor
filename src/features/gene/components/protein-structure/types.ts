export interface ProteinDomain {
  id: string;
  name: string;
  start: number; // 1-based residue
  end: number;
  type?: string;
  color: string;
}

export interface ProteinStructureViewProps {
  uniprotId: string;
  geneSymbol: string;
  domains: ProteinDomain[];
  proteinLength: number;
  /** Amino acid position to highlight (1-based) — from variant's dbnsfp.aapos */
  variantPosition?: number;
  /** Label for the variant marker, e.g. "p.R175H" */
  variantLabel?: string;
}
