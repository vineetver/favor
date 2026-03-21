// ---------------------------------------------------------------------------
// Run command summary helper
// ---------------------------------------------------------------------------

function getRunCommandSummary(
  command: string,
  inp: Record<string, unknown>,
): string {
  switch (command) {
    case "explore": {
      const seeds = inp.seeds as Array<{ label?: string; id?: string }> | undefined;
      const into = inp.into as string[] | undefined;
      const seedLabel = seeds?.[0]?.label ?? seeds?.[0]?.id ?? "entities";
      const targetLabel = into?.join(", ") ?? "neighbors";
      return `explore ${seedLabel} → ${targetLabel}`;
    }
    case "rows": {
      const sort = inp.sort as string | undefined;
      const limit = inp.limit as number | undefined;
      const parts = ["rows"];
      if (sort) parts.push(`sort: ${sort}`);
      if (limit) parts.push(`limit: ${limit}`);
      return parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(", ")})` : parts[0];
    }
    case "groupby": {
      const groupBy = inp.group_by as string | undefined;
      return groupBy ? `group by ${groupBy}` : "group by";
    }
    case "correlation": {
      const x = inp.x as string | undefined;
      const y = inp.y as string | undefined;
      return x && y ? `correlation: ${x} vs ${y}` : "correlation";
    }
    case "derive": {
      const label = inp.label as string | undefined;
      return label ? `derive cohort: ${label}` : "derive cohort";
    }
    case "prioritize": {
      const criteria = inp.criteria as Array<{ column?: string }> | undefined;
      const cols = criteria?.map((c) => c.column).filter(Boolean).join(", ");
      return cols ? `prioritize by ${cols}` : "prioritize";
    }
    case "compute": {
      const weights = inp.weights as Array<{ column?: string }> | undefined;
      const cols = weights?.map((w) => w.column).filter(Boolean).join(", ");
      return cols ? `compute score: ${cols}` : "compute score";
    }
    case "analytics": {
      const method = inp.method as string | undefined;
      return method ? `analytics: ${method.replace(/_/g, " ")}` : "analytics";
    }
    case "analytics.poll": {
      return "polling analytics result";
    }
    case "viz": {
      const chartId = inp.chart_id as string | undefined;
      return chartId ? `viz: ${chartId}` : "generating visualization";
    }
    case "export":
      return "export cohort";
    case "create_cohort": {
      const refs = inp.references as string[] | undefined;
      return refs?.length ? `create cohort (${refs.length} variants)` : "create cohort";
    }
    case "enrich": {
      const inputSet = inp.input_set as unknown[] | undefined;
      const target = inp.target as string | undefined;
      return target
        ? `enrich ${inputSet?.length ?? "?"} genes → ${target}`
        : `enrich ${inputSet?.length ?? "?"} genes`;
    }
    case "traverse":
      return "traverse graph";
    case "paths": {
      const from = inp.from as string | undefined;
      const to = inp.to as string | undefined;
      return from && to ? `paths: ${from} → ${to}` : "find paths";
    }
    case "compare": {
      const entities = inp.entities as Array<{ label?: string; id?: string }> | undefined;
      const labels = entities?.map((e) => e.label ?? e.id ?? "?").join(" vs ");
      return labels ? `compare ${labels}` : "compare entities";
    }
    case "pin":
      return "pin entities";
    case "set_cohort":
      return "set active cohort";
    case "remember": {
      const key = inp.key as string | undefined;
      return key ? `remember: ${key}` : "saving memory";
    }
    default:
      return command;
  }
}

// ---------------------------------------------------------------------------
// Human-readable tool input summaries
// ---------------------------------------------------------------------------

export function getToolInputSummary(
  toolName: string,
  input: unknown,
): string | null {
  if (!input || typeof input !== "object") return null;

  const inp = input as Record<string, unknown>;
  const name = toolName.replace(/^tool-/, "");

  switch (name) {
    case "searchEntities": {
      const q = inp.query as string | undefined;
      const types = inp.types as string[] | undefined;
      if (!q) return null;
      return types?.length
        ? `Searching for "${q}" (${types.join(", ")})`
        : `Searching for "${q}"`;
    }
    case "getEntityContext": {
      const type = inp.type as string | undefined;
      const id = inp.id as string | undefined;
      if (!id) return null;
      return type ? `Getting context for ${type}:${id}` : `Getting context for ${id}`;
    }
    case "compareEntities": {
      const entities = inp.entities as Array<{ id?: string }> | undefined;
      if (!entities?.length) return null;
      return `Comparing ${entities.map((e) => e.id).join(" vs ")}`;
    }
    case "getRankedNeighbors": {
      const type = inp.type as string | undefined;
      const id = inp.id as string | undefined;
      const edge = inp.edgeType as string | undefined;
      if (!id) return null;
      return edge
        ? `Finding ${edge} neighbors of ${type ?? ""}:${id}`
        : `Finding neighbors of ${type ?? ""}:${id}`;
    }
    case "runEnrichment": {
      const genes = inp.genes as unknown[] | undefined;
      const targetType = inp.targetType as string | undefined;
      return targetType
        ? `Enrichment analysis for ${targetType} (${genes?.length ?? 0} genes)`
        : `Enrichment analysis (${genes?.length ?? 0} genes)`;
    }
    case "findPaths": {
      const from = inp.from as { type?: string; id?: string } | string | undefined;
      const to = inp.to as { type?: string; id?: string } | string | undefined;
      const fmtEntity = (e: { type?: string; id?: string } | string | undefined) => {
        if (!e) return null;
        if (typeof e === "string") return e;
        return e.type ? `${e.type}:${e.id}` : e.id;
      };
      const src = fmtEntity(from);
      const tgt = fmtEntity(to);
      if (!src || !tgt) return null;
      return `Finding paths from ${src} to ${tgt}`;
    }
    case "findPatterns": {
      const pattern = inp.pattern as Array<{ var?: string; type?: string; edge?: string }> | undefined;
      if (!pattern?.length) return null;
      const nodeVars = pattern.filter(p => p.var).map(p => p.type).join(", ");
      const edgeCount = pattern.filter(p => p.edge).length;
      return `Finding ${nodeVars} patterns (${edgeCount} edge constraints)`;
    }
    case "getSharedNeighbors": {
      const entities = inp.entities as Array<{ type?: string; id?: string }> | undefined;
      if (!entities?.length) return null;
      return `Finding shared neighbors of ${entities.map((e) => e.id ?? "?").join(", ")}`;
    }
    case "lookupVariant": {
      const id = inp.variantId as string | undefined;
      return id ? `Looking up variant ${id}` : null;
    }
    case "getGeneVariantStats": {
      const gene = inp.geneSymbol as string | undefined;
      return gene ? `Getting variant stats for ${gene}` : null;
    }
    case "getGwasAssociations": {
      const id = inp.entityId as string | undefined;
      return id ? `Looking up GWAS associations for ${id}` : null;
    }
    case "createCohort": {
      const variants = inp.variants as string[] | undefined;
      return variants?.length
        ? `Creating cohort with ${variants.length} variants`
        : "Creating cohort";
    }
    case "analyzeCohort": {
      const op = inp.operation as string | undefined;
      const cohortId = inp.cohortId as string | undefined;
      return op && cohortId
        ? `Running ${op} on cohort ${cohortId}`
        : "Analyzing cohort";
    }
    case "runAnalytics": {
      const task = inp.task as { type?: string } | undefined;
      const taskType = task?.type;
      if (taskType === "gwas_qc") return "Running GWAS QC";
      return taskType ? `Running ${taskType.replace(/_/g, " ")}` : "Running analytics";
    }
    case "getConnections": {
      const from = inp.from as { type?: string; id?: string } | undefined;
      const to = inp.to as { type?: string; id?: string } | undefined;
      if (!from?.id || !to?.id) return null;
      return `Finding connections between ${from.type ?? ""}:${from.id} and ${to.type ?? ""}:${to.id}`;
    }
    case "getEdgeDetail": {
      const f = inp.from as string | undefined;
      const t = inp.to as string | undefined;
      const et = inp.edgeType as string | undefined;
      if (!f || !t) return null;
      return et
        ? `Getting ${et} edge detail: ${f} → ${t}`
        : `Getting edge detail: ${f} → ${t}`;
    }
    case "graphTraverse": {
      return "Traversing knowledge graph";
    }
    case "variantBatchSummary": {
      const variants = inp.variants as string[] | undefined;
      return variants?.length
        ? `Summarizing ${variants.length} variants`
        : "Summarizing variant batch";
    }
    case "planQuery": {
      const uq = inp.userQuery as string | undefined;
      return uq
        ? `Planning: ${uq.length > 50 ? uq.slice(0, 47) + "..." : uq}`
        : "Planning query";
    }
    case "getGraphSchema": {
      const nt = inp.nodeType as string | undefined;
      return nt ? `Looking up schema for ${nt}` : "Looking up graph schema";
    }
    case "getCohortSchema": {
      const cid = inp.cohortId as string | undefined;
      return cid ? `Getting schema for cohort ${cid}` : "Getting cohort schema";
    }
    case "variantTriage": {
      const task = inp.task as string | undefined;
      return task
        ? `Analyzing: ${task.length > 60 ? task.slice(0, 57) + "..." : task}`
        : "Analyzing variants";
    }
    case "bioContext": {
      const task = inp.task as string | undefined;
      return task
        ? `Exploring: ${task.length > 60 ? task.slice(0, 57) + "..." : task}`
        : "Exploring graph";
    }
    case "State":
      return "Fetching workspace state";
    case "Read": {
      const path = inp.path as string | undefined;
      if (!path) return "Reading resource";
      return `Read ${path.length > 50 ? path.slice(0, 47) + "..." : path}`;
    }
    case "Search": {
      const q = inp.query as string | undefined;
      const scope = inp.scope as string | undefined;
      if (!q) return "Searching";
      return scope && scope !== "all"
        ? `Search "${q}" (${scope})`
        : `Search "${q}"`;
    }
    case "Run": {
      const cmd = inp.command as string | undefined;
      if (!cmd) return "Running command";
      return getRunCommandSummary(cmd, inp);
    }
    case "AskUser": {
      const question = inp.question as string | undefined;
      if (!question) return "Asking user";
      return question.length > 60
        ? question.slice(0, 57) + "..."
        : question;
    }
    default:
      return null;
  }
}
