import type { GraphPhenotype } from "../types";

interface PhenotypeHeaderProps {
  phenotype: GraphPhenotype;
}

function hpoUrl(id: string): string {
  // HP_0001250 → HP:0001250 for HPO link
  return `https://hpo.jax.org/browse/term/${id.replace("_", ":")}`;
}

function formatOntologyLabel(source: string): string {
  if (source === "HP") return "Human Phenotype Ontology";
  if (source === "MP") return "Mammalian Phenotype Ontology";
  return source;
}

export function PhenotypeHeader({ phenotype }: PhenotypeHeaderProps) {
  const hpoId = phenotype.id.replace("_", ":");

  return (
    <div className="py-8 space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 text-breadcrumb">
        <span className="text-subtle">Phenotypes</span>
        <span className="text-border">▸</span>
        <span className="text-breadcrumb-mono">{phenotype.id}</span>
      </div>

      {/* Title */}
      <h1 className="text-page-title">{phenotype.phenotype_name}</h1>

      {/* Metadata line */}
      <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground flex-wrap">
        <span>{formatOntologyLabel(phenotype.ontology_source)}</span>
      </div>

      {/* External identifiers */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground/70 flex-wrap">
        <a
          href={hpoUrl(phenotype.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          <span className="font-mono">{hpoId}</span>
        </a>
        {phenotype.upheno_equivalent && (
          <span>
            uPheno:{" "}
            <span className="font-mono">
              {phenotype.upheno_equivalent.replace("_", ":")}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
