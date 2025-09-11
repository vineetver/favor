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
        // Transform AI SDK messages to our schema format
        const transformedMessages = messages.map((message) => {
          // Handle different message formats from AI SDK
          if (message.content && typeof message.content === 'string') {
            // Simple text message
            return {
              id: message.id || generateUUID(),
              role: message.role,
              parts: [{ type: 'text', text: message.content }]
            };
          } else if (message.content && Array.isArray(message.content)) {
            // Multi-part message (text + attachments) - filter only valid types
            const validParts = message.content
              .map((part: any) => {
                if (part.type === 'text' && part.text) {
                  return { type: 'text', text: part.text };
                } else if (part.type === 'file' && part.url) {
                  return {
                    type: 'file',
                    mediaType: part.mediaType || part.mimeType || 'image/jpeg',
                    name: part.name || part.filename || 'file',
                    url: part.url
                  };
                }
                return null; // Filter out invalid parts
              })
              .filter(Boolean); // Remove null values
            
            return {
              id: message.id || generateUUID(),
              role: message.role,
              parts: validParts.length > 0 ? validParts : [{ type: 'text', text: '' }]
            };
          } else if (message.parts) {
            // Already in our format - filter only valid types
            const validParts = message.parts
              .map((part: any) => {
                if (part.type === 'text' && typeof part.text === 'string') {
                  return { type: 'text', text: part.text };
                } else if (part.type === 'file' && part.url) {
                  return {
                    type: 'file',
                    mediaType: part.mediaType || 'image/jpeg',
                    name: part.name || 'file',
                    url: part.url
                  };
                }
                return null; // Filter out AI SDK internal parts like step-start, reasoning, etc.
              })
              .filter(Boolean); // Remove null values
            
            return {
              id: message.id || generateUUID(),
              role: message.role,
              parts: validParts.length > 0 ? validParts : [{ type: 'text', text: '' }]
            };
          } else {
            // Fallback - extract text from any format
            const text = message.text || message.content || '';
            return {
              id: message.id || generateUUID(),
              role: message.role,
              parts: [{ type: 'text', text: String(text) }]
            };
          }
        });

        return {
          body: {
            id,
            messages: transformedMessages,
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