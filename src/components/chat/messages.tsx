import { PreviewMessage, ThinkingMessage } from "@/components/chat/message";
import { Greeting } from '@/components/chat/greeting';
import { memo } from "react";
import equal from "fast-deep-equal";
import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'framer-motion';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage } from '@/lib/chatbot/types';
import { useDataStream } from '@/components/chat/data-stream-provider';
import { containerVariants } from '@/lib/design-system/chat-variants';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  selectedModelId: string;
}

function PureMessages({
  chatId,
  status,
  messages,
  regenerate,
  isReadonly,
  selectedModelId,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({
    chatId,
    status,
  });

  useDataStream();

  // Debug logging (can be removed in production)
  // console.log('[Messages] Rendering with:', {
  //   messagesCount: messages.length,
  //   messages: messages,
  //   status: status,
  //   chatId: chatId
  // });

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-auto pt-4 relative bg-background"
    >
      {messages.length === 0 && <Greeting />}

      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          regenerate={regenerate}
          isReadonly={isReadonly}
          requiresScrollPadding={
            hasSentMessage && index === messages.length - 1
          }
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}

      <motion.div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
        onViewportLeave={onViewportLeave}
        onViewportEnter={onViewportEnter}
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

  // If all relevant props are the same, skip re-render
  return true;
});