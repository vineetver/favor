import { PreviewMessage, ThinkingMessage } from "@/components/chat/message";
import { Greeting } from '@/components/chat/greeting';
import { memo, useEffect } from "react";
import equal from "fast-deep-equal";
import type { UseChatHelpers } from '@ai-sdk/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage } from '@/lib/chatbot/types';
import { useDataStream } from '@/components/chat/data-stream-provider';
import { containerVariants, buttonVariants } from '@/lib/design-system/chat-variants';
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  selectedModelId: string;
  setInput: (input: string) => void;
}

function PureMessages({
  chatId,
  status,
  messages,
  regenerate,
  isReadonly,
  selectedModelId,
  setInput,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter: messagesViewportEnter,
    onViewportLeave: messagesViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  const { 
    isAtBottom, 
    scrollToBottom, 
    onViewportEnter: scrollViewportEnter,
    onViewportLeave: scrollViewportLeave,
    endRef: scrollEndRef
  } = useScrollToBottom();

  useDataStream();

  // Auto-scroll when status changes to submitted or when new messages arrive
  useEffect(() => {
    if (status === 'submitted' || (status === 'streaming' && isAtBottom)) {
      scrollToBottom();
    }
  }, [status, isAtBottom, scrollToBottom]);

  // Auto-scroll when new messages are added or message parts change (if user was at bottom)
  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  // Auto-scroll when message parts change (for tool calls and content updates)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && isAtBottom) {
      // Scroll when tool call parts are added or updated
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 150); // Small delay to ensure DOM updates
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    messages.map(m => JSON.stringify(m.parts || [])).join('|'), 
    isAtBottom, 
    scrollToBottom
  ]);


  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col w-full gap-3 flex-1 overflow-y-auto px-4 pt-4 pb-4 relative bg-background"
    >
      {/* Scroll to bottom button */}
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed left-1/2 bottom-24 -translate-x-1/2 z-50"
          >
            <Button
              data-testid="scroll-to-bottom-button"
              variant="outline"
              size="icon"
              className="bg-background/95 border-border/80 text-foreground hover:bg-accent hover:text-accent-foreground shadow-lg backdrop-blur-sm"
              onClick={(event) => {
                event.preventDefault();
                scrollToBottom();
              }}
            >
              <ArrowDown size={16} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {messages.length === 0 && <Greeting setInput={setInput} />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          regenerate={regenerate}
          isReadonly={isReadonly}
          requiresScrollPadding={false}
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <motion.div
        ref={scrollEndRef}
        className="shrink-0 h-4"
        onViewportLeave={scrollViewportLeave}
        onViewportEnter={scrollViewportEnter}
      />
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  // If status changed, we need to re-render
  if (prevProps.status !== nextProps.status) return false;
  
  // If message count changed, we need to re-render
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  
  // If messages content changed, we need to re-render
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  
  // If other props changed, we need to re-render
  if (prevProps.chatId !== nextProps.chatId) return false;
  if (prevProps.isReadonly !== nextProps.isReadonly) return false;
  if (prevProps.isArtifactVisible !== nextProps.isArtifactVisible) return false;
  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
  if (prevProps.setInput !== nextProps.setInput) return false;

  // If all relevant props are the same, skip re-render
  return true;
});