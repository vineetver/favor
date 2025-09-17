import type { ChatModel } from "./models";

// Message utilities
export function truncateMessage(
  message: string,
  maxLength: number = 1000,
): string {
  if (message.length <= maxLength) return message;

  return message.slice(0, maxLength - 3) + "...";
}

export function formatModelName(model: ChatModel): string {
  return `${model.label}${model.reasoning ? " (Reasoning)" : ""}`;
}

export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function isWithinContextLimit(text: string, model: ChatModel): boolean {
  if (!model.context) return true;

  const estimatedTokens = estimateTokenCount(text);
  return estimatedTokens <= model.context;
}

// Chat history utilities
export function summarizeConversation(
  messages: Array<{ role: string; content: string }>,
): string {
  const recentMessages = messages.slice(-5); // Last 5 messages

  return recentMessages
    .map((msg) => `${msg.role}: ${truncateMessage(msg.content, 100)}`)
    .join("\n");
}

export function findRelevantContext(
  query: string,
  history: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  const keywords = query
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 3);

  return history
    .filter((msg) => {
      const content = msg.content.toLowerCase();
      return keywords.some((keyword) => content.includes(keyword));
    })
    .slice(-3); // Return up to 3 most relevant messages
}

// Performance utilities
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}

// Validation utilities
export function validateModelId(
  modelId: string,
  availableModels: ChatModel[],
): boolean {
  return availableModels.some((model) => model.id === modelId);
}

export function validateMessageContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }

  if (content.length > 50000) {
    return { valid: false, error: "Message is too long" };
  }

  return { valid: true };
}

// Analytics utilities
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function measureResponseTime<T>(
  operation: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();

  return operation().then((result) => ({
    result,
    duration: performance.now() - start,
  }));
}

// Feature detection
export function supportsStreaming(): boolean {
  return typeof ReadableStream !== "undefined" && typeof fetch !== "undefined";
}

export function supportsFileUploads(): boolean {
  return typeof FileReader !== "undefined" && typeof FormData !== "undefined";
}

export function supportsLocalStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

// Environment detection
export function getEnvironmentInfo() {
  return {
    isClient: typeof window !== "undefined",
    isServer: typeof window === "undefined",
    hasNavigator: typeof navigator !== "undefined",
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "server",
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
  };
}

// URL utilities for FAVOR-specific links
export function createVariantUrl(variantId: string): string {
  return `/hg38/rsid/${variantId}/summary`;
}

export function createGeneUrl(geneName: string): string {
  return `/hg38/gene/${geneName}/summary`;
}

export function createRegionUrl(region: string): string {
  return `/hg38/region/${region}/summary`;
}

export function isValidVariantId(variantId: string): boolean {
  // Basic validation for rs IDs
  return /^rs\d+$/i.test(variantId);
}

export function isValidGeneSymbol(gene: string): boolean {
  // Basic validation for gene symbols
  return /^[A-Z][A-Z0-9-]*$/i.test(gene) && gene.length <= 20;
}

export function parseGenomicRegion(region: string): {
  chromosome: string;
  start: number;
  end: number;
} | null {
  // Parse formats like "chr1:1000-2000" or "1:1000-2000"
  const match = region.match(/^(chr)?(\d+|[XY]):(\d+)-(\d+)$/i);

  if (!match) return null;

  const [, , chromosome, startStr, endStr] = match;
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);

  if (start >= end || start < 0) return null;

  return { chromosome, start, end };
}
