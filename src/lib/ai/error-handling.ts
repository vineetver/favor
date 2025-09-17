import { ChatSDKError, type ErrorCode } from "@/lib/chatbot/errors";

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

export class AIErrorHandler {
  private retryConfig: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry certain errors
        if (this.shouldNotRetry(error)) {
          throw this.enhanceError(error, context, attempt);
        }

        // Don't wait after the last attempt
        if (attempt < this.retryConfig.maxAttempts) {
          await this.delay(this.calculateDelay(attempt));
        }
      }
    }

    throw this.enhanceError(lastError, context, this.retryConfig.maxAttempts);
  }

  private shouldNotRetry(error: unknown): boolean {
    if (error instanceof ChatSDKError) {
      // Don't retry authentication or bad request errors
      const noRetryErrors: ErrorCode[] = [
        "unauthorized:auth",
        "forbidden:auth",
        "bad_request:api",
        "bad_request:chat",
      ];

      const errorCode: ErrorCode = `${error.type}:${error.surface}`;
      return noRetryErrors.includes(errorCode);
    }

    // Don't retry 4xx errors (client errors)
    if (error instanceof Error && "status" in error) {
      const status = (error as any).status;
      return status >= 400 && status < 500;
    }

    return false;
  }

  private calculateDelay(attempt: number): number {
    const delay =
      this.retryConfig.baseDelay *
      Math.pow(this.retryConfig.backoffFactor, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private enhanceError(
    error: unknown,
    context?: string,
    attempt?: number,
  ): Error {
    if (error instanceof ChatSDKError) {
      return error;
    }

    if (error instanceof Error) {
      const enhancedMessage = [
        error.message,
        context && `Context: ${context}`,
        attempt && `After ${attempt} attempts`,
      ]
        .filter(Boolean)
        .join(". ");

      return new ChatSDKError("bad_request:api", enhancedMessage);
    }

    return new ChatSDKError("bad_request:api", "An unexpected error occurred");
  }

  // Network-specific error handling
  async handleNetworkRequest<T>(
    request: () => Promise<T>,
    context?: string,
  ): Promise<T> {
    return this.withRetry(async () => {
      try {
        return await request();
      } catch (error) {
        // Check for network connectivity
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          throw new ChatSDKError(
            "offline:chat",
            "No internet connection available",
          );
        }

        // Handle fetch-specific errors
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new ChatSDKError("bad_request:api", "Network request failed");
        }

        throw error;
      }
    }, context);
  }

  // Model-specific error handling
  handleModelError(error: unknown, modelId: string): Error {
    if (error instanceof ChatSDKError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for model-specific issues
      if (
        error.message.includes("context length") ||
        error.message.includes("token limit")
      ) {
        return new ChatSDKError(
          "bad_request:chat",
          `Context length exceeded for model ${modelId}. Try shortening your input or use a model with larger context.`,
        );
      }

      if (error.message.includes("rate limit")) {
        return new ChatSDKError(
          "rate_limit:chat",
          `Rate limit exceeded for model ${modelId}. Please wait before sending another message.`,
        );
      }

      if (
        error.message.includes("quota") ||
        error.message.includes("billing")
      ) {
        return new ChatSDKError(
          "forbidden:chat",
          `API quota exceeded for model ${modelId}. Please check your billing settings.`,
        );
      }
    }

    return new ChatSDKError(
      "bad_request:chat",
      `Unknown error occurred with model ${modelId}`,
    );
  }

  // User-friendly error messages
  getUserFriendlyMessage(error: unknown): string {
    if (error instanceof ChatSDKError) {
      const errorCode: ErrorCode = `${error.type}:${error.surface}`;

      switch (errorCode) {
        case "offline:chat":
          return "You appear to be offline. Please check your internet connection.";

        case "bad_request:api":
          return "Unable to connect to FAVOR servers. Please try again in a moment.";

        case "bad_request:chat":
          return "Your message is too long. Please try a shorter question or break it into parts.";

        case "rate_limit:chat":
          return "Too many requests. Please wait a moment before sending another message.";

        case "forbidden:chat":
          return "API usage limit reached. Please contact support if this continues.";

        case "unauthorized:auth":
          return "Please sign in to continue using FAVOR-GPT.";

        default:
          return (
            error.message || "An unexpected error occurred. Please try again."
          );
      }
    }

    return "Something went wrong. Please try again.";
  }
}

// Global error handler instance
export const aiErrorHandler = new AIErrorHandler();

// Utility functions
export function isRetryableError(error: unknown): boolean {
  const handler = new AIErrorHandler();
  return !(handler as any).shouldNotRetry(error);
}

export function getErrorSeverity(error: unknown): "low" | "medium" | "high" {
  if (error instanceof ChatSDKError) {
    const errorCode: ErrorCode = `${error.type}:${error.surface}`;

    if (error.type === "offline" || error.type === "unauthorized") {
      return "high";
    }
    if (error.type === "rate_limit" || error.type === "forbidden") {
      return "medium";
    }
  }

  return "low";
}
