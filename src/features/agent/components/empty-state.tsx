"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { PencilIcon, ArrowRightIcon, ChevronDownIcon } from "lucide-react";
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

type TokenCategory = "gene" | "disease" | "variant" | "drug" | "step";

interface TokenDef {
  key: string;
  defaultValue: string;
  category: TokenCategory;
}

type TemplatePart = string | { tokenKey: string };

interface PromptCardDef {
  id: string;
  label: string;
  description: string;
  hint?: string;
  seeds: TokenDef[];
  steps: TokenDef[];
  seedTemplate: TemplatePart[];
  assemble: (values: Record<string, string>, orderedSteps: string[]) => string;
}

const CATEGORY_TO_ENTITY_TYPES: Record<
  Exclude<TokenCategory, "step">,
  EntityType[] | null
> = {
  gene: ["genes"],
  disease: ["diseases"],
  drug: ["drugs"],
  variant: null,
};

const STEP_OPTIONS = [
  "variants",
  "genes",
  "genes (L2G)",
  "proteins",
  "protein domains",
  "diseases",
  "drugs",
  "pathways",
  "phenotypes",
  "cCREs",
  "tissues",
  "GO terms",
  "metabolites",
  "adverse effects",
  "interacting drugs",
  "side effects",
];

// ---------------------------------------------------------------------------
// Prompt card definitions — 2 steps each for a clean pipeline
// ---------------------------------------------------------------------------

const PROMPT_CARDS: PromptCardDef[] = [
  {
    id: "variant-mechanism",
    label: "Variant mechanism",
    description: "Trace regulatory impact from a variant",
    seeds: [{ key: "variant", defaultValue: "rs1421085", category: "variant" }],
    steps: [
      { key: "s1", defaultValue: "cCREs", category: "step" },
      { key: "s2", defaultValue: "genes", category: "step" },
      { key: "s3", defaultValue: "tissues", category: "step" },
      { key: "s4", defaultValue: "diseases", category: "step" },
    ],
    seedTemplate: [{ tokenKey: "variant" }],
    assemble: (v, steps) =>
      `Starting from variant ${v.variant}, trace the regulatory mechanism through ${steps.join(" → ")}. Show key findings at each hop.`,
  },
  {
    id: "target-to-therapy",
    label: "Target to therapy",
    description: "Find drugs for a gene target",
    hint: "targets + indications",
    seeds: [{ key: "gene", defaultValue: "PCSK9", category: "gene" }],
    steps: [
      { key: "s1", defaultValue: "diseases", category: "step" },
      { key: "s2", defaultValue: "drugs", category: "step" },
    ],
    seedTemplate: [{ tokenKey: "gene" }],
    assemble: (v, steps) =>
      `Start from ${v.gene} and traverse through ${steps.join(" → ")}. Rank by clinical phase, target score, and indication strength.`,
  },
  {
    id: "gwas-triage",
    label: "GWAS locus triage",
    description: "Prioritize GWAS hits by druggability",
    seeds: [{ key: "variant", defaultValue: "rs7903146", category: "variant" }],
    steps: [
      { key: "s1", defaultValue: "genes (L2G)", category: "step" },
      { key: "s2", defaultValue: "pathways", category: "step" },
      { key: "s3", defaultValue: "drugs", category: "step" },
    ],
    seedTemplate: [{ tokenKey: "variant" }],
    assemble: (v, steps) =>
      `Triage GWAS locus at ${v.variant}: map through ${steps.join(" → ")}. Prioritize by locus-to-gene score and druggability.`,
  },
  {
    id: "drug-safety",
    label: "Drug safety",
    description: "Surface adverse effects and interactions",
    seeds: [{ key: "drug", defaultValue: "warfarin", category: "drug" }],
    steps: [
      { key: "s1", defaultValue: "adverse effects", category: "step" },
      { key: "s2", defaultValue: "interacting drugs", category: "step" },
      { key: "s3", defaultValue: "side effects", category: "step" },
    ],
    seedTemplate: [{ tokenKey: "drug" }],
    assemble: (v, steps) =>
      `Analyze ${v.drug}: trace through ${steps.join(" → ")}. Flag high-risk interactions and common adverse events.`,
  },
];

