/**
 * FAVOR Agent Eval Harness
 *
 * End-to-end evaluation of the FAVOR agent:
 *   1. Fetches graph + cohort schemas from the backend API
 *   2. Generates schema-aware test prompts
 *   3. Sends each prompt through /api/chat (full agent loop with LLM)
 *   4. Parses the AI SDK Data Stream Protocol response
 *   5. Evaluates tool selection, params, and prompt compliance
 *   6. Outputs a structured report with actionable fix suggestions
 *
 * Usage:
 *   npx tsx scripts/eval-agent.ts             # core tests (fast)
 *   npx tsx scripts/eval-agent.ts --full      # all tests
 *   npx tsx scripts/eval-agent.ts --ids G01 G05 C01  # specific tests
 *   npx tsx scripts/eval-agent.ts --dry-run   # show test cases without running
 *
 * Env:
 *   NEXT_PUBLIC_API_URL  (default: http://localhost:8000/api/v1)
 *   APP_URL              (default: http://localhost:3000)
 *   FAVOR_API_KEY        (required — backend auth)
 *   TEST_COHORT_ID       (cohort for cohort tests — variant_list type)
 *   GWAS_COHORT_ID       (cohort for GWAS tests — gwas_sumstats type)
 */

import { writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Manual .env loader
// ---------------------------------------------------------------------------

function loadEnv() {
  try {
    const envPath = resolve(import.meta.dirname ?? __dirname, "../.env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const API_KEY = process.env.FAVOR_API_KEY || "";
const TEST_COHORT_ID = process.env.TEST_COHORT_ID || "";
const GWAS_COHORT_ID =
  process.env.GWAS_COHORT_ID || "13de3fc8-5535-432e-b6be-32bd84226e83";

const AGENT_TIMEOUT = 120_000; // 2 min per test
const args = process.argv.slice(2);
const FULL_MODE = args.includes("--full");
const DRY_RUN = args.includes("--dry-run");
const ID_FILTER = args.includes("--ids")
  ? args.slice(args.indexOf("--ids") + 1).filter((a) => !a.startsWith("--"))
  : null;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface ToolResult {
  toolCallId: string;
  result: unknown;
}

interface AgentResponse {
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  text: string;
  steps: number;
  error?: string;
  rawLineCount: number;
}

interface ExpectedBehavior {
  /** At least one Run tool call should match one of these */
  commands?: Array<{
    command: string;
    mode?: string;
    seedsContain?: string[];
    intoContains?: string[];
    target?: string;
    stepsMin?: number;
  }>;
  /** Patterns that should NOT appear */
  forbid?: {
    rawEdgeTypes?: boolean;
    separateExplores?: boolean;
    readForDomains?: boolean;
  };
  /** Patterns that MUST appear */
  require?: {
    stateFirst?: boolean;
    hasText?: boolean;
    maxToolCalls?: number;
    workflowCommand?: string;
  };
}

type Grade = "PASS" | "WARN" | "FAIL";

interface CheckResult {
  name: string;
  grade: Grade;
  detail: string;
  fix?: string;
}

interface TestCase {
  id: string;
  name: string;
  category: string;
  prompt: string;
  needsCohort?: "variant_list" | "gwas";
  expect: ExpectedBehavior;
  core?: boolean; // included in fast mode
}

interface EvalResult {
  test: TestCase;
  response: AgentResponse | null;
  checks: CheckResult[];
  elapsed: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Raw edge type names (from graph.ts EDGE_HUMAN_LABEL)
// The agent should NEVER use these in its synthesis text.
// ---------------------------------------------------------------------------

const RAW_EDGE_TYPES = [
  "VARIANT_IMPLIES_GENE",
  "GENE_ASSOCIATED_WITH_DISEASE",
  "GENE_PARTICIPATES_IN_PATHWAY",
  "GENE_ANNOTATED_WITH_GO_TERM",
  "GENE_ASSOCIATED_WITH_PHENOTYPE",
  "DRUG_ACTS_ON_GENE",
  "GENE_EXPRESSED_IN_TISSUE",
  "GENE_ASSOCIATED_WITH_SIDE_EFFECT",
  "GENE_HAS_PROTEIN_DOMAIN",
  "GENE_INTERACTS_WITH_GENE",
  "DISEASE_ASSOCIATED_WITH_PHENOTYPE",
  "DISEASE_HAS_DRUG",
  "DISEASE_HAS_PHENOTYPE",
  "DRUG_INDICATED_FOR_DISEASE",
  "DRUG_HAS_ADVERSE_EFFECT",
  "DRUG_INTERACTS_WITH_DRUG",
  "DRUG_PAIR_CAUSES_SIDE_EFFECT",
  "GENE_AFFECTS_DRUG_RESPONSE",
  "CCRE_REGULATES_GENE",
  "VARIANT_IN_CCRE",
];

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function backendApi<T = unknown>(
  path: string,
  opts?: { method?: string; body?: unknown; timeout?: number },
): Promise<{ status: number; ok: boolean; data: T; raw: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts?.timeout ?? 30_000,
  );

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts?.method ?? "GET",
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const raw = await res.text();
    let data: T;
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw as unknown as T;
    }
    return { status: res.status, ok: res.ok, data, raw };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// AI SDK Agent UI Stream parser (SSE format: "data: {JSON}")
// ---------------------------------------------------------------------------

function parseAgentStream(body: string): AgentResponse {
  const lines = body.split("\n").filter(Boolean);
  const toolCalls: ToolCall[] = [];
  const toolResults: ToolResult[] = [];
  const textChunks: string[] = [];
  const streamingInputs = new Map<
    string,
    { toolName: string; inputText: string }
  >();
  let steps = 0;
  let error: string | undefined;

  for (const line of lines) {
    // SSE format: "data: {JSON}"
    if (!line.startsWith("data: ")) continue;
    const json = line.slice(6); // strip "data: "

    let evt: Record<string, unknown>;
    try {
      evt = JSON.parse(json);
    } catch {
      continue;
    }

    const type = evt.type as string;

    switch (type) {
      case "tool-input-available": {
        // Complete tool call: { toolCallId, toolName, input }
        const input =
          typeof evt.input === "string"
            ? JSON.parse(evt.input as string)
            : (evt.input as Record<string, unknown>) ?? {};
        toolCalls.push({
          toolCallId: evt.toolCallId as string,
          toolName: evt.toolName as string,
          args: input,
        });
        break;
      }

      case "tool-input-start": {
        // Streaming start — accumulate deltas
        streamingInputs.set(evt.toolCallId as string, {
          toolName: evt.toolName as string,
          inputText: "",
        });
        break;
      }

      case "tool-input-delta": {
        const si = streamingInputs.get(evt.toolCallId as string);
        if (si) si.inputText += (evt.inputTextDelta as string) ?? "";
        break;
      }

      case "tool-output-available": {
        // Tool result: { toolCallId, output }
        toolResults.push({
          toolCallId: evt.toolCallId as string,
          result: evt.output,
        });
        break;
      }

      case "text-delta": {
        textChunks.push((evt.delta as string) ?? "");
        break;
      }

      case "finish-step": {
        steps++;
        break;
      }

      case "error": {
        error = (evt.message as string) ?? JSON.stringify(evt);
        break;
      }
      // "start", "start-step", "text-start", "text-end",
      // "reasoning-start", "reasoning-end", "finish" — skip
    }
  }

  // Merge streaming inputs → complete tool calls (fallback if tool-input-available was missing)
  for (const [id, { toolName, inputText }] of streamingInputs) {
    if (!toolCalls.some((tc) => tc.toolCallId === id) && inputText) {
      try {
        toolCalls.push({
          toolCallId: id,
          toolName,
          args: JSON.parse(inputText),
        });
      } catch {
        // partial input — skip
      }
    }
  }

  return {
    toolCalls,
    toolResults,
    text: textChunks.join(""),
    steps,
    error,
    rawLineCount: lines.length,
  };
}

// ---------------------------------------------------------------------------
// Agent invocation
// ---------------------------------------------------------------------------

async function callAgent(
  prompt: string,
  sessionId: string,
): Promise<AgentResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT);

  try {
    const res = await fetch(`${APP_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            id: `eval-msg-${Date.now()}`,
            parts: [{ type: "text", text: prompt }],
          },
        ],
        sessionId,
        synthesisModel: "fast",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        toolCalls: [],
        toolResults: [],
        text: "",
        steps: 0,
        error: `HTTP ${res.status}: ${errBody.slice(0, 500)}`,
        rawLineCount: 0,
      };
    }

    const body = await res.text();

    // Debug: dump raw SSE response to help tune the parser
    if (process.env.EVAL_DEBUG) {
      const preview = body.slice(0, 2000).replace(/\n/g, "\n    | ");
      console.log(
        `    [DEBUG] Raw response (${body.length} bytes):\n    | ${preview}`,
      );
    }

    return parseAgentStream(body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      toolCalls: [],
      toolResults: [],
      text: "",
      steps: 0,
      error: msg.includes("abort")
        ? `Timeout after ${AGENT_TIMEOUT / 1000}s`
        : msg,
      rawLineCount: 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Pre-set session state for cohort tests. */
async function setupSession(
  sessionId: string,
  cohortId: string,
): Promise<boolean> {
  const resp = await backendApi(`/agent/sessions/${sessionId}/state`, {
    method: "PATCH",
    body: { active_cohort_id: cohortId },
  });
  return resp.ok;
}

// ---------------------------------------------------------------------------
// Check functions
// ---------------------------------------------------------------------------

function checkStateFirst(resp: AgentResponse): CheckResult {
  if (resp.toolCalls.length === 0) {
    return {
      name: "State first",
      grade: "FAIL",
      detail: "No tool calls at all",
      fix: "Agent didn't call any tools — check if the prompt triggers tool use",
    };
  }
  const first = resp.toolCalls[0];
  if (first.toolName === "State") {
    return { name: "State first", grade: "PASS", detail: "State called first" };
  }
  return {
    name: "State first",
    grade: "WARN",
    detail: `First tool was ${first.toolName}, not State`,
    fix: 'Strengthen "ALWAYS call State first on each turn" in BEHAVIORAL_RULES (lib/prompts/system.ts)',
  };
}

function checkCommand(
  resp: AgentResponse,
  expected: NonNullable<ExpectedBehavior["commands"]>[number],
): CheckResult {
  const runCalls = resp.toolCalls.filter((tc) => tc.toolName === "Run");
  if (runCalls.length === 0) {
    return {
      name: `Uses ${expected.command}`,
      grade: "FAIL",
      detail: "No Run tool calls found",
      fix: "Agent didn't use Run tool — check prompt or system instructions",
    };
  }

  const matches = runCalls.filter(
    (tc) => tc.args.command === expected.command,
  );
  if (matches.length === 0) {
    const actual = runCalls.map((tc) => tc.args.command).join(", ");
    return {
      name: `Uses ${expected.command}`,
      grade: "FAIL",
      detail: `Expected command "${expected.command}" but got: ${actual}`,
      fix: `Review GRAPH MODE SELECTION or WORKFLOW command guidance in system.ts`,
    };
  }

  const match = matches[0];
  const warnings: string[] = [];

  // Check mode
  if (expected.mode && match.args.mode !== expected.mode) {
    return {
      name: `Mode: ${expected.mode}`,
      grade: "FAIL",
      detail: `Expected mode "${expected.mode}" but got "${match.args.mode ?? "neighbors (default)"}"`,
      fix: `Add/strengthen the "${expected.mode}" guidance in GRAPH MODE SELECTION (system.ts)`,
    };
  }

  // Check seeds contain expected labels
  if (expected.seedsContain) {
    const seeds = (match.args.seeds ?? []) as Array<Record<string, unknown>>;
    const seed = match.args.seed as Record<string, unknown> | undefined;
    const allLabels = [
      ...seeds.map((s) => String(s.label ?? "").toLowerCase()),
      seed ? String(seed.label ?? "").toLowerCase() : "",
    ].filter(Boolean);

    for (const label of expected.seedsContain) {
      if (!allLabels.some((l) => l.includes(label.toLowerCase()))) {
        warnings.push(`Seed "${label}" not found in: [${allLabels.join(", ")}]`);
      }
    }
  }

  // Check into contains expected intents
  if (expected.intoContains) {
    const into = (match.args.into ?? []) as string[];
    for (const intent of expected.intoContains) {
      if (!into.includes(intent)) {
        // Also check steps for traverse commands
        const steps = (match.args.steps ?? []) as Array<
          Record<string, unknown>
        >;
        const stepsHaveIntent = steps.some(
          (s) => s.into === intent || s.enrich === intent,
        );
        if (!stepsHaveIntent) {
          warnings.push(
            `Intent "${intent}" not found in into:[${into.join(",")}]`,
          );
        }
      }
    }
  }

  // Check target
  if (expected.target && match.args.target !== expected.target) {
    warnings.push(
      `Expected target="${expected.target}" but got "${match.args.target}"`,
    );
  }

  // Check minimum steps (for traverse)
  if (expected.stepsMin) {
    const steps = (match.args.steps ?? []) as unknown[];
    if (steps.length < expected.stepsMin) {
      warnings.push(
        `Expected ${expected.stepsMin}+ traverse steps but got ${steps.length}`,
      );
    }
  }

  if (warnings.length > 0) {
    return {
      name: `Command: ${expected.command}${expected.mode ? ` (${expected.mode})` : ""}`,
      grade: "WARN",
      detail: warnings.join("; "),
      fix: "Check intent aliases and mode selection logic",
    };
  }

  return {
    name: `Command: ${expected.command}${expected.mode ? ` (${expected.mode})` : ""}`,
    grade: "PASS",
    detail: `Correct: ${expected.command}${expected.mode ? ` mode:${expected.mode}` : ""}`,
  };
}

function checkNoRawEdgeTypes(resp: AgentResponse): CheckResult {
  const found: string[] = [];
  for (const raw of RAW_EDGE_TYPES) {
    if (resp.text.includes(raw)) {
      found.push(raw);
    }
  }
  if (found.length === 0) {
    return {
      name: "Human-readable edges",
      grade: "PASS",
      detail: "No raw edge type names in synthesis",
    };
  }
  return {
    name: "Human-readable edges",
    grade: "WARN",
    detail: `Raw edge types in synthesis: ${found.join(", ")}`,
    fix: "Strengthen GRAPH RESULT PRESENTATION edge label table (lib/prompts/system.ts)",
  };
}

function checkNoSeparateExplores(resp: AgentResponse): CheckResult {
  const exploreCount = resp.toolCalls.filter(
    (tc) =>
      tc.toolName === "Run" &&
      tc.args.command === "explore" &&
      (tc.args.mode === "neighbors" || !tc.args.mode),
  ).length;
  if (exploreCount >= 2) {
    return {
      name: "No separate explores",
      grade: "FAIL",
      detail: `Used ${exploreCount} separate explore:neighbors calls — should use explore:compare`,
      fix: 'Strengthen CRITICAL rule: "For overlap/shared, use explore mode:compare, NOT two separate explores" (system.ts)',
    };
  }
  return {
    name: "No separate explores",
    grade: "PASS",
    detail: "Correctly avoided separate explores",
  };
}

function checkNotReadForDomains(resp: AgentResponse): CheckResult {
  const readCalls = resp.toolCalls.filter((tc) => tc.toolName === "Read");
  const usedReadForEntity = readCalls.some((tc) => {
    const path = String(tc.args.path ?? "");
    return path.startsWith("entity/");
  });
  if (usedReadForEntity) {
    return {
      name: "Domains via explore",
      grade: "FAIL",
      detail: "Used Read for entity data — should use Run explore into:[protein_domains]",
      fix: 'Strengthen CRITICAL rule: "For protein domains, ALWAYS use Run explore, NEVER Read" (system.ts)',
    };
  }
  return {
    name: "Domains via explore",
    grade: "PASS",
    detail: "Correctly used explore (not Read) for domains",
  };
}

function checkWorkflowCommand(
  resp: AgentResponse,
  expectedWorkflow: string,
): CheckResult {
  const runCalls = resp.toolCalls.filter((tc) => tc.toolName === "Run");
  const usesWorkflow = runCalls.some(
    (tc) => tc.args.command === expectedWorkflow,
  );
  if (usesWorkflow) {
    return {
      name: `Workflow: ${expectedWorkflow}`,
      grade: "PASS",
      detail: `Correctly used ${expectedWorkflow} workflow`,
    };
  }
  const actual = runCalls.map((tc) => tc.args.command).join(", ");
  return {
    name: `Workflow: ${expectedWorkflow}`,
    grade: "WARN",
    detail: `Expected workflow "${expectedWorkflow}" but used: ${actual}`,
    fix: `Strengthen "Prefer WORKFLOW commands" in BEHAVIORAL_RULES (system.ts)`,
  };
}

function checkDefaultLimit(resp: AgentResponse): CheckResult {
  const runCalls = resp.toolCalls.filter(
    (tc) =>
      tc.toolName === "Run" &&
      ["rows", "prioritize", "top_hits"].includes(
        String(tc.args.command),
      ),
  );
  for (const tc of runCalls) {
    const limit = tc.args.limit as number | undefined;
    if (limit && limit > 25) {
      return {
        name: "Default limit",
        grade: "WARN",
        detail: `Command "${tc.args.command}" used limit=${limit} (expected <=25 unless user asked)`,
        fix: 'Strengthen DEFAULT LIMIT rule in BEHAVIORAL_RULES (system.ts)',
      };
    }
  }
  return {
    name: "Default limit",
    grade: "PASS",
    detail: "Limits within expected range",
  };
}

function checkHasText(resp: AgentResponse): CheckResult {
  if (resp.text.trim().length > 20) {
    return {
      name: "Has synthesis",
      grade: "PASS",
      detail: `Synthesis: ${resp.text.length} chars`,
    };
  }
  return {
    name: "Has synthesis",
    grade: "WARN",
    detail: `Synthesis too short (${resp.text.length} chars) — may indicate stuck agent`,
    fix: "Check prepareStep synthesis forcing logic (lib/prepare-step.ts)",
  };
}

function checkMaxToolCalls(
  resp: AgentResponse,
  max: number,
): CheckResult {
  if (resp.toolCalls.length <= max) {
    return {
      name: "Efficiency",
      grade: "PASS",
      detail: `${resp.toolCalls.length} tool calls (max ${max})`,
    };
  }
  return {
    name: "Efficiency",
    grade: "WARN",
    detail: `${resp.toolCalls.length} tool calls exceeds expected max of ${max}`,
    fix: "Agent may be looping — check stuck detection in prepare-step.ts",
  };
}

// ---------------------------------------------------------------------------
// Evaluate a single test
// ---------------------------------------------------------------------------

function evaluate(test: TestCase, resp: AgentResponse): CheckResult[] {
  const results: CheckResult[] = [];
  const { expect } = test;

  // Universal checks
  if (expect.require?.stateFirst !== false) {
    results.push(checkStateFirst(resp));
  }
  results.push(checkHasText(resp));
  results.push(checkDefaultLimit(resp));
  results.push(checkMaxToolCalls(resp, expect.require?.maxToolCalls ?? 15));

  // Command-specific checks
  if (expect.commands) {
    for (const cmd of expect.commands) {
      results.push(checkCommand(resp, cmd));
    }
  }

  // Workflow preference
  if (expect.require?.workflowCommand) {
    results.push(
      checkWorkflowCommand(resp, expect.require.workflowCommand),
    );
  }

  // Forbidden patterns
  if (expect.forbid?.rawEdgeTypes) {
    results.push(checkNoRawEdgeTypes(resp));
  }
  if (expect.forbid?.separateExplores) {
    results.push(checkNoSeparateExplores(resp));
  }
  if (expect.forbid?.readForDomains) {
    results.push(checkNotReadForDomains(resp));
  }

  return results;
}

// ---------------------------------------------------------------------------
// Test suite definition
// ---------------------------------------------------------------------------

function buildTestSuite(): TestCase[] {
  const tests: TestCase[] = [];

  // ── Graph tests ──────────────────────────────────────────────

  tests.push({
    id: "G01",
    name: "Neighbors: gene targets of a drug",
    category: "graph/neighbors",
    prompt: "What genes does Metformin target?",
    core: true,
    expect: {
      commands: [
        {
          command: "explore",
          seedsContain: ["metformin"],
          intoContains: ["genes"],
        },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G02",
    name: "Compare: shared neighbors",
    category: "graph/compare",
    prompt: "What do BRCA1 and TP53 have in common?",
    core: true,
    expect: {
      commands: [
        {
          command: "explore",
          mode: "compare",
          seedsContain: ["brca1", "tp53"],
        },
      ],
      forbid: { separateExplores: true, rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G03",
    name: "Enrich: pathway enrichment",
    category: "graph/enrich",
    prompt:
      "What pathways are enriched for BRCA1, TP53, and ATM?",
    expect: {
      commands: [
        {
          command: "explore",
          mode: "enrich",
          seedsContain: ["brca1", "tp53", "atm"],
          target: "pathways",
        },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G04",
    name: "Context: entity profile",
    category: "graph/context",
    prompt: "Tell me about BRCA1",
    expect: {
      commands: [
        {
          command: "explore",
          mode: "context",
          seedsContain: ["brca1"],
        },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G05",
    name: "Traverse chain: multi-hop",
    category: "graph/traverse",
    prompt:
      "Starting from TP53, what diseases is it linked to and what drugs target those diseases?",
    core: true,
    expect: {
      commands: [
        {
          command: "traverse",
          seedsContain: ["tp53"],
          intoContains: ["diseases", "drugs"],
          stepsMin: 2,
        },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G06",
    name: "Drug indications: approved drugs",
    category: "graph/drug_indications",
    prompt: "What drugs are approved for type 2 diabetes?",
    expect: {
      commands: [
        {
          command: "explore",
          seedsContain: ["type 2 diabetes"],
          intoContains: ["drug_indications"],
        },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G07",
    name: "Protein domains via explore (not Read)",
    category: "graph/protein_domains",
    prompt: "Show the protein domains of BRCA1",
    expect: {
      commands: [
        {
          command: "explore",
          seedsContain: ["brca1"],
          intoContains: ["protein_domains"],
        },
      ],
      forbid: { readForDomains: true, rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G08",
    name: "Adverse effects of a drug",
    category: "graph/adverse_effects",
    prompt: "What are the side effects of Metformin?",
    expect: {
      // side_effects and adverse_effects are aliases — either is correct
      commands: [
        {
          command: "explore",
          seedsContain: ["metformin"],
          intoContains: ["side_effects"],
        },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G09",
    name: "Overlap uses compare, not two explores",
    category: "graph/edge_case",
    prompt: "What is the overlap between TP53 and EGFR targets?",
    expect: {
      commands: [
        {
          command: "explore",
          mode: "compare",
          seedsContain: ["tp53", "egfr"],
        },
      ],
      forbid: { separateExplores: true },
    },
  });

  tests.push({
    id: "G10",
    name: "How connected: paths + compare",
    category: "graph/edge_case",
    prompt: "How are TP53 and Alzheimer disease connected?",
    expect: {
      commands: [
        { command: "traverse", mode: "paths" },
        { command: "explore", mode: "compare" },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G11",
    name: "Traverse: drug pipeline (disease → genes → drugs → side effects)",
    category: "graph/traverse",
    prompt:
      "For breast cancer, show the drug target pipeline: genes, then drugs, then side effects",
    expect: {
      commands: [
        {
          command: "traverse",
          seedsContain: ["breast cancer"],
          intoContains: ["genes", "drugs"],
          stepsMin: 3,
        },
      ],
      forbid: { rawEdgeTypes: true },
    },
  });

  tests.push({
    id: "G12",
    name: "Similar entities",
    category: "graph/similar",
    prompt: "Find genes similar to TP53",
    expect: {
      commands: [
        {
          command: "explore",
          mode: "similar",
          seedsContain: ["tp53"],
        },
      ],
    },
  });

  // ── Cohort tests ─────────────────────────────────────────────

  tests.push({
    id: "C01",
    name: "Top hits (workflow)",
    category: "cohort/top_hits",
    prompt: "Show me the top variants ranked by CADD score",
    needsCohort: "variant_list",
    core: true,
    expect: {
      commands: [{ command: "top_hits" }],
      require: { workflowCommand: "top_hits" },
    },
  });

  tests.push({
    id: "C02",
    name: "Distribution (groupby)",
    category: "cohort/groupby",
    prompt: "What is the distribution of variant consequences in my cohort?",
    needsCohort: "variant_list",
    expect: {
      commands: [{ command: "groupby" }],
    },
  });

  tests.push({
    id: "C03",
    name: "QC summary (workflow)",
    category: "cohort/qc",
    prompt: "Run a quality check on my cohort",
    needsCohort: "variant_list",
    core: true,
    expect: {
      commands: [{ command: "qc_summary" }],
      require: { workflowCommand: "qc_summary" },
    },
  });

  tests.push({
    id: "C04",
    name: "GWAS minimal (workflow)",
    category: "cohort/gwas",
    prompt: "Summarize the GWAS results with multiple testing correction",
    needsCohort: "gwas",
    expect: {
      commands: [{ command: "gwas_minimal" }],
      require: { workflowCommand: "gwas_minimal" },
    },
  });

  tests.push({
    id: "C05",
    name: "Derive sub-cohort",
    category: "cohort/derive",
    prompt: "Create a sub-cohort of only chromosome 1 variants",
    needsCohort: "variant_list",
    expect: {
      commands: [{ command: "derive" }],
    },
  });

  tests.push({
    id: "C06",
    name: "Variant profile (workflow)",
    category: "cohort/profile",
    prompt: "Give me a detailed profile of rs429358 and rs7412",
    needsCohort: "variant_list",
    expect: {
      commands: [{ command: "variant_profile" }],
    },
  });

  return tests;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runEval(): Promise<EvalResult[]> {
  const allTests = buildTestSuite();

  // Filter tests
  let tests: TestCase[];
  if (ID_FILTER) {
    tests = allTests.filter((t) => ID_FILTER.includes(t.id));
    if (tests.length === 0) {
      console.error(
        `No tests match IDs: ${ID_FILTER.join(", ")}. Available: ${allTests.map((t) => t.id).join(", ")}`,
      );
      process.exit(1);
    }
  } else if (FULL_MODE) {
    tests = allTests;
  } else {
    // Core tests only
    tests = allTests.filter((t) => t.core);
  }

  // Skip cohort tests if no cohort IDs
  const skippedIds: string[] = [];
  tests = tests.filter((t) => {
    if (t.needsCohort === "variant_list" && !TEST_COHORT_ID) {
      skippedIds.push(t.id);
      return false;
    }
    if (t.needsCohort === "gwas" && !GWAS_COHORT_ID) {
      skippedIds.push(t.id);
      return false;
    }
    return true;
  });
  if (skippedIds.length > 0) {
    console.log(
      `  Skipping ${skippedIds.length} test(s) (no cohort ID): ${skippedIds.join(", ")}`,
    );
    console.log(
      `  Set TEST_COHORT_ID and/or GWAS_COHORT_ID to enable cohort tests\n`,
    );
  }

  console.log(`  Running ${tests.length} test(s)...\n`);

  if (DRY_RUN) {
    console.log("─── DRY RUN — test cases only ───\n");
    for (const t of tests) {
      console.log(`  [${t.id}] ${t.name}`);
      console.log(`    Category: ${t.category}`);
      console.log(`    Prompt:   "${t.prompt}"`);
      console.log(`    Cohort:   ${t.needsCohort ?? "none"}`);
      console.log(
        `    Expects:  ${JSON.stringify(t.expect.commands?.map((c) => c.command) ?? [])}`,
      );
      console.log();
    }
    return [];
  }

  const results: EvalResult[] = [];

  for (const test of tests) {
    const sessionId = randomUUID();
    console.log(
      `  [${test.id}] "${test.prompt.slice(0, 60)}${test.prompt.length > 60 ? "..." : ""}"`,
    );

    // Setup session for cohort tests
    if (test.needsCohort) {
      const cohortId =
        test.needsCohort === "gwas" ? GWAS_COHORT_ID : TEST_COHORT_ID;
      const ok = await setupSession(sessionId, cohortId);
      if (!ok) {
        console.log(
          `    !! Could not set up session (PATCH failed). Skipping.`,
        );
        results.push({
          test,
          response: null,
          checks: [
            {
              name: "Session setup",
              grade: "FAIL",
              detail: "PATCH /agent/sessions failed",
              fix: "Check backend auth — ensure FAVOR_API_KEY is set",
            },
          ],
          elapsed: 0,
          error: "Session setup failed",
        });
        continue;
      }
    }

    const start = Date.now();
    const resp = await callAgent(test.prompt, sessionId);
    const elapsed = (Date.now() - start) / 1000;

    if (resp.error) {
      console.log(`    !! Error: ${resp.error.slice(0, 100)}`);
      results.push({
        test,
        response: resp,
        checks: [
          {
            name: "Agent response",
            grade: "FAIL",
            detail: resp.error,
            fix: resp.error.includes("Timeout")
              ? "Agent took too long — check for loops or slow API calls"
              : resp.error.includes("ECONNREFUSED")
                ? `Next.js app not running? Start with: cd ${process.cwd()} && npm run dev`
                : "Check agent error logs",
          },
        ],
        elapsed,
        error: resp.error,
      });
      continue;
    }

    // Log tool call summary
    const toolSummary = resp.toolCalls
      .map((tc) => {
        if (tc.toolName === "Run") return `Run:${tc.args.command}`;
        return tc.toolName;
      })
      .join(" → ");
    console.log(
      `    Steps: ${resp.steps} | Tools: ${toolSummary || "(none)"} | Text: ${resp.text.length}ch (${elapsed.toFixed(1)}s)`,
    );

    // Evaluate
    const checks = evaluate(test, resp);
    results.push({ test, response: resp, checks, elapsed });

    // Print check results inline
    for (const c of checks) {
      const icon =
        c.grade === "PASS" ? "  +" : c.grade === "WARN" ? "  ~" : "  !";
      const suffix = c.grade !== "PASS" ? ` — ${c.detail}` : "";
      console.log(`    ${icon} ${c.name}${suffix}`);
    }
    console.log();
  }

  return results;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printReport(results: EvalResult[]) {
  if (results.length === 0) return;

  console.log(`\n${"=".repeat(74)}`);
  console.log("  SCORE CARD");
  console.log("=".repeat(74));
  console.log(
    `${"Test".padEnd(6)} | ${"Name".padEnd(40)} | Pass | Warn | Fail | Time`,
  );
  console.log("-".repeat(74));

  let totalPass = 0;
  let totalWarn = 0;
  let totalFail = 0;

  for (const r of results) {
    const pass = r.checks.filter((c) => c.grade === "PASS").length;
    const warn = r.checks.filter((c) => c.grade === "WARN").length;
    const fail = r.checks.filter((c) => c.grade === "FAIL").length;
    totalPass += pass;
    totalWarn += warn;
    totalFail += fail;

    const timeStr = `${r.elapsed.toFixed(1)}s`;
    console.log(
      `${r.test.id.padEnd(6)} | ${r.test.name.slice(0, 40).padEnd(40)} | ${String(pass).padStart(4)} | ${String(warn).padStart(4)} | ${String(fail).padStart(4)} | ${timeStr.padStart(5)}`,
    );
  }

  console.log("-".repeat(74));
  const totalChecks = totalPass + totalWarn + totalFail;
  console.log(
    `${"Total".padEnd(6)} | ${"".padEnd(40)} | ${String(totalPass).padStart(4)} | ${String(totalWarn).padStart(4)} | ${String(totalFail).padStart(4)} |`,
  );
  console.log(
    `\n  ${totalPass}/${totalChecks} PASS, ${totalWarn} WARN, ${totalFail} FAIL`,
  );

  // Aggregate fix suggestions
  const fixes = new Map<string, { count: number; tests: string[] }>();
  for (const r of results) {
    for (const c of r.checks) {
      if (c.fix && c.grade !== "PASS") {
        const entry = fixes.get(c.fix) ?? { count: 0, tests: [] };
        entry.count++;
        entry.tests.push(r.test.id);
        fixes.set(c.fix, entry);
      }
    }
  }

  if (fixes.size > 0) {
    console.log(`\n${"=".repeat(74)}`);
    console.log("  SUGGESTED FIXES (by frequency)");
    console.log("=".repeat(74));

    const sorted = [...fixes.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    );
    for (const [fix, { count, tests }] of sorted) {
      console.log(`\n  [${count}x] ${fix}`);
      console.log(`       Affected tests: ${tests.join(", ")}`);
    }
  }

  // Detailed output for all tests (not just failures)
  const testsToDetail = results.filter(
    (r) => r.response && r.response.toolCalls.length > 0,
  );
  if (testsToDetail.length > 0) {
    console.log(`\n${"=".repeat(74)}`);
    console.log("  DETAILED AUDIT");
    console.log("=".repeat(74));

    for (const r of testsToDetail) {
      const hasFails = r.checks.some((c) => c.grade === "FAIL");
      const hasWarns = r.checks.some((c) => c.grade === "WARN");
      const tag = hasFails ? "FAIL" : hasWarns ? "WARN" : "PASS";

      console.log(`\n  [${"=".repeat(70)}]`);
      console.log(`  [${r.test.id}] ${r.test.name}  [${tag}]`);
      console.log(`  Prompt: "${r.test.prompt}"`);

      if (r.error) {
        console.log(`  Error: ${r.error}`);
      }

      if (r.response) {
        // Tool call details
        console.log(`\n  Tool Calls (${r.response.toolCalls.length}):`);
        for (let i = 0; i < r.response.toolCalls.length; i++) {
          const tc = r.response.toolCalls[i];
          const tr = r.response.toolResults[i];

          if (tc.toolName === "State") {
            console.log(`    ${i + 1}. State → (workspace snapshot)`);
            continue;
          }

          // Show Run tool call args
          const argStr = JSON.stringify(tc.args, null, 2)
            .split("\n")
            .map((l, j) => (j === 0 ? l : `       ${l}`))
            .join("\n");
          console.log(`    ${i + 1}. ${tc.toolName}(${argStr})`);

          // Show tool result summary
          if (tr) {
            const output = tr.result as Record<string, unknown> | undefined;
            if (output?.error) {
              console.log(
                `       Result: ERROR — ${output.message ?? output.detail ?? "unknown"}`,
              );
            } else if (output?.text_summary) {
              console.log(
                `       Result: ${String(output.text_summary).slice(0, 200)}`,
              );
            } else if (output?.status) {
              console.log(`       Result: status=${output.status}`);
            }
          }
        }

        // Show synthesis text (truncated)
        if (r.response.text) {
          console.log(`\n  Agent Synthesis (${r.response.text.length} chars):`);
          const lines = r.response.text.split("\n").slice(0, 20);
          for (const line of lines) {
            console.log(`    | ${line.slice(0, 120)}`);
          }
          if (r.response.text.split("\n").length > 20) {
            console.log(`    | ... (truncated)`);
          }
        }
      }

      // Show check results
      const issues = r.checks.filter((c) => c.grade !== "PASS");
      if (issues.length > 0) {
        console.log(`\n  Issues:`);
        for (const c of issues) {
          const icon = c.grade === "FAIL" ? "FAIL" : "WARN";
          console.log(`    [${icon}] ${c.name}: ${c.detail}`);
          if (c.fix) console.log(`           Fix: ${c.fix}`);
        }
      }
    }
  }

  // Save JSON results
  const jsonPath = "scripts/eval-agent-results.json";
  const jsonResults = results.map((r) => ({
    id: r.test.id,
    name: r.test.name,
    category: r.test.category,
    prompt: r.test.prompt,
    elapsed: r.elapsed,
    error: r.error,
    toolCalls: r.response?.toolCalls.map((tc) => ({
      tool: tc.toolName,
      args: tc.args,
    })),
    toolResults: r.response?.toolResults.map((tr) => {
      const o = tr.result as Record<string, unknown> | undefined;
      return {
        toolCallId: tr.toolCallId,
        status: o?.status,
        text_summary: o?.text_summary
          ? String(o.text_summary).slice(0, 500)
          : undefined,
        error: o?.error ? String(o.message ?? o.detail ?? o.error) : undefined,
      };
    }),
    steps: r.response?.steps,
    synthesis: r.response?.text,
    checks: r.checks.map((c) => ({
      name: c.name,
      grade: c.grade,
      detail: c.detail,
      fix: c.fix,
    })),
  }));
  writeFileSync(jsonPath, JSON.stringify(jsonResults, null, 2));
  console.log(`\n  Full results saved to ${jsonPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(74));
  console.log("  FAVOR Agent Eval Harness");
  console.log("=".repeat(74));
  console.log(`  Backend:  ${API_BASE}`);
  console.log(`  App:      ${APP_URL}`);
  console.log(`  API Key:  ${API_KEY ? API_KEY.slice(0, 12) + "..." : "(none)"}`);
  console.log(
    `  Cohort:   ${TEST_COHORT_ID ? TEST_COHORT_ID.slice(0, 12) + "..." : "(not set)"}`,
  );
  console.log(
    `  GWAS:     ${GWAS_COHORT_ID ? GWAS_COHORT_ID.slice(0, 12) + "..." : "(not set)"}`,
  );
  console.log(
    `  Mode:     ${DRY_RUN ? "dry-run" : ID_FILTER ? `specific: ${ID_FILTER.join(",")}` : FULL_MODE ? "full" : "core"}`,
  );
  console.log();

  // ── Phase 1: Connectivity checks ─────────────────────────────

  console.log("--- Phase 1: Connectivity ---\n");

  // Check backend
  const backendCheck = await backendApi("/graph/schema").catch(() => null);
  if (!backendCheck || !backendCheck.ok) {
    console.error(
      `  Backend not reachable at ${API_BASE}`,
    );
    console.error(
      `  Status: ${backendCheck?.status ?? "connection refused"}`,
    );
    console.error("  Make sure the backend is running: python -m uvicorn ...");
    process.exit(1);
  }
  const graphSchema = backendCheck.data as {
    data?: { nodeTypes: unknown[]; edgeTypes: unknown[] };
  };
  const nodeCount = graphSchema.data?.nodeTypes?.length ?? "?";
  const edgeCount = graphSchema.data?.edgeTypes?.length ?? "?";
  console.log(
    `  Backend OK: graph schema has ${nodeCount} node types, ${edgeCount} edge types`,
  );

  // Check Next.js app
  const appCheck = await fetch(`${APP_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [], sessionId: "connectivity-check" }),
  }).catch(() => null);

  if (!appCheck) {
    console.error(`  Next.js app not reachable at ${APP_URL}`);
    console.error("  Start the dev server: npm run dev");
    process.exit(1);
  }
  // Any response (even 400/500) means the app is running
  console.log(`  App OK: ${APP_URL} responded (HTTP ${appCheck.status})`);

  // Check cohort (if set)
  if (TEST_COHORT_ID) {
    const cohortCheck = await backendApi(
      `/cohorts/${TEST_COHORT_ID}/schema`,
    );
    if (cohortCheck.ok) {
      const schema = cohortCheck.data as {
        row_count?: number;
        data_type?: string;
        columns?: unknown[];
      };
      console.log(
        `  Variant cohort OK: ${schema.data_type}, ${schema.row_count} rows, ${schema.columns?.length ?? "?"} columns`,
      );
    } else {
      console.log(
        `  Variant cohort FAIL (${cohortCheck.status}): ${TEST_COHORT_ID.slice(0, 12)}...`,
      );
    }
  }

  if (GWAS_COHORT_ID) {
    const gwasCheck = await backendApi(
      `/cohorts/${GWAS_COHORT_ID}/schema`,
    );
    if (gwasCheck.ok) {
      const schema = gwasCheck.data as {
        row_count?: number;
        data_type?: string;
        columns?: unknown[];
      };
      console.log(
        `  GWAS cohort OK: ${schema.data_type}, ${schema.row_count} rows, ${schema.columns?.length ?? "?"} columns`,
      );
    } else {
      console.log(
        `  GWAS cohort FAIL (${gwasCheck.status}): ${GWAS_COHORT_ID.slice(0, 12)}...`,
      );
    }
  }

  console.log();

  // ── Phase 2: Run evaluation ───────────────────────────────────

  console.log("--- Phase 2: Agent Evaluation ---\n");
  const results = await runEval();

  // ── Phase 3: Report ───────────────────────────────────────────

  printReport(results);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
