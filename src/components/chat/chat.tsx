import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
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
    error,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    experimental_throttle: 100,
    generateId: generateUUID,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id, body }) {
        return {
          body: {
            id,
            messages: messages,
            selectedChatModel: selectedModelId,
            selectedVisibilityType: 'public',
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : [dataPart]));
    },
    onFinish: () => {
      // Handle completion without filtering messages
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast.error(error.message);
      }
    },
  });



  const handleReset = () => {
    if (status === 'submitted' || status === 'streaming') {
      stop();
      setTimeout(() => {
        setMessages([]);
        setInput('');
        setAttachments([]);
      }, 100);
    } else {
      setMessages([]);
      setInput('');
      setAttachments([]);
    }
  };

  return (
    <>
      <DataStreamHandler />
      <div className="flex flex-col w-full h-full bg-background overflow-hidden">
        <ChatHeader selectedModelId={selectedModelId} onClose={onClose} Close={Close} />
        
        {error && (
          <motion.div 
            className="mx-4 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm text-destructive font-medium">Connection Error</div>
            <div className="text-xs text-destructive/80 mt-1">{error.message}</div>
          </motion.div>
        )}
        
        <Messages
          chatId={id}
          status={status}
          messages={messages}
          selectedModelId={selectedModelId}
          setInput={setInput}
        />
        
        <motion.form 
          className="flex w-full px-4 pb-4 bg-background/95 backdrop-blur-sm"
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
              selectedModelId={selectedModelId}
              onReset={handleReset}
            />
          )}
        </motion.form>
      </div>
    </>
  );
}