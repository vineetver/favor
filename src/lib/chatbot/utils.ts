import type { UIMessage } from "ai";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChatSDKError, type ErrorCode } from "@/lib/chatbot/errors";
import type { ChatMessage } from "@/lib/chatbot/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    console.log(
      "[fetchWithErrorHandlers] Making request to:",
      input,
      "with init:",
      init,
    );
    const response = await fetch(input, init);
    console.log(
      "[fetchWithErrorHandlers] Response status:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[fetchWithErrorHandlers] Error response:", errorText);

      try {
        const { code, cause } = JSON.parse(errorText);
        throw new ChatSDKError(code as ErrorCode, cause);
      } catch (parseError) {
        // If we can't parse the error as JSON, create a generic error
        throw new ChatSDKError("api_error" as ErrorCode, errorText);
      }
    }

    return response;
  } catch (error: unknown) {
    console.error("[fetchWithErrorHandlers] Caught error:", error);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function sanitizeText(text: string) {
  return text.replace("<has_function_call>", "");
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
