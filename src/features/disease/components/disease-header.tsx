import { Fragment } from "react";
import { cn } from "@infra/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@shared/components/ui/breadcrumb";
import type { GraphDisease } from "../types";

interface DiseaseHeaderProps {
  disease: GraphDisease;
}

function titleCase(s: string): string {
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) return s;
  return s.replace(/\b\w+/g, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
}

export function DiseaseHeader({ disease }: DiseaseHeaderProps) {
  const metaParts: string[] = [];

  if (disease.primary_anatomical_systems?.length) {
    metaParts.push(...disease.primary_anatomical_systems.map(titleCase));
  }
  if (disease.disorder_type) metaParts.push(disease.disorder_type);
  if (disease.is_cancer) metaParts.push("Cancer");
  if (disease.is_rare_disease) metaParts.push("Rare Disease");
  if (disease.majority_inheritance_mode) {
    const modes: Record<string, string> = {
      AR: "Autosomal Recessive",
      AD: "Autosomal Dominant",
      XL: "X-Linked",
      MT: "Mitochondrial",
    };
    metaParts.push(
      modes[disease.majority_inheritance_mode] ??
        disease.majority_inheritance_mode,
    );
  }

  const xrefs: { label: string; id: string; href?: string }[] = [];
  if (disease.mondo_id) {
    xrefs.push({
      label: "MONDO",
      id: disease.mondo_id,
      href: `https://monarchinitiative.org/disease/${disease.mondo_id}`,
    });
  }
  if (disease.efo_id) {
    xrefs.push({
      label: "EFO",
      id: disease.efo_id,
      href: `https://www.ebi.ac.uk/ols4/ontologies/efo/classes/${encodeURIComponent(`http://www.ebi.ac.uk/efo/${disease.efo_id}`)}`,
    });
  }
  if (disease.omim_id) {
    xrefs.push({
      label: "OMIM",
      id: disease.omim_id,
      href: `https://omim.org/entry/${disease.omim_id.replace("OMIM:", "")}`,
    });
  }
  if (disease.orphanet_id) {
    xrefs.push({
      label: "Orphanet",
      id: disease.orphanet_id,
      href: `https://www.orpha.net/en/disease/detail/${disease.orphanet_id.replace("Orphanet_", "")}`,
    });
  }
  if (disease.mesh_id) {
    xrefs.push({
      label: "MeSH",
      id: disease.mesh_id,
      href: `https://meshb.nlm.nih.gov/record/ui?ui=${disease.mesh_id}`,
    });
  }
  if (disease.doid) {
    xrefs.push({ label: "DOID", id: disease.doid });
  }

  return (
    <div className="py-8 space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs font-semibold tracking-wide uppercase">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Diseases</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{disease.id}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Title */}
      <h1 className="text-page-title">{titleCase(disease.disease_name)}</h1>

      {/* Metadata line */}
      {metaParts.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          {metaParts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground/40">·</span>}
              <span
                className={cn(
                  part === "Cancer" && "text-destructive font-medium",
                  part === "Rare Disease" &&
                    "text-amber-600 dark:text-amber-400 font-medium",
                )}
              >
                {part}
              </span>
            </Fragment>
          ))}
        </div>
      )}

      {/* External identifiers */}
      {xrefs.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground/70 flex-wrap">
          {xrefs.map((xref) =>
            xref.href ? (
              <a
                key={xref.label}
                href={xref.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {xref.label}:{" "}
                <span className="font-mono">{xref.id}</span>
              </a>
            ) : (
              <span key={xref.label}>
                {xref.label}:{" "}
                <span className="font-mono">{xref.id}</span>
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
