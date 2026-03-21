import type { ReactNode } from "react";

import { MessageResponse } from "@shared/components/ai-elements/message";
import { Badge } from "@shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { isArtifactRef } from "../lib/compact-message";
import type {
  CompressedSearchResult,
  CompressedNeighbor,
  CompressedEnrichment,
  CompressedGwasAssociation,
  CompressedGeneStats,
  CompressedPath,
  CompressedCohort,
  PathsResult,
  PatternsResult,
} from "../types";
import { TypeBadge, fmt, StatCard, StatRow, TextSummaryWithData } from "./tool-renderer-shared";

// ---------------------------------------------------------------------------
// Search Results
// ---------------------------------------------------------------------------

function SearchResultsRenderer({
  results,
}: {
  results: CompressedSearchResult[];
}) {
  if (!results.length) return <p className="text-xs text-muted-foreground">No results found.</p>;
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Type</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="w-40">ID</TableHead>
          <TableHead className="w-16 text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => (
          <TableRow key={r.id}>
            <TableCell><TypeBadge type={r.type} /></TableCell>
            <TableCell className="font-medium">{r.label}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(r.score)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranked Neighbors
// ---------------------------------------------------------------------------

interface NeighborsOutput {
  textSummary?: string;
  resolved?: { direction?: string; scoreField?: string };
  scoreField?: string;
  totalReturned?: number;
  neighbors: CompressedNeighbor[];
}

function NeighborsRenderer({ data }: { data: NeighborsOutput }) {
  const neighbors = data.neighbors;
  if (!neighbors?.length) return <p className="text-xs text-muted-foreground">No neighbors found.</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead className="w-20">Type</TableHead>
            {neighbors[0]?.score != null && (
              <TableHead className="w-16 text-right">Score</TableHead>
            )}
            {neighbors[0]?.explanation && (
              <TableHead>Explanation</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {neighbors.map((n) => (
            <TableRow key={n.entity.id}>
              <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">{n.rank}</TableCell>
              <TableCell className="font-medium">{n.entity.label}</TableCell>
              <TableCell><TypeBadge type={n.entity.type} /></TableCell>
              {n.score != null && (
                <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(n.score)}</TableCell>
              )}
              {n.explanation && (
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {typeof n.explanation === "string" ? n.explanation : JSON.stringify(n.explanation)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

function EnrichmentRenderer({
  results,
}: {
  results: CompressedEnrichment[];
}) {
  if (!results.length) return <p className="text-xs text-muted-foreground">No enrichment results.</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-16 text-right">Overlap</TableHead>
            <TableHead className="w-20 text-right">P-value</TableHead>
            <TableHead className="w-20 text-right">Adj P</TableHead>
            <TableHead className="w-16 text-right">Fold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.entity.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{r.entity.label}</span>
                  {r.overlappingGenes && r.overlappingGenes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.overlappingGenes.slice(0, 6).map((g) => (
                        <span key={g} className="text-[10px] font-mono bg-primary/8 text-primary rounded px-1 py-0">
                          {g}
                        </span>
                      ))}
                      {r.overlappingGenes.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{r.overlappingGenes.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell><TypeBadge type={r.entity.type} /></TableCell>
              <TableCell className="text-right tabular-nums">{r.overlap}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.pValue)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.adjustedPValue)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.foldEnrichment)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GWAS
// ---------------------------------------------------------------------------

function GwasRenderer({
  data,
}: {
  data: {
    totalHits?: number;
    uniqueTraits?: number;
    topAssociations: CompressedGwasAssociation[];
  };
}) {
  const associations = data.topAssociations;
  const meta = data;

  if (!associations?.length) return <p className="text-xs text-muted-foreground">No GWAS associations found.</p>;

  return (
    <div className="space-y-2">
      {meta && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          {meta.totalHits != null && <span>{meta.totalHits} total hits</span>}
          {meta.uniqueTraits != null && <span>{meta.uniqueTraits} unique traits</span>}
        </div>
      )}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trait</TableHead>
            <TableHead className="w-24 text-right">-log10(P)</TableHead>
            {associations[0]?.effectSize && (
              <TableHead className="w-24 text-right">Effect Size</TableHead>
            )}
            {associations[0]?.studyAccession && (
              <TableHead className="w-28">Study</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {associations.map((a, i) => (
            <TableRow key={`${a.trait}-${i}`}>
              <TableCell className="font-medium">{a.trait}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(a.pValueMlog)}</TableCell>
              {a.effectSize && (
                <TableCell className="text-right tabular-nums whitespace-nowrap">{a.effectSize}</TableCell>
              )}
              {a.studyAccession && (
                <TableCell className="font-mono text-xs text-muted-foreground">{a.studyAccession}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gene Variant Stats
// ---------------------------------------------------------------------------

function GeneStatsRenderer({ data }: { data: CompressedGeneStats }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-foreground">{data.gene}</span>
        <Badge variant="secondary" className="text-[10px]">{data.totalVariants.toLocaleString()} variants</Badge>
        <span className="text-xs text-muted-foreground">
          {data.snvCount.toLocaleString()} SNV &middot; {data.indelCount.toLocaleString()} InDel
        </span>
        {data.actionable > 0 && (
          <Badge className="text-[10px] bg-primary/10 text-primary border-0">{data.actionable} actionable</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="ClinVar">
          <StatRow label="Pathogenic" value={data.clinvar.pathogenic} />
          <StatRow label="Likely pathogenic" value={data.clinvar.likelyPathogenic} />
          <StatRow label="VUS" value={data.clinvar.vus} />
          <StatRow label="Likely benign" value={data.clinvar.likelyBenign} />
          <StatRow label="Benign" value={data.clinvar.benign} />
          {data.clinvar.conflicting > 0 && <StatRow label="Conflicting" value={data.clinvar.conflicting} />}
        </StatCard>
        <StatCard label="Consequence">
          <StatRow label="LoF (total)" value={data.consequence.lof} />
          <StatRow label="Missense" value={data.consequence.missense} />
          <StatRow label="Nonsense" value={data.consequence.nonsense} />
          <StatRow label="Frameshift" value={data.consequence.frameshift} />
          <StatRow label="Splice" value={data.consequence.splice} />
          <StatRow label="Synonymous" value={data.consequence.synonymous} />
        </StatCard>
        <StatCard label="Location">
          <StatRow label="Exonic" value={data.location.exonic} />
          <StatRow label="Intronic" value={data.location.intronic} />
          <StatRow label="UTR" value={data.location.utr} />
          <StatRow label="Splicing" value={data.location.splicing} />
          <StatRow label="Regulatory" value={data.location.regulatory} />
        </StatCard>
        <StatCard label="Frequency">
          <StatRow label="Common" value={data.frequency.common} />
          <StatRow label="Low freq" value={data.frequency.lowFreq} />
          <StatRow label="Rare" value={data.frequency.rare} />
          <StatRow label="Ultra-rare" value={data.frequency.ultraRare} />
          <StatRow label="Singleton" value={data.frequency.singleton} />
        </StatCard>
        <StatCard label="Pathogenicity Predictions">
          <StatRow label="High CADD (≥20)" value={data.scores.highCadd} />
          <StatRow label="REVEL pathogenic" value={data.scores.highRevel} />
          <StatRow label="AlphaMissense path." value={data.scores.highAlphaMissense} />
          <StatRow label="SpliceAI affecting" value={data.scores.splicingAffecting} />
          <StatRow label="SIFT deleterious" value={data.scores.siftDeleterious} />
          <StatRow label="PolyPhen damaging" value={data.scores.polyphenDamaging} />
        </StatCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function PathsRenderer({ paths }: { paths: CompressedPath[] }) {
  if (!paths.length) return <p className="text-xs text-muted-foreground">No paths found.</p>;
  return (
    <div className="space-y-2">
      {paths.map((p) => (
        <div key={p.rank} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground mt-0.5">#{p.rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {p.nodes.map((n, i) => (
                <span key={n.id} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground mx-0.5">&rarr;</span>}
                  <TypeBadge type={n.type} />
                  <span className="font-medium text-foreground">{n.label}</span>
                </span>
              ))}
            </div>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{p.length} hops</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

function PatternsRenderer({ data }: { data: PatternsResult }) {
  if (!data.matches.length) return <p className="text-xs text-muted-foreground">No pattern matches found.</p>;
  return (
    <div className="space-y-2">
      {data.textSummary && (
        <p className="text-xs text-muted-foreground">{data.textSummary}</p>
      )}
      {data.matches.slice(0, 10).map((m, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground mt-0.5">#{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {Object.entries(m.vars).map(([varName, entity], i) => (
                <span key={varName} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground mx-0.5">&mdash;</span>}
                  <TypeBadge type={entity.type} />
                  <span className="font-medium text-foreground">{entity.label}</span>
                  <span className="text-muted-foreground text-[10px]">({varName})</span>
                </span>
              ))}
            </div>
          </div>
          {m.score != null && (
            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{m.score.toFixed(2)}</span>
          )}
        </div>
      ))}
      {data.counts.returned > 10 && (
        <p className="text-[10px] text-muted-foreground">Showing 10 of {data.counts.returned} matches</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant Profile
// ---------------------------------------------------------------------------

/** cCRE annotation → human label + Tailwind bg class (ENCODE-standard colors) */
const CCRE_ANNOTATION: Record<string, { label: string; color: string }> = {
  PLS: { label: "Promoter-Like", color: "bg-red-600" },
  pELS: { label: "Proximal Enhancer-Like", color: "bg-orange-600" },
  dELS: { label: "Distal Enhancer-Like", color: "bg-amber-300" },
  "CA-CTCF": { label: "CTCF-bound", color: "bg-blue-700" },
  "CA-H3K4me3": { label: "H3K4me3 Candidate", color: "bg-orange-600" },
  "CA-TF": { label: "TF Candidate", color: "bg-purple-600" },
  CA: { label: "Chromatin Accessible", color: "bg-emerald-400" },
  TF: { label: "TF-bound", color: "bg-pink-500" },
};

function CcreOverlayDetail({
  accession,
  annotation,
  info,
  row,
}: {
  accession: string;
  annotation?: string;
  info?: { label: string; color: string };
  row?: Record<string, unknown>;
}) {
  const link = (row?.link ?? {}) as Record<string, unknown>;
  const props = (link.props ?? {}) as Record<string, unknown>;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {info && (
          <span
            className={`inline-block size-2.5 rounded-full shrink-0 ${info.color}`}
          />
        )}
        <span className="text-xs font-medium text-foreground font-mono">{accession}</span>
      </div>
      {info && annotation && (
        <span className="text-[10px] text-muted-foreground">{annotation}: {info.label} Signature</span>
      )}
      {props.distance_to_center != null && (
        <StatRow label="Dist to center" value={`${props.distance_to_center} bp`} />
      )}
      {props.ccre_size != null && (
        <StatRow label="cCRE size" value={`${props.ccre_size} bp`} />
      )}
    </div>
  );
}

/** Extract neighbor objects from a relation group's rows[].neighbor, with link props merged in */
function extractNeighbors(group: { rows?: unknown[] } | undefined): Array<Record<string, unknown>> {
  if (!group?.rows) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const row of group.rows as Array<Record<string, unknown>>) {
    const neighbor = (row.neighbor ?? {}) as Record<string, unknown>;
    if (neighbor.id == null) continue;
    const linkProps = ((row.link as Record<string, unknown>)?.props ?? {}) as Record<string, unknown>;
    out.push({ ...neighbor, _linkProps: linkProps });
  }
  return out;
}

/** Extract raw row objects from a relation group (neighbor + link intact) */
function extractRelationRows(group: { rows?: unknown[] } | undefined): Array<Record<string, unknown>> {
  if (!group?.rows) return [];
  return (group.rows as Array<Record<string, unknown>>).filter((r) => r.neighbor != null);
}

interface VariantProfileData {
  profiles: Array<{
    variant: string;
    resolvedId?: string;
    label?: string;
    entity?: Record<string, unknown>;
    error?: string;
  }>;
  cohort_rows?: unknown[];
}

function VariantProfileRenderer({ data }: { data: VariantProfileData }) {
  const { profiles } = data;
  if (!profiles?.length) return <p className="text-xs text-muted-foreground">No variant profiles.</p>;

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <VariantProfileCard key={profile.resolvedId ?? profile.variant} profile={profile} />
      ))}
    </div>
  );
}

function VariantProfileCard({ profile }: { profile: VariantProfileData["profiles"][number] }) {
  if (profile.error) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">{profile.variant}</span>
        <p className="text-xs text-destructive mt-1">{profile.error}</p>
      </div>
    );
  }

  const entity = profile.entity;
  if (!entity) return null;

  const d = (entity.data ?? entity) as Record<string, unknown>;
  const included = (entity.included ?? {}) as Record<string, unknown>;
  const relations = (included.relations ?? {}) as Record<string, { rows?: unknown[] }>;
  const counts = (included.counts ?? {}) as Record<string, number>;

  const ccreAccession = d.ccre_accessions as string | undefined;
  const ccreAnnotation = d.ccre_annotations as string | undefined;
  const ccreInfo = ccreAnnotation ? CCRE_ANNOTATION[ccreAnnotation] : undefined;

  // Extract top gene connections from relations rows
  const impliedGenes = extractNeighbors(relations.VARIANT_IMPLIES_GENE);
  const affectsGenes = extractNeighbors(relations.VARIANT_AFFECTS_GENE);

  // Extract cCRE edge detail
  const ccreEdges = extractRelationRows(relations.VARIANT_OVERLAPS_CCRE);

  // Key scores
  const cadd = d.cadd_phred as number | null | undefined;
  const linsight = d.linsight as number | null | undefined;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-foreground">
          {profile.label ?? profile.variant}
        </span>
        {profile.resolvedId && (
          <span className="text-[10px] font-mono text-muted-foreground">{profile.resolvedId}</span>
        )}
        {d.gencode_consequence != null && (
          <Badge variant="secondary" className="text-[10px]">
            {String(d.gencode_consequence)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Scores */}
        <StatCard label="Scores">
          {cadd != null && <StatRow label="CADD Phred" value={fmt(cadd)} />}
          {linsight != null && <StatRow label="LINSIGHT" value={fmt(linsight)} />}
          {d.fathmm_xf != null && <StatRow label="FATHMM-XF" value={fmt(d.fathmm_xf as number)} />}
          {d.gnomad_genome_af != null && <StatRow label="gnomAD AF" value={fmt(d.gnomad_genome_af as number, 4)} />}
          {cadd == null && linsight == null && d.fathmm_xf == null && d.gnomad_genome_af == null && (
            <span className="text-[10px] text-muted-foreground">No scores available</span>
          )}
        </StatCard>

        {/* cCRE Overlap */}
        <StatCard label="cCRE Overlap">
          {ccreAccession ? (
            <CcreOverlayDetail
              accession={ccreAccession}
              annotation={ccreAnnotation}
              info={ccreInfo}
              row={ccreEdges[0]}
            />
          ) : (
            <span className="text-[10px] text-muted-foreground">No cCRE overlap</span>
          )}
        </StatCard>

        {/* Gene Links */}
        {(impliedGenes.length > 0 || affectsGenes.length > 0) && (
          <StatCard label="Gene Links">
            {impliedGenes.slice(0, 3).map((g) => {
              const lp = (g._linkProps ?? {}) as Record<string, unknown>;
              return (
                <div key={String(g.id)} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{String(g.symbol ?? g.name ?? g.id)}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {lp.l2g_score != null ? `L2G ${fmt(lp.l2g_score as number)}` : ""}
                    {lp.implication_mode ? ` · ${String(lp.implication_mode)}` : ""}
                  </span>
                </div>
              );
            })}
            {affectsGenes.slice(0, 3).map((g) => {
              const lp = (g._linkProps ?? {}) as Record<string, unknown>;
              return (
                <div key={String(g.id)} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{String(g.symbol ?? g.name ?? g.id)}</span>
                  <span className="text-muted-foreground text-[10px]">
                    {lp.variant_consequence ? String(lp.variant_consequence) : "affects"}
                  </span>
                </div>
              );
            })}
          </StatCard>
        )}

        {/* ClinVar */}
        {d.clinvar_clnsig != null && (
          <StatCard label="ClinVar">
            <StatRow label="Significance" value={String(d.clinvar_clnsig)} />
            {d.clinvar_clndn != null && <StatRow label="Condition" value={String(d.clinvar_clndn)} />}
            {d.clinvar_gene != null && <StatRow label="Gene" value={String(d.clinvar_gene)} />}
          </StatCard>
        )}
      </div>

      {/* Edge counts summary */}
      {Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(counts)
            .filter(([, v]) => v > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                {type.replace(/^VARIANT_/, "").replace(/_/g, " ").toLowerCase()}: {count}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cohort
// ---------------------------------------------------------------------------

function CohortRenderer({ data }: { data: CompressedCohort }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-foreground">Cohort created</span>
        <Badge variant="secondary" className="text-[10px] font-mono">{data.cohortId}</Badge>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{data.variantCount.toLocaleString()} variants</span>
        <span>{data.resolution.resolved}/{data.resolution.total} resolved</span>
        {data.resolution.notFound > 0 && (
          <span className="text-amber-600">{data.resolution.notFound} not found</span>
        )}
      </div>
      {data.summary && <p className="text-xs text-muted-foreground">{data.summary}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export function renderToolOutput(
  toolName: string,
  output: unknown,
): ReactNode | null {
  if (!output || typeof output !== "object") return null;

  // Artifact refs have no inline data to render
  if (isArtifactRef(output)) return null;

  // Check for error responses
  if ("error" in (output as Record<string, unknown>) && (output as Record<string, unknown>).error === true) {
    return null; // Let default error handling take over
  }

  const name = toolName.replace(/^tool-/, "");

  switch (name) {
    case "searchEntities": {
      if (Array.isArray(output)) {
        return <SearchResultsRenderer results={output as CompressedSearchResult[]} />;
      }
      return null;
    }
    case "getRankedNeighbors": {
      const d = output as NeighborsOutput;
      if (!d.neighbors) return null;
      if (d.textSummary) {
        return (
          <TextSummaryWithData textSummary={d.textSummary}>
            <NeighborsRenderer data={d} />
          </TextSummaryWithData>
        );
      }
      return <NeighborsRenderer data={d} />;
    }
    case "runEnrichment": {
      const enrichObj = output as { textSummary?: string; enriched?: CompressedEnrichment[]; inputSize?: number; backgroundSize?: number };
      if (enrichObj.enriched && Array.isArray(enrichObj.enriched)) {
        if (enrichObj.textSummary) {
          return (
            <TextSummaryWithData textSummary={enrichObj.textSummary}>
              <EnrichmentRenderer results={enrichObj.enriched} />
            </TextSummaryWithData>
          );
        }
        return <EnrichmentRenderer results={enrichObj.enriched} />;
      }
      return null;
    }
    case "getConnections": {
      const d = output as { textSummary?: string };
      if (d.textSummary) {
        return <MessageResponse>{d.textSummary}</MessageResponse>;
      }
      return null;
    }
    case "compareEntities": {
      const d = output as { textSummary?: string };
      if (d.textSummary) {
        return <MessageResponse>{d.textSummary}</MessageResponse>;
      }
      return null;
    }
    case "getGwasAssociations": {
      const d = output as { totalHits?: number; uniqueTraits?: number; topAssociations: CompressedGwasAssociation[] };
      if (d.topAssociations) {
        return <GwasRenderer data={d} />;
      }
      return null;
    }
    case "getGeneVariantStats": {
      const d = output as CompressedGeneStats;
      if (d.gene && d.totalVariants != null) {
        return <GeneStatsRenderer data={d} />;
      }
      return null;
    }
    case "findPaths": {
      const fp = output as PathsResult;
      if (fp?.paths && Array.isArray(fp.paths)) {
        return <PathsRenderer paths={fp.paths as CompressedPath[]} />;
      }
      return null;
    }
    case "findPatterns": {
      const pat = output as PatternsResult;
      if (pat?.matches && Array.isArray(pat.matches)) {
        return <PatternsRenderer data={pat} />;
      }
      return null;
    }
    case "createCohort": {
      const d = output as CompressedCohort;
      if (d.cohortId) return <CohortRenderer data={d} />;
      return null;
    }
    case "variant_profile": {
      const d = output as VariantProfileData;
      if (d.profiles?.length) return <VariantProfileRenderer data={d} />;
      return null;
    }
    case "planQuery":
    case "variantTriage":
    case "bioContext":
      // Handled by ActivityTimeline
      return null;
    default:
      return null;
  }
}
