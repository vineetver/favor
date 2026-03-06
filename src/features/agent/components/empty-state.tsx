"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import {
  PencilIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  CheckIcon,
} from "lucide-react";
import { cn } from "@infra/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shared/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@shared/components/ui/command";
import { Input } from "@shared/components/ui/input";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Spinner } from "@shared/components/ui/spinner";
import { ConversationEmptyState } from "@shared/components/ai-elements/conversation";
import { useTypeahead } from "@features/search/hooks/use-typeahead";
import type { EntityType } from "@features/search/types/api";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

type SeedCategory = "gene" | "disease" | "variant" | "drug";

interface SeedDef {
  key: string;
  defaultValue: string;
  category: SeedCategory;
}

interface StepDef {
  key: string;
  defaultValue: string;
  evidence?: string;
}

interface PromptCardDef {
  id: string;
  label: string;
  subtitle: string;
  outputPromise: string;
  tier: "simple" | "advanced";
  seeds: SeedDef[];
  steps: StepDef[];
  assemble: (
    seedValues: Record<string, string>,
    orderedSteps: string[],
  ) => string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_TO_ENTITY_TYPES: Record<SeedCategory, EntityType[] | null> = {
  gene: ["genes"],
  disease: ["diseases"],
  drug: ["drugs"],
  variant: null,
};

const STEP_GROUPS = [
  {
    label: "Genomics",
    options: [
      "variants",
      "genes",
      "genes (L2G)",
      "proteins",
      "protein domains",
    ],
  },
  {
    label: "Regulatory",
    options: ["cCREs", "tissues"],
  },
  {
    label: "Clinical",
    options: ["diseases", "phenotypes", "pathways", "GO terms", "metabolites"],
  },
  {
    label: "Therapy",
    options: [
      "drugs",
      "adverse effects",
      "interacting drugs",
      "side effects",
    ],
  },
];

// ---------------------------------------------------------------------------
// Card definitions
// ---------------------------------------------------------------------------

const PROMPT_CARDS: PromptCardDef[] = [
  // ── Pharma / Drug Discovery ──
  // Chain: Disease →(GENE_ASSOCIATED_WITH_DISEASE)→ Gene →(DRUG_ACTS_ON_GENE)→ Drug →(DRUG_HAS_ADVERSE_EFFECT)→ SideEffect
  // Key fields: ot_score+causality_level (100% fill), max_clinical_phase (62%), offsides_prr (86%)
  {
    id: "target-to-safety",
    label: "Target-to-safety pipeline",
    subtitle: "Targets ranked by evidence, drugs in trial, safety signals",
    outputPromise:
      "Gene targets with causality level and OT score, drugs with clinical phase, adverse effects with reporting ratio.",
    tier: "simple",
    seeds: [
      {
        key: "disease",
        defaultValue: "Alzheimer's disease",
        category: "disease",
      },
    ],
    steps: [
      { key: "s1", defaultValue: "genes", evidence: "causality + OT score" },
      { key: "s2", defaultValue: "drugs", evidence: "phase + mechanism" },
      { key: "s3", defaultValue: "adverse effects", evidence: "PRR + severity" },
    ],
    assemble: (v, steps) =>
      `For ${v.disease}, find the top associated ${steps.join(" → ")}. Rank gene targets by overall evidence score and show causality level. For drugs, show clinical phase and mechanism of action. For adverse effects, include the proportional reporting ratio and severity class.`,
  },

  // ── Clinical / Diagnostics ──
  // Chain: Variant →(VARIANT_IMPLIES_GENE / VARIANT_AFFECTS_GENE)→ Gene →(GENE_ASSOCIATED_WITH_DISEASE)→ Disease →(DISEASE_HAS_PHENOTYPE)→ Phenotype
  // Key fields: variant_consequence (100%), clinical_significance (29%), causality_level+confidence_class (100%), phenotype_frequency (82%)
  {
    id: "variant-clinical",
    label: "Variant to clinical action",
    subtitle: "Gene consequence, disease causality, phenotype frequency",
    outputPromise:
      "Gene with consequence and ClinVar status, diseases with causality and confidence, phenotypes with frequency and onset.",
    tier: "simple",
    seeds: [
      { key: "variant", defaultValue: "rs7412", category: "variant" },
    ],
    steps: [
      { key: "s1", defaultValue: "genes", evidence: "consequence + ClinVar" },
      { key: "s2", defaultValue: "diseases", evidence: "causality + confidence" },
      { key: "s3", defaultValue: "phenotypes", evidence: "frequency + onset" },
    ],
    assemble: (v, steps) =>
      `I have variant ${v.variant}. Trace it through ${steps.join(" → ")}. For the gene link, show consequence type and any ClinVar classification. For diseases, show causality level and confidence class. For phenotypes, include frequency and typical onset.`,
  },

  // ── WGS Functional Annotation (noncoding) ──
  // Chain: Variant →(VARIANT_OVERLAPS_CCRE)→ cCRE →(CCRE_REGULATES_GENE)→ Gene →(GENE_EXPRESSED_IN_TISSUE)→ Tissue
  // Key fields: annotation (100%, PLS/pELS/dELS), evidence_method+max_score (100%, ABC/eQTL/CRISPR), tpm_median (100%)
  {
    id: "noncoding-mechanism",
    label: "Noncoding variant mechanism",
    subtitle: "Regulatory element, target gene, tissue expression",
    outputPromise:
      "cCRE type and annotation, gene link with evidence method and regulatory score, tissue expression by TPM.",
    tier: "simple",
    seeds: [
      { key: "variant", defaultValue: "rs1421085", category: "variant" },
    ],
    steps: [
      { key: "s1", defaultValue: "cCREs", evidence: "ENCODE annotation" },
      { key: "s2", defaultValue: "genes", evidence: "ABC / eQTL / CRISPR" },
      { key: "s3", defaultValue: "tissues", evidence: "median TPM" },
    ],
    assemble: (v, steps) =>
      `Does ${v.variant} overlap a regulatory element? Trace it through ${steps.join(" → ")}. Show the cCRE annotation type (enhancer vs promoter), the evidence method linking it to the target gene, and tissue expression levels.`,
  },

  // ── IGVF / Regulatory Genomics ──
  // Chain: Variant →(VARIANT_IMPLIES_GENE, L2G mode)→ Gene →(GENE_PARTICIPATES_IN_PATHWAY)→ Pathway
  //   + branch: Gene →(GENE_ASSOCIATED_WITH_DISEASE)→ Disease
  // Key fields: l2g_score/pgboost_score+credible_set_confidence, pathway source (KEGG/Reactome), ot_score+causality_level
  // Note: no Pathway→Disease edge; agent branches from gene frontier for diseases
  {
    id: "gwas-to-biology",
    label: "GWAS locus to pathway biology",
    subtitle: "Causal gene via L2G, pathways, and disease context",
    outputPromise:
      "Causal gene with locus-to-gene evidence, pathway membership by source, disease associations with causality.",
    tier: "simple",
    seeds: [
      { key: "variant", defaultValue: "rs7903146", category: "variant" },
    ],
    steps: [
      { key: "s1", defaultValue: "genes (L2G)", evidence: "locus-to-gene" },
      { key: "s2", defaultValue: "pathways", evidence: "KEGG / Reactome" },
      { key: "s3", defaultValue: "diseases", evidence: "OT score + causality" },
    ],
    assemble: (v, steps) =>
      `For GWAS variant ${v.variant}, identify the likely causal gene by locus-to-gene evidence. Then show what pathways that gene participates in and what diseases it's associated with. Include the L2G or colocalization confidence and pathway sources.`,
  },
];

// ---------------------------------------------------------------------------
// Quick prompts
// ---------------------------------------------------------------------------

const QUICK_PROMPTS = [
  {
    label: "Compare BRCA1 vs BRCA2 disease associations",
    prompt:
      "Compare BRCA1 and BRCA2: what diseases do they share versus unique to each? Show causality level and confidence class for each association.",
  },
  {
    label: "Top risk genes for type 2 diabetes",
    prompt:
      "What are the top 10 genes associated with type 2 diabetes by overall evidence score? Show causality level and whether any have drugs in clinical trials.",
  },
  {
    label: "What does rs12740374 regulate?",
    prompt:
      "Does rs12740374 overlap a cCRE? If so, what gene does that element regulate, by what evidence method, and in which tissues is the gene most expressed?",
  },
];

// ---------------------------------------------------------------------------
// Token editors
// ---------------------------------------------------------------------------

function TypeaheadTokenEditor({
  entityTypes,
  onConfirm,
  onCancel,
}: {
  entityTypes: EntityType[];
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const { query, setQuery, results, isLoading, hasResults } = useTypeahead({
    types: entityTypes,
    limit: 6,
    minLength: 2,
    debounce: 150,
  });

  const suggestions = useMemo(() => {
    if (!results) return [];
    return results.groups.flatMap((g) =>
      g.suggestions.map((s) => ({
        id: s.id,
        name: s.display_name,
        type: s.entity_type,
      })),
    );
  }, [results]);

  return (
    <Command shouldFilter={false} className="rounded-lg border-none shadow-none">
      <CommandInput
        placeholder={`Search ${entityTypes.join(", ")}...`}
        value={query}
        onValueChange={setQuery}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && !hasResults && query.trim()) {
            e.preventDefault();
            onConfirm(query.trim());
          }
        }}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-3">
            <Spinner className="size-3.5" />
          </div>
        )}
        {!isLoading && query.length >= 2 && !hasResults && (
          <CommandEmpty>No matches. Press Enter to use your text.</CommandEmpty>
        )}
        {hasResults && (
          <CommandGroup>
            {suggestions.map((s) => (
              <CommandItem
                key={s.id}
                value={s.id}
                onSelect={() => onConfirm(s.name)}
              >
                <span className="truncate">{s.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground capitalize">
                  {s.type.replace(/_/g, " ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

function GroupedStepPicker({
  value,
  onConfirm,
  onCancel,
}: {
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  return (
    <Command className="rounded-lg border-none shadow-none">
      <CommandInput
        placeholder="Search steps..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {STEP_GROUPS.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.options.map((opt) => (
              <CommandItem
                key={opt}
                value={opt}
                onSelect={() => onConfirm(opt)}
                className={cn(opt === value && "font-semibold text-primary")}
              >
                {opt}
                {opt === value && (
                  <CheckIcon className="ml-auto size-3 text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
}

function TextTokenEditor({
  value,
  onConfirm,
  onCancel,
}: {
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [inputValue, setInputValue] = useState(value);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (inputValue.trim()) onConfirm(inputValue.trim());
      }}
      className="flex flex-col gap-1.5 p-2"
    >
      <Input
        autoFocus
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="e.g. rs1421085"
        className="h-8 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      <p className="text-[10px] text-muted-foreground px-0.5">
        Enter to confirm
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Editable tokens (only rendered in edit mode)
// ---------------------------------------------------------------------------

function EditableSeedToken({
  value,
  category,
  onChange,
}: {
  value: string;
  category: SeedCategory;
  onChange: (newValue: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleConfirm = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange],
  );
  const handleCancel = useCallback(() => setOpen(false), []);

  const entityTypes = CATEGORY_TO_ENTITY_TYPES[category];
  const editor = entityTypes ? (
    <TypeaheadTokenEditor
      entityTypes={entityTypes}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : (
    <TextTokenEditor
      value={value}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="ghost"
          role="button"
          tabIndex={0}
          className={cn(
            "cursor-pointer select-none px-2 py-0.5 text-[11px] font-semibold border-transparent",
            "active:scale-[0.97] transition-all",
            "bg-primary/10 text-primary hover:bg-primary/20",
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {value}
          <PencilIcon className="size-2.5 opacity-50" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {editor}
      </PopoverContent>
    </Popover>
  );
}

function EditableStepToken({
  value,
  onChange,
}: {
  value: string;
  onChange: (newValue: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleConfirm = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange],
  );
  const handleCancel = useCallback(() => setOpen(false), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="ghost"
          role="button"
          tabIndex={0}
          className={cn(
            "cursor-pointer select-none px-2 py-0.5 text-[11px] font-medium border-transparent",
            "active:scale-[0.97] transition-all",
            "bg-transparent text-foreground/60 border-border hover:bg-accent/50",
          )}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {value}
          <ChevronDownIcon className="size-2.5 opacity-40" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-0"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <GroupedStepPicker
          value={value}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// PromptCard
// ---------------------------------------------------------------------------

function PromptCard({
  def,
  onRun,
}: {
  def: PromptCardDef;
  onRun: (prompt: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  const [seedValues, setSeedValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(def.seeds.map((s) => [s.key, s.defaultValue])),
  );
  const [stepValues, setStepValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(def.steps.map((s) => [s.key, s.defaultValue])),
  );
  const [stepOrder, setStepOrder] = useState<string[]>(() =>
    def.steps.map((s) => s.key),
  );

  const handleSeedChange = useCallback((key: string, value: string) => {
    setSeedValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleStepChange = useCallback((key: string, value: string) => {
    setStepValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleReorder = useCallback((from: number, to: number) => {
    setStepOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleRun = useCallback(() => {
    const orderedStepValues = stepOrder.map((k) => stepValues[k]);
    onRun(def.assemble(seedValues, orderedStepValues));
  }, [stepOrder, stepValues, seedValues, onRun, def]);

  // Drag state for edit mode
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef({ from: -1, to: -1 });

  const firstSeedKey = def.seeds[0].key;
  const lastStepKey = stepOrder[stepOrder.length - 1];

  if (editing) {
    return (
      <div
        className={cn(
          "group/card rounded-xl border bg-card px-3.5 py-3 text-left",
          "border-primary/30 shadow-[0_2px_24px_rgba(124,58,237,0.08)]",
          "transition-all duration-200",
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h3 className="text-[13px] font-semibold text-foreground leading-none">
            {def.label}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              className="h-6 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Done
            </Button>
            <Button
              size="sm"
              onClick={() => {
                handleRun();
                setEditing(false);
              }}
              className="h-6 gap-1 px-2.5 text-[11px] font-medium"
            >
              Run
              <ArrowRightIcon className="size-3" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-1">
          {def.seeds.map((seed) => (
            <EditableSeedToken
              key={seed.key}
              value={seedValues[seed.key] ?? ""}
              category={seed.category}
              onChange={(v) => handleSeedChange(seed.key, v)}
            />
          ))}

          {stepOrder.length > 0 && (
            <span className="text-muted-foreground/30 text-[10px] mx-0.5">
              →
            </span>
          )}

          {stepOrder.map((key, i) => (
            <Fragment key={key}>
              {i > 0 && (
                <span className="text-muted-foreground/30 text-[10px] mx-0.5">
                  →
                </span>
              )}
              <span
                draggable={stepOrder.length > 1}
                onDragStart={(e) => {
                  dragRef.current.from = i;
                  setDragIdx(i);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  dragRef.current.to = i;
                  setOverIdx(i);
                }}
                onDragEnd={() => {
                  const { from, to } = dragRef.current;
                  if (from >= 0 && to >= 0 && from !== to)
                    handleReorder(from, to);
                  dragRef.current = { from: -1, to: -1 };
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                className={cn(
                  "inline-flex rounded-full transition-all duration-150",
                  stepOrder.length > 1 && "cursor-grab active:cursor-grabbing",
                  dragIdx === i && "opacity-30 scale-95",
                  overIdx === i &&
                    dragIdx !== null &&
                    dragIdx !== i &&
                    "ring-2 ring-primary/25 ring-offset-1",
                )}
              >
                <EditableStepToken
                  value={stepValues[key] ?? ""}
                  onChange={(v) => handleStepChange(key, v)}
                />
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleRun}
      className={cn(
        "group/card rounded-xl border bg-card px-3.5 py-3 text-left",
        "border-border/30 transition-all duration-200",
        "hover:border-primary/20 hover:shadow-[0_1px_12px_rgba(124,58,237,0.04)]",
      )}
    >
      {/* Row 1: title */}
      <h3 className="text-[13px] font-semibold text-foreground leading-none mb-1">
        {def.label}
      </h3>

      {/* Row 2: chain summary */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-primary">
          {seedValues[firstSeedKey]}
        </span>
        <span className="text-muted-foreground/30 text-[10px]">→</span>
        <span className="text-[11px] text-muted-foreground/70">
          {stepValues[lastStepKey]}
        </span>
        <span className="text-[10px] text-muted-foreground/30">
          · {stepOrder.length} steps
        </span>

        {/* Edit — appears on hover, stops propagation */}
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              setEditing(true);
            }
          }}
          className={cn(
            "ml-auto text-[10px] font-medium transition-colors duration-150",
            "text-transparent group-hover/card:text-muted-foreground/50",
            "hover:text-primary! cursor-pointer",
          )}
        >
          Edit
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// EmptyState (exported)
// ---------------------------------------------------------------------------

export function EmptyState({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <ConversationEmptyState className="items-start sm:items-center justify-start sm:justify-center overflow-y-auto p-4 sm:p-8">
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
        {/* Heading */}
        <div className="relative flex flex-col items-center gap-2 mb-6">
          <div className="absolute -top-10 w-56 h-28 bg-primary/4 rounded-full blur-3xl pointer-events-none" />
          <h2 className="relative text-foreground text-lg sm:text-xl font-bold text-center leading-snug tracking-tight">
            Interpret any variant, gene, or disease — in seconds.
          </h2>
          <p className="relative text-[13px] text-muted-foreground/70 text-center">
            Pick a workflow, swap the seed, and run.
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
          {PROMPT_CARDS.map((def) => (
            <PromptCard key={def.id} def={def} onRun={onSelect} />
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full mt-8 mb-4">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-[11px] text-muted-foreground/40 whitespace-nowrap">
            Or try a question
          </span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap justify-center gap-2 w-full">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => onSelect(p.prompt)}
              className={cn(
                "px-3.5 py-2 rounded-full text-[12px] text-muted-foreground/60",
                "border border-border/30",
                "transition-all duration-200",
                "hover:border-primary/20 hover:text-foreground hover:bg-primary/3",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </ConversationEmptyState>
  );
}
