"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useCallback, useRef, useState } from "react";
import type { AgentUIMessage } from "../agent";
import type { PromptInputMessage } from "@shared/components/ai-elements/prompt-input";

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

const transport = new DefaultChatTransport({ api: "/api/chat" });

// ---------------------------------------------------------------------------
// Variant paste detection
// ---------------------------------------------------------------------------

const VARIANT_RE = /^(rs\d+|\d{1,2}[-:]\d+[-:][A-Za-z]+[-:][A-Za-z]+)$/;
const PASTE_THRESHOLD = 10;

function countVariantLines(text: string): number {
  let count = 0;
  for (const raw of text.split(/[\r\n]+/)) {
    const line = raw.trim();
    if (line && VARIANT_RE.test(line)) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAgentChat() {
  const { messages, setMessages, sendMessage, status } =
    useChat<AgentUIMessage>({
      transport,
    });

  const [pastedVariantCount, setPastedVariantCount] = useState(0);
  const pastedTextRef = useRef("");

  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";

  /** Submit from the PromptInput component. */
  const submit = useCallback(
    (message: PromptInputMessage) => {
      if (!message.text?.trim()) return;
      setPastedVariantCount(0);
      pastedTextRef.current = "";
      sendMessage({ text: message.text });
    },
    [sendMessage],
  );

  /** Quick-send a plain string (suggested prompts, sidebar actions). */
  const send = useCallback(
    (text: string) => sendMessage({ text }),
    [sendMessage],
  );

  /** Detect a bulk variant paste in the textarea. */
  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;
      const count = countVariantLines(text);
      if (count >= PASTE_THRESHOLD) {
        setPastedVariantCount(count);
        pastedTextRef.current = text;
      }
    },
    [],
  );

  /** Turn the detected pasted variants into a cohort-creation request. */
  const createCohortFromPaste = useCallback(() => {
    const variants = pastedTextRef.current
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter((l) => l && VARIANT_RE.test(l));
    if (variants.length === 0) return;
    sendMessage({
      text: `Create a cohort from these ${variants.length} variants:\n${variants.join("\n")}`,
    });
    setPastedVariantCount(0);
    pastedTextRef.current = "";
  }, [sendMessage]);

  /** Dismiss the paste-detection chip. */
  const dismissPaste = useCallback(() => {
    setPastedVariantCount(0);
    pastedTextRef.current = "";
  }, []);

  /** Reset conversation to empty state. */
  const newChat = useCallback(() => {
    setMessages([]);
    setPastedVariantCount(0);
    pastedTextRef.current = "";
  }, [setMessages]);

  return {
    messages,
    status,
    isStreaming,
    isSubmitted,
    pastedVariantCount,
    submit,
    send,
    onPaste,
    createCohortFromPaste,
    dismissPaste,
    newChat,
  } as const;
}
