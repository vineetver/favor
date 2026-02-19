import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";

// Matches SharedV3ProviderOptions from ai SDK
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue | undefined };
type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;

// Tool-calling model (routing, planning, tool selection)
export const nanoModel = openai("gpt-5-nano");

// Provider options to suppress reasoning on the nano model (used in prepareStep)
export const NANO_PROVIDER_OPTIONS: ProviderOptions = {
  openai: { reasoningEffort: "minimal" } satisfies OpenAILanguageModelResponsesOptions,
};

// Synthesis models (user-selectable)
const SYNTHESIS_MODES = {
  fast: {
    label: "Fast",
    description: "GPT-5 Nano",
    factory: () => openai("gpt-5-nano"),
    // Fast path: same nano model with minimal reasoning
    providerOptions: {
      openai: { reasoningEffort: "minimal" } satisfies OpenAILanguageModelResponsesOptions,
    } as ProviderOptions,
  },
  thinking: {
    label: "Thinking",
    description: "GPT-5.2",
    factory: () => openai("gpt-5.2"),
    // Thinking path: full reasoning
    providerOptions: undefined as ProviderOptions | undefined,
  },
};

export type SynthesisModelId = keyof typeof SYNTHESIS_MODES;

export const DEFAULT_SYNTHESIS_MODEL: SynthesisModelId = "fast";

export function getSynthesisModel(id?: string) {
  const key = (id ?? DEFAULT_SYNTHESIS_MODEL) as SynthesisModelId;
  const mode = SYNTHESIS_MODES[key];
  if (!mode) return SYNTHESIS_MODES[DEFAULT_SYNTHESIS_MODEL].factory();
  return mode.factory();
}

export function getSynthesisProviderOptions(id?: string): ProviderOptions | undefined {
  const key = (id ?? DEFAULT_SYNTHESIS_MODEL) as SynthesisModelId;
  const mode = SYNTHESIS_MODES[key];
  if (!mode) return SYNTHESIS_MODES[DEFAULT_SYNTHESIS_MODEL].providerOptions;
  return mode.providerOptions;
}

export const AVAILABLE_SYNTHESIS_MODELS = Object.entries(SYNTHESIS_MODES).map(
  ([id, mode]) => ({
    id: id as SynthesisModelId,
    label: mode.label,
    description: mode.description,
  }),
);
