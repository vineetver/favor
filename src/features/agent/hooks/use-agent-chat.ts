"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { AgentUIMessage } from "../agent";
import { DEFAULT_SYNTHESIS_MODEL, type SynthesisModelId } from "../lib/models";
import type { PromptInputMessage } from "@shared/components/ai-elements/prompt-input";
import {
  createSessionClient,
  listMessagesClient,
} from "../lib/session-client";

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [synthesisModel, setSynthesisModel] = useState<SynthesisModelId>(DEFAULT_SYNTHESIS_MODEL);
  const synthesisModelRef = useRef<SynthesisModelId>(DEFAULT_SYNTHESIS_MODEL);

  // Promise lock to prevent double-creation of sessions
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  // Dynamic transport that merges sessionId into the request body
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
          synthesisModel: synthesisModelRef.current,
        }),
      }),
    [],
  );

  const { messages, setMessages, sendMessage, status } =
    useChat<AgentUIMessage>({
      transport,
    });

  const updateSynthesisModel = useCallback((id: SynthesisModelId) => {
    synthesisModelRef.current = id;
    setSynthesisModel(id);
  }, []);

  const [pastedVariantCount, setPastedVariantCount] = useState(0);
  const pastedTextRef = useRef("");

  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";

  /** Lazily create a session on first submit. Uses a promise lock. */
  const ensureSession = useCallback(async (title?: string): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;

    // If a creation is already in-flight, await it
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    const promise = createSessionClient(title).then((session) => {
      const id = session.session_id;
      sessionIdRef.current = id;
      setSessionId(id);
      sessionPromiseRef.current = null;
      return id;
    });

    sessionPromiseRef.current = promise;
    return promise;
  }, []);

  /** Submit from the PromptInput component. */
  const submit = useCallback(
    async (message: PromptInputMessage) => {
      if (!message.text?.trim()) return;
      setPastedVariantCount(0);
      pastedTextRef.current = "";

      // Lazily create session — title = first 60 chars of user message
      await ensureSession(message.text.slice(0, 60));

      sendMessage({ text: message.text });
    },
    [sendMessage, ensureSession],
  );

  /** Quick-send a plain string (suggested prompts, sidebar actions). */
  const send = useCallback(
    async (text: string) => {
      await ensureSession(text.slice(0, 60));
      sendMessage({ text });
    },
    [sendMessage, ensureSession],
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
  const createCohortFromPaste = useCallback(async () => {
    const variants = pastedTextRef.current
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter((l) => l && VARIANT_RE.test(l));
    if (variants.length === 0) return;

    await ensureSession(`Cohort from ${variants.length} variants`);
    sendMessage({
      text: `Create a cohort from these ${variants.length} variants:\n${variants.join("\n")}`,
    });
    setPastedVariantCount(0);
    pastedTextRef.current = "";
  }, [sendMessage, ensureSession]);

  /** Dismiss the paste-detection chip. */
  const dismissPaste = useCallback(() => {
    setPastedVariantCount(0);
    pastedTextRef.current = "";
  }, []);

  /** Load an existing session's messages from the backend. */
  const loadSession = useCallback(
    async (id: string) => {
      sessionIdRef.current = id;
      setSessionId(id);

      try {
        const stored = await listMessagesClient(id);
        const uiMessages = stored.map((m) => JSON.parse(m.content) as AgentUIMessage);
        setMessages(uiMessages);
      } catch (err) {
        console.error("[useAgentChat] Failed to load session:", err);
        // Keep the sessionId set so new messages still persist
      }
    },
    [setMessages],
  );

  /** Reset conversation to empty state. */
  const newChat = useCallback(() => {
    sessionIdRef.current = null;
    sessionPromiseRef.current = null;
    setSessionId(null);
    setMessages([]);
    setPastedVariantCount(0);
    pastedTextRef.current = "";
  }, [setMessages]);

  return {
    messages,
    status,
    isStreaming,
    isSubmitted,
    sessionId,
    synthesisModel,
    setSynthesisModel: updateSynthesisModel,
    pastedVariantCount,
    submit,
    send,
    onPaste,
    createCohortFromPaste,
    dismissPaste,
    newChat,
    loadSession,
  } as const;
}
