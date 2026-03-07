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

type SeedCategory = "gene" | "disease" | "variant" | "drug" | "phenotype";

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
  phenotype: ["phenotypes"],
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
  // ── Pharma / Target Assessment ──
  // Chain: Gene →(GENE_ASSOCIATED_WITH_DISEASE)→ Disease →(DRUG_INDICATED_FOR_DISEASE)→ Drug →(DRUG_HAS_ADVERSE_EFFECT)→ SideEffect
  // Key fields: ot_score+causality_level, max_clinical_phase, offsides_prr
  {
    id: "target-dossier",
    label: "Target assessment dossier",
    subtitle:
      "Tractability, disease links, pipeline drugs, and safety signals",
    outputPromise:
      "Disease associations with causality tiers, drugs with mechanism and phase, adverse effects with reporting ratio, tractability flags.",
    tier: "simple",
    seeds: [{ key: "gene", defaultValue: "LRRK2", category: "gene" }],
    steps: [
      {
        key: "s1",
        defaultValue: "diseases",
        evidence: "OT score + causality",
      },
      { key: "s2", defaultValue: "drugs", evidence: "phase + mechanism" },
      {
        key: "s3",
        defaultValue: "adverse effects",
        evidence: "PRR + frequency",
      },
    ],
    assemble: (v, steps) =>
      `Build a target assessment dossier for ${v.gene}. Trace through ${steps.join(" → ")}. Include the gene's tractability flags (pocket, ligand) and constraint scores. For diseases, show causality level and overall evidence score — flag causal or implicated tiers. For drugs, show mechanism of action and max clinical phase. For adverse effects, show proportional reporting ratio. Present as tables with evidence scores visible.`,
  },

  // ── Clinical PGx ──
  // Chain: Gene →(GENE_AFFECTS_DRUG_RESPONSE+DRUG_DISPOSITION_BY_GENE)→ Drug →(DRUG_HAS_ADVERSE_EFFECT)→ SideEffect
  // Key fields: disposition_type, pharmgkb_evidence, offsides_prr
  {
    id: "pgx-cascade",
    label: "Pharmacogenomics cascade",
    subtitle:
      "Drug metabolism, disposition, dosing implications, and PGx variants",
    outputPromise:
      "Drugs metabolized/transported by gene with PharmGKB evidence, adverse effects with PRR, PGx variant associations.",
    tier: "simple",
    seeds: [{ key: "gene", defaultValue: "CYP2C19", category: "gene" }],
    steps: [
      {
        key: "s1",
        defaultValue: "drugs",
        evidence: "disposition + PharmGKB",
      },
      {
        key: "s2",
        defaultValue: "adverse effects",
        evidence: "PRR + frequency",
      },
    ],
    assemble: (v, steps) =>
      `For pharmacogene ${v.gene}, trace through ${steps.join(" → ")}. Show disposition type (metabolizer/transporter), PharmGKB evidence level, and dosing implications. For adverse effects, include the proportional reporting ratio. Also note any PGx variants in ${v.gene} with known drug associations (e.g. poor/rapid metabolizer alleles). Present as tables.`,
  },

  // ── Regulatory / IGVF ──
  // Chain: Variant →(VARIANT_OVERLAPS_CCRE)→ cCRE →(CCRE_REGULATES_GENE)→ Gene →(GENE_ASSOCIATED_WITH_DISEASE)→ Disease
  // Key fields: annotation, evidence_modality+max_score+top_tissue, ot_score+causality_level
  {
    id: "noncoding-deep-dive",
    label: "Non-coding variant deep dive",
    subtitle:
      "Enhancer overlap, regulatory evidence modalities, and disease link",
    outputPromise:
      "cCRE annotation and class, gene link with evidence modality (ABC/eQTL/CRISPR) and tissue, disease associations with causality.",
    tier: "simple",
    seeds: [
      { key: "variant", defaultValue: "rs1421085", category: "variant" },
    ],
    steps: [
      { key: "s1", defaultValue: "cCREs", evidence: "ENCODE annotation" },
      {
        key: "s2",
        defaultValue: "genes",
        evidence: "ABC / eQTL / CRISPR",
      },
      {
        key: "s3",
        defaultValue: "diseases",
        evidence: "OT score + causality",
      },
    ],
    assemble: (v, steps) =>
      `Does noncoding variant ${v.variant} fall in a regulatory element? Trace through ${steps.join(" → ")}. Show the cCRE annotation type (promoter-like vs enhancer) and evidence signals. For the cCRE-to-gene link, show all evidence modalities (ABC, eQTL, CRISPR), the max score, and top tissue. Then show diseases the gene is associated with, including causality level and overall evidence score. Present as tables.`,
  },

  // ── Rare Disease / Clinical Genetics ──
  // Chain: Phenotype →(DISEASE_HAS_PHENOTYPE, inbound)→ Disease →(GENE_ASSOCIATED_WITH_DISEASE, inbound)→ Gene
  // Key fields: clinGen/genCC classification, mode_of_inheritance, causality_level
  {
    id: "rare-disease-prioritize",
    label: "Rare disease gene prioritization",
    subtitle:
      "Phenotype overlap to candidate diseases and high-confidence genes",
    outputPromise:
      "Diseases matching phenotype set, genes with ClinGen classification, mode of inheritance, and causality filtering.",
    tier: "simple",
    seeds: [
      { key: "pheno1", defaultValue: "Seizures", category: "phenotype" },
      { key: "pheno2", defaultValue: "Microcephaly", category: "phenotype" },
    ],
    steps: [
      {
        key: "s1",
        defaultValue: "diseases",
        evidence: "phenotype overlap",
      },
      { key: "s2", defaultValue: "genes", evidence: "ClinGen + causality" },
    ],
    assemble: (v, steps) =>
      `A patient presents with ${v.pheno1} and ${v.pheno2}. Trace through ${steps.join(" → ")}. Find diseases that have both phenotypes, then identify genes associated with those diseases. Filter to genes with strong/definitive ClinGen or GenCC classification. Show mode of inheritance and causality level. Present as tables with classification and confidence visible.`,
  },

  // ── Oncology ──
  // Chain: Gene →(GENE_ALTERED_IN_DISEASE)→ Disease →(DRUG_INDICATED_FOR_DISEASE+GENE_AFFECTS_DRUG_RESPONSE)→ Drug
  // Key fields: alteration_frequency (TCGA/COSMIC), evidence_level (CIViC/AMP), max_clinical_phase
  {
    id: "oncology-actionability",
    label: "Oncology actionability report",
    subtitle:
      "Somatic alterations, cancer drivers, and actionable therapies",
    outputPromise:
      "Cancers with alteration frequencies, driver flags, actionable therapies with evidence level and clinical phase.",
    tier: "simple",
    seeds: [{ key: "gene", defaultValue: "BRAF", category: "gene" }],
    steps: [
      {
        key: "s1",
        defaultValue: "diseases",
        evidence: "TCGA + COSMIC freq",
      },
      { key: "s2", defaultValue: "drugs", evidence: "CIViC + phase" },
    ],
    assemble: (v, steps) =>
      `Build an oncology actionability report for ${v.gene}. Trace through ${steps.join(" → ")}. Show cancers where the gene is somatically altered with alteration frequency (TCGA, COSMIC) and flag cancer driver status. For drugs, show evidence level (CIViC, AMP tier), mechanism of action, and max clinical phase. Highlight FDA-approved therapies. Present as tables.`,
  },

  // ── Drug Safety / Polypharmacy ──
  // Chain: Drug →(DRUG_INTERACTS_WITH_DRUG)→ Drug →(DRUG_HAS_ADVERSE_EFFECT)→ SideEffect
  // + DRUG_PAIR_CAUSES_SIDE_EFFECT, VARIANT_ASSOCIATED_WITH_DRUG
  {
    id: "drug-safety-polypharmacy",
    label: "Drug safety & polypharmacy",
    subtitle:
      "Drug-drug interactions, shared ADRs, and pharmacogenomic variants",
    outputPromise:
      "DDI severity, shared/unique adverse effects with PRR, polypharmacy side effects, PGx variants.",
    tier: "simple",
    seeds: [
      { key: "drug1", defaultValue: "Clopidogrel", category: "drug" },
      { key: "drug2", defaultValue: "Omeprazole", category: "drug" },
    ],
    steps: [
      {
        key: "s1",
        defaultValue: "interacting drugs",
        evidence: "DDI severity",
      },
      {
        key: "s2",
        defaultValue: "adverse effects",
        evidence: "PRR comparison",
      },
      { key: "s3", defaultValue: "side effects", evidence: "pair PRR" },
    ],
    assemble: (v, steps) =>
      `Evaluate the safety profile of taking ${v.drug1} and ${v.drug2} together. Trace through ${steps.join(" → ")}. Check for direct drug-drug interactions and show severity. Compare adverse effect profiles — which ADRs are shared vs unique to each drug, with proportional reporting ratios. Check for polypharmacy side effects specific to this combination. Also note any PGx variants that affect response to either drug. Present as tables.`,
  },
];

// ---------------------------------------------------------------------------
// Quick prompts
// ---------------------------------------------------------------------------

const QUICK_PROMPTS = [
  {
    label: "Compare JAK inhibitors: targets, indications, and safety",
    prompt:
      "Compare JAK inhibitors (Tofacitinib, Baricitinib, Upadacitinib): which gene targets does each act on, what diseases are they indicated for, and how do their adverse effect profiles compare? Show mechanism of action, clinical phase, and proportional reporting ratios.",
  },
  {
    label: "Map the Wnt signaling cascade: genes, sub-pathways, and metabolites",
    prompt:
      "Map the Wnt signaling pathway: what genes participate, which sub-pathways branch off, and what metabolites are involved? Show pathway sources (Reactome/KEGG) and highlight any genes with known disease associations.",
  },
  {
    label: "Non-coding GWAS hits for T2D with enhancer evidence",
    prompt:
      "Find non-coding GWAS variants for Type 2 diabetes that overlap enhancer cCREs. For each, show the cCRE annotation type, the regulatory evidence modality (ABC, eQTL, CRISPR) linking to a target gene, and the gene's disease association score. Focus on variants with strong enhancer evidence.",
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
            Interpret any variant, gene, or disease in seconds.
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
