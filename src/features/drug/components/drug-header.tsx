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
import type { GraphDrug } from "../types";

interface DrugHeaderProps {
  drug: GraphDrug;
}

function getPhaseLabel(phase?: number): string | null {
  if (phase == null) return null;
  if (phase === 4) return "Phase IV";
  if (phase >= 3) return "Phase III";
  if (phase >= 2) return "Phase II";
  if (phase >= 1) return "Phase I";
  if (phase > 0) return "Early Phase I";
  return "Preclinical";
}

function titleCase(s: string): string {
  if (s !== s.toUpperCase() || s.length <= 3) return s;
  return s.replace(/\b\w+/g, (w) =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
}

export function DrugHeader({ drug }: DrugHeaderProps) {
  const metaParts: string[] = [];
  if (drug.drug_type) metaParts.push(drug.drug_type);

  if (drug.has_been_withdrawn) {
    metaParts.push("Withdrawn");
  } else if (drug.clinical_status) {
    metaParts.push(drug.clinical_status);
  }

  const phaseStr = getPhaseLabel(drug.max_clinical_phase);
  if (phaseStr) metaParts.push(phaseStr);
  if (drug.year_first_approval)
    metaParts.push(`First approved ${drug.year_first_approval}`);

  const moaParts = [
    ...(drug.mechanisms_of_action ?? []),
    ...(drug.pharmacologic_classes ?? []),
  ];

  return (
    <div className="py-8 space-y-3">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList className="text-xs font-semibold tracking-wide uppercase">
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Drugs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-mono">{drug.id}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Title */}
      <h1 className="text-page-title">{titleCase(drug.drug_name)}</h1>

      {/* Metadata line */}
      {metaParts.length > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          {metaParts.map((part, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              <span
                className={cn(
                  part === "Withdrawn" && "text-destructive font-medium",
                )}
              >
                {part}
              </span>
            </Fragment>
          ))}
          {drug.black_box_warning && (
            <>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Black Box Warning
              </span>
            </>
          )}
        </div>
      )}

      {/* MOA / Classes */}
      {moaParts.length > 0 && (
        <p className="text-sm text-muted-foreground/80">
          {moaParts.join(" · ")}
        </p>
      )}

      {/* External identifiers */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground/70 flex-wrap">
        {drug.drugbank_id && (
          <a
            href={`https://go.drugbank.com/drugs/${drug.drugbank_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            DrugBank:{" "}
            <span className="font-mono">{drug.drugbank_id}</span>
          </a>
        )}
        {drug.pubchem_cid && (
          <a
            href={`https://pubchem.ncbi.nlm.nih.gov/compound/${drug.pubchem_cid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            PubChem:{" "}
            <span className="font-mono">{drug.pubchem_cid}</span>
          </a>
        )}
        {drug.cas_number && (
          <span>
            CAS: <span className="font-mono">{drug.cas_number}</span>
          </span>
        )}
      </div>
    </div>
  );
}
