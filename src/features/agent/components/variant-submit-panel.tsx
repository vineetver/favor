"use client";

import { cn } from "@infra/utils";
import { Button } from "@shared/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@shared/components/ui/tabs";
import { Textarea } from "@shared/components/ui/textarea";
import {
  AlertCircleIcon,
  ClipboardPasteIcon,
  FileIcon,
  Loader2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { API_BASE } from "@/config/api";

// ---------------------------------------------------------------------------
// Variant parser
// ---------------------------------------------------------------------------

/** Matches rsIDs (rs7412) and VCF-style identifiers (1-12345-A-G or 1:12345:A:G) */
const VARIANT_RE = /^(rs\d+|\d{1,2}[-:]\d+[-:][A-Za-z]+[-:][A-Za-z]+)$/;
const MAX_VARIANTS = 5000;

function parseVariantLines(text: string): string[] {
  if (!text.trim()) return [];

  const seen = new Set<string>();
  const variants: string[] = [];

  for (const raw of text.split(/[\r\n]+/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Whole line is a variant
    if (VARIANT_RE.test(line)) {
      const key = line.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        variants.push(line);
      }
      continue;
    }

    // Try CSV/TSV fields — take first match per line
    for (const field of line.split(/[,\t;|]/)) {
      const clean = field.trim().replace(/^["']|["']$/g, "");
      if (VARIANT_RE.test(clean)) {
        const key = clean.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          variants.push(clean);
        }
        break;
      }
    }
  }

  return variants;
}

// ---------------------------------------------------------------------------
// Async cohort creation (POST → poll → materialize)
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 1_500;
const POLL_TIMEOUT_MS = 120_000;

async function createCohortAsync(
  variants: string[],
  label: string,
): Promise<{ cohort_id: string; vid_count: number }> {
  // Step 1: POST /cohorts → { id, status, created_at }
  const submitRes = await fetch(`${API_BASE}/cohorts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      references: variants,
      label,
      idempotency_key: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    }),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "Unknown error");
    throw new Error(`Cohort creation failed (${submitRes.status}): ${text}`);
  }

  const submitData = (await submitRes.json()) as {
    id: string;
    status: string;
    created_at: string;
  };

  const cohortId = submitData.id;
  if (!cohortId) {
    throw new Error(
      `POST /cohorts response missing id: ${JSON.stringify(submitData).slice(0, 200)}`,
    );
  }

  // Step 2: Poll cohort status until terminal
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let terminalStatus = submitData.status;
  let foundCount = 0;

  while (Date.now() < deadline) {
    const statusRes = await fetch(`${API_BASE}/cohorts/${cohortId}/status`, {
      credentials: "include",
    });
    if (!statusRes.ok) {
      throw new Error(`Cohort status check failed (${statusRes.status})`);
    }

    const statusData = (await statusRes.json()) as {
      id: string;
      status: string;
      progress: { found?: number } | null;
      is_terminal: boolean;
      poll_hint_ms: number | null;
    };

    if (statusData.is_terminal) {
      terminalStatus = statusData.status;
      foundCount = statusData.progress?.found ?? 0;
      break;
    }
    await new Promise((r) =>
      setTimeout(r, statusData.poll_hint_ms ?? POLL_INTERVAL_MS),
    );
  }

  if (terminalStatus === "failed") {
    throw new Error(
      "Cohort processing failed. Check the batch annotation page for details.",
    );
  }
  if (terminalStatus !== "ready") {
    throw new Error(
      `Cohort did not complete in time (status: ${terminalStatus}).`,
    );
  }

  return { cohort_id: cohortId, vid_count: foundCount };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VariantSubmitPanelProps {
  onCohortCreated: () => void;
  onAnalyzeCohort: (cohortId: string) => void;
}

export function VariantSubmitPanel({
  onCohortCreated,
  onAnalyzeCohort,
}: VariantSubmitPanelProps) {
  // ---- Paste state ----
  const [pasteText, setPasteText] = useState("");
  const [isCreatingPaste, setIsCreatingPaste] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const pasteVariants = useMemo(
    () => parseVariantLines(pasteText),
    [pasteText],
  );

  const handleCreateFromPaste = useCallback(async () => {
    if (pasteVariants.length === 0) return;
    setIsCreatingPaste(true);
    setPasteError(null);

    try {
      const label = `Pasted cohort (${pasteVariants.length} variants)`;
      const capped = pasteVariants.slice(0, MAX_VARIANTS);
      const result = await createCohortAsync(capped, label);
      onCohortCreated();
      onAnalyzeCohort(result.cohort_id);
      setPasteText("");
    } catch (err) {
      setPasteError(
        err instanceof Error ? err.message : "Failed to create cohort",
      );
    } finally {
      setIsCreatingPaste(false);
    }
  }, [pasteVariants, onCohortCreated, onAnalyzeCohort]);

  // ---- Upload state ----
  const [file, setFile] = useState<File | null>(null);
  const [fileVariants, setFileVariants] = useState<string[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isCreatingUpload, setIsCreatingUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadError(null);
    setIsReadingFile(true);

    try {
      const text = await selectedFile.text();
      const variants = parseVariantLines(text);
      setFileVariants(variants);
    } catch {
      setUploadError("Failed to read file");
      setFileVariants([]);
    } finally {
      setIsReadingFile(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect],
  );

  const handleCreateFromUpload = useCallback(async () => {
    if (fileVariants.length === 0) return;
    setIsCreatingUpload(true);
    setUploadError(null);

    try {
      const label = file
        ? `${file.name} (${fileVariants.length} variants)`
        : `Upload (${fileVariants.length} variants)`;
      const capped = fileVariants.slice(0, MAX_VARIANTS);
      const result = await createCohortAsync(capped, label);
      onCohortCreated();
      onAnalyzeCohort(result.cohort_id);
      setFile(null);
      setFileVariants([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to create cohort",
      );
    } finally {
      setIsCreatingUpload(false);
    }
  }, [fileVariants, file, onCohortCreated, onAnalyzeCohort]);

  const clearFile = useCallback(() => {
    setFile(null);
    setFileVariants([]);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <Tabs defaultValue="paste" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="paste" className="flex-1 gap-1.5">
          <ClipboardPasteIcon className="size-3.5" />
          Paste
        </TabsTrigger>
        <TabsTrigger value="upload" className="flex-1 gap-1.5">
          <UploadIcon className="size-3.5" />
          Upload
        </TabsTrigger>
      </TabsList>

      {/* ---- Paste Tab ---- */}
      <TabsContent value="paste" className="mt-3 space-y-3">
        <Textarea
          placeholder={
            "Paste rsIDs or VCF notations, one per line...\nrs7412\nrs429358\n19-44908684-T-C"
          }
          className="min-h-[120px] resize-none text-xs font-mono"
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            setPasteError(null);
          }}
        />

        <div className="flex items-center justify-between text-xs">
          <span
            className={cn(
              "text-muted-foreground",
              pasteVariants.length > MAX_VARIANTS && "text-destructive",
            )}
          >
            {pasteVariants.length > 0
              ? `${pasteVariants.length.toLocaleString()} variant${pasteVariants.length !== 1 ? "s" : ""} detected`
              : "No variants detected"}
            {pasteVariants.length > MAX_VARIANTS &&
              ` (max ${MAX_VARIANTS.toLocaleString()})`}
          </span>
        </div>

        {pasteError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
            {pasteError}
          </div>
        )}

        <Button
          size="sm"
          className="w-full"
          disabled={
            pasteVariants.length === 0 ||
            pasteVariants.length > MAX_VARIANTS ||
            isCreatingPaste
          }
          onClick={handleCreateFromPaste}
        >
          {isCreatingPaste ? (
            <>
              <Loader2Icon className="size-3.5 animate-spin" />
              Creating cohort...
            </>
          ) : (
            "Create & Analyze"
          )}
        </Button>
      </TabsContent>

      {/* ---- Upload Tab ---- */}
      <TabsContent value="upload" className="mt-3 space-y-3">
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/40 hover:bg-accent/50"
          >
            <UploadIcon className="size-6 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Drop a file</span>{" "}
              or click to browse
            </div>
            <span className="text-[10px] text-muted-foreground">
              .csv, .tsv, .txt, .vcf
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.vcf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2.5">
              <FileIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {isReadingFile
                    ? "Reading file..."
                    : `${fileVariants.length.toLocaleString()} variants found`}
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>

            {fileVariants.length > MAX_VARIANTS && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                File has {fileVariants.length.toLocaleString()} variants. Only
                the first {MAX_VARIANTS.toLocaleString()} will be used.
              </div>
            )}

            {uploadError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                {uploadError}
              </div>
            )}

            <Button
              size="sm"
              className="w-full"
              disabled={
                fileVariants.length === 0 || isReadingFile || isCreatingUpload
              }
              onClick={handleCreateFromUpload}
            >
              {isCreatingUpload ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Creating cohort...
                </>
              ) : (
                "Create & Analyze"
              )}
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
