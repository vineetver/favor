import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import { Messages } from "./messages";
import { MultimodalInput } from "@/components/chat/multimodal-input";
import { motion } from "framer-motion";
import { ChatHeader } from "@/components/chat/chat-header";
import { fetchWithErrorHandlers, generateUUID } from '@/lib/chatbot/utils';
import { ChatSDKError } from '@/lib/chatbot/errors';
import type { Attachment, ChatMessage } from '@/lib/chatbot/types';
import { useDataStream } from '@/components/chat/data-stream-provider';
import { DataStreamHandler } from '@/components/chat/data-stream-handler';
import { toast } from 'sonner';
import { chatAnimations } from '@/lib/design-system/chat-theme';

export function Chat({
  id,
  initialMessages,
  selectedModelId,
  isReadonly,
  onClose,
  Close,
}: {
  id: string;
  initialMessages: Array<ChatMessage>;
  selectedModelId: string;
  isReadonly: boolean;
  onClose?: () => void;
  Close?: React.ComponentType<{ onClick?: () => void }>;
}) {
  const { setDataStream } = useDataStream();

  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
  } = useChat<ChatMessage>({
    id,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        const lastMessage = messages[messages.length - 1];
        return {
          body: {
            id,
            message: lastMessage,
            selectedChatModel: selectedModelId,
            selectedVisibilityType: 'public',
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      console.log('[Chat] Received data part:', dataPart);
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onError: (error) => {
      console.error('[Chat] useChat error:', error);
      if (error instanceof ChatSDKError) {
        toast.error(error.message);
        console.error('[Chat] ChatSDKError details:', error);
      } else {
        toast.error(`Chat error: ${error.message || String(error)}`);
        console.error('[Chat] Unknown error:', error);
      }
    },
  });


  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  return (
    <>
      <DataStreamHandler />
      <div className="flex flex-col min-w-0 h-full bg-background">
        <ChatHeader selectedModelId={selectedModelId} onClose={onClose} Close={Close} />
        
        <Messages
          chatId={id}
          status={status}
          messages={messages}
          regenerate={regenerate}
          isReadonly={isReadonly}
          isArtifactVisible={false}
          selectedModelId={selectedModelId}
        />
        
        <motion.form 
          className="flex mx-auto gap-2 w-full md:max-w-3xl px-4 pb-4 bg-background/95 backdrop-blur-sm border-t border-border/60"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={chatAnimations.transition.normal}
        >
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              status={status}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              sendMessage={sendMessage}
              selectedVisibilityType="public"
            />
          )}
        </motion.form>
      </div>
    </>
  );
}