// ---------------------------------------------------------------------------
// Quick prompts (replaces exploratory pipeline cards)
// ---------------------------------------------------------------------------

const QUICK_PROMPTS = [
  {
    label: "Map the landscape of type 2 diabetes",
    prompt:
      "Map the genetic landscape of type 2 diabetes: identify top risk genes, enriched pathways, and druggable targets.",
  },
  {
    label: "Explore connections from BRCA1",
    prompt:
      "Start with BRCA1 and guide me to the most actionable connections through genes, pathways, and drugs. Summarize the key findings.",
  },
  {
    label: "What drugs interact with metformin?",
    prompt:
      "Analyze metformin: identify interacting drugs, adverse effects, and related metabolic pathways.",
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

function StepTokenEditor({
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
        placeholder="Choose a step..."
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
        <CommandGroup>
          {STEP_OPTIONS.map((opt) => (
            <CommandItem
              key={opt}
              value={opt}
              onSelect={() => onConfirm(opt)}
              className={cn(opt === value && "font-semibold text-primary")}
            >
              {opt}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function VariantTokenEditor({
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
// EditableToken
// ---------------------------------------------------------------------------

function EditableToken({
  value,
  category,
  onChange,
}: {
  value: string;
  category: TokenCategory;
  onChange: (newValue: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const isStep = category === "step";

  const handleConfirm = useCallback(
    (newValue: string) => {
      onChange(newValue);
      setOpen(false);
    },
    [onChange],
  );

  const handleCancel = useCallback(() => setOpen(false), []);

  const editor = isStep ? (
    <StepTokenEditor
      value={value}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : CATEGORY_TO_ENTITY_TYPES[category] ? (
    <TypeaheadTokenEditor
      entityTypes={CATEGORY_TO_ENTITY_TYPES[category]!}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : (
    <VariantTokenEditor
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
            "cursor-pointer select-none px-2.5 py-1 text-[12px] font-semibold border-transparent",
            "active:scale-[0.97] transition-all",
            isStep
              ? "bg-transparent text-foreground/60 border-border hover:bg-accent/50"
              : "bg-primary/10 text-primary hover:bg-primary/20",
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
          {isStep ? (
            <ChevronDownIcon className="size-2.5 opacity-40" />
          ) : (
            <PencilIcon className="size-2.5 opacity-50" />
          )}
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

// ---------------------------------------------------------------------------
// Arrow connector
// ---------------------------------------------------------------------------

function ArrowConnector() {
  return (
    <div className="flex items-center justify-center w-5 shrink-0">
      <ArrowRightIcon className="size-3 text-muted-foreground/30" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortableSteps — drag-and-drop reorderable step tokens
// ---------------------------------------------------------------------------

function SortableSteps({
  stepOrder,
  stepValues,
  onReorder,
  onStepChange,
}: {
  stepOrder: string[];
  stepValues: Record<string, string>;
  onReorder: (from: number, to: number) => void;
  onStepChange: (key: string, value: string) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragRef = useRef({ from: -1, to: -1 });

  const canDrag = stepOrder.length > 1;

  return (
    <>
      {stepOrder.map((key, i) => (
        <Fragment key={key}>
          {i > 0 && <ArrowConnector />}
          <span
            draggable={canDrag}
            onDragStart={(e) => {
              dragRef.current.from = i;
              setDragIdx(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (!canDrag) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              dragRef.current.to = i;
              setOverIdx(i);
            }}
            onDragEnd={() => {
              const { from, to } = dragRef.current;
              if (from >= 0 && to >= 0 && from !== to) {
                onReorder(from, to);
              }
              dragRef.current = { from: -1, to: -1 };
              setDragIdx(null);
              setOverIdx(null);
            }}
            className={cn(
              "inline-flex rounded-full transition-all duration-150",
              canDrag && "cursor-grab active:cursor-grabbing",
              dragIdx === i && "opacity-30 scale-95",
              overIdx === i &&
                dragIdx !== null &&
                dragIdx !== i &&
                "ring-2 ring-primary/25 ring-offset-1",
            )}
          >
            <EditableToken
              value={stepValues[key] ?? ""}
              category="step"
              onChange={(v) => onStepChange(key, v)}
            />
          </span>
        </Fragment>
      ))}
    </>
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
  const [tokenValues, setTokenValues] = useState<Record<string, string>>(() =>
    Object.fromEntries([
      ...def.seeds.map((t) => [t.key, t.defaultValue]),
      ...def.steps.map((t) => [t.key, t.defaultValue]),
    ]),
  );

  const [stepOrder, setStepOrder] = useState<string[]>(() =>
    def.steps.map((t) => t.key),
  );

  const seedMap = useMemo(
    () => new Map(def.seeds.map((t) => [t.key, t])),
    [def.seeds],
  );

  const allValues = Object.values(tokenValues);
  const hasEmpty = allValues.some((v) => !v.trim());

  const handleTokenChange = useCallback((key: string, value: string) => {
    setTokenValues((prev) => ({ ...prev, [key]: value }));
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
    if (hasEmpty) return;
    const orderedStepValues = stepOrder.map((k) => tokenValues[k]);
    onRun(def.assemble(tokenValues, orderedStepValues));
  }, [hasEmpty, stepOrder, tokenValues, onRun, def]);

  return (
    <div
      className={cn(
        "group/card rounded-xl border border-border/50 bg-card px-3 py-3 text-left",
        "transition-all duration-200",
        "hover:border-primary/25 hover:shadow-[0_2px_24px_rgba(124,58,237,0.06)]",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-none">
            {def.label}
          </h3>
          <p className="text-[11px] text-muted-foreground/50 mt-1 leading-tight">
            {def.description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={hasEmpty}
          onClick={handleRun}
          className={cn(
            "h-6 gap-1 px-2 text-[11px] font-medium shrink-0 -mt-0.5",
            "text-muted-foreground/0 transition-all duration-150",
            "group-hover/card:text-primary hover:!bg-primary/10",
          )}
        >
          Run
          <ArrowRightIcon className="size-3" />
        </Button>
      </div>

      {/* Pipeline: seed → step → step */}
      <div className="flex flex-wrap items-center gap-y-1.5">
        {/* Seed tokens */}
        {def.seedTemplate.map((part, i) => {
          if (typeof part === "string") {
            return (
              <span
                key={i}
                className="whitespace-pre-wrap text-[13px] text-muted-foreground"
              >
                {part}
              </span>
            );
          }
          const tokenDef = seedMap.get(part.tokenKey);
          if (!tokenDef) return null;
          return (
            <EditableToken
              key={part.tokenKey}
              value={tokenValues[part.tokenKey] ?? ""}
              category={tokenDef.category}
              onChange={(v) => handleTokenChange(part.tokenKey, v)}
            />
          );
        })}

        {/* Arrow to steps */}
        {def.steps.length > 0 && <ArrowConnector />}

        {/* Sortable steps */}
        {def.steps.length > 0 && (
          <SortableSteps
            stepOrder={stepOrder}
            stepValues={tokenValues}
            onReorder={handleReorder}
            onStepChange={handleTokenChange}
          />
        )}

        {/* Optional hint */}
        {def.hint && (
          <span className="text-[11px] text-muted-foreground/40 ml-1">
            ({def.hint})
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState (exported)
// ---------------------------------------------------------------------------

export function EmptyState({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <ConversationEmptyState className="items-start sm:items-center justify-start sm:justify-center overflow-y-auto p-4 sm:p-8">
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
        {/* Heading with subtle glow */}
        <div className="relative flex flex-col items-center gap-2 mb-8">
          <div className="absolute -top-10 w-56 h-28 bg-primary/[0.04] rounded-full blur-3xl pointer-events-none" />
          <h2 className="relative text-foreground text-lg sm:text-xl font-bold text-center leading-snug tracking-tight">
            Interpret any variant, gene, or disease — in seconds.
          </h2>
          <p className="relative text-[13px] text-muted-foreground/70 text-center">
            Swap entities, reorder steps, then run.
          </p>
        </div>

        {/* 2x2 pipeline cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
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
                "hover:border-primary/20 hover:text-foreground hover:bg-primary/[0.03]",
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
