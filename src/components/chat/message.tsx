'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import { Markdown } from './markdown';
import { PreviewAttachment } from './preview-attachment';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils/general';
import { MessageReasoning } from './message-reasoning';
import { ToolCallErrorBoundary } from './tool-call-error-boundary';
import { GenomicsToolResult } from './genomics-tool-result';
import { Dna } from 'lucide-react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/chatbot/types';
import { messageVariants, avatarVariants, containerVariants } from '@/lib/design-system/chat-variants';
import { chatAnimations } from '@/lib/design-system/chat-theme';

const PurePreviewMessage = ({
  message,
  isLoading,
  regenerate,
}: {
  chatId: string;
  message: ChatMessage;
  isLoading: boolean;
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {

  const attachmentsFromMessage = message.parts?.filter(
    (part) => part.type === 'file',
  ) || [];

  const sanitizeText = (text: string) => {
    return text.replace('<has_function_call>', '');
  };

  const hasGenomicsContent = (text: string) => {
    const genomicsPatterns = [
      /rs\d+/i, 
      /chr\d+:/i, 
      /\b[A-Z]{3,6}\b/i, 
      /p\.\w+\d+\w+/i, 
      /c\.\d+/i, 
    ];
    return genomicsPatterns.some(pattern => pattern.test(text));
  };

  // Accumulate all text parts into a single text content
  const textParts = message.parts?.filter(part => part.type === 'text') || [];
  const accumulatedText = textParts.map(part => part.text || '').join('');

  // Get all non-text parts (tool calls, data, etc.)
  const nonTextParts = message.parts?.filter(part => part.type !== 'text') || [];

  // Fallback to direct content field if no text parts exist
  const directContent = (message as any).content || '';
  const finalTextContent = accumulatedText || directContent;
  const hasTextContent = finalTextContent.trim().length > 0;

  // Check if we're actively streaming text (has text parts but they might be incomplete)
  const isStreamingText = isLoading && message.role === 'assistant' && (textParts.length > 0 || directContent);

  // Debug logging with more details about all parts
  console.log(`[Message ${message.id?.slice(0, 8)}] Full message debug:`, {
    hasTextContent,
    finalTextContentLength: finalTextContent.length,
    textPartsCount: textParts.length,
    nonTextPartsCount: nonTextParts.length,
    isLoading,
    directContentLength: directContent.length,
    accumulatedTextLength: accumulatedText.length,
    totalPartsCount: message.parts?.length || 0,
    messageRole: message.role,
    allParts: message.parts?.map((part, i) => ({ 
      index: i, 
      type: part.type, 
      hasText: !!(part as any).text,
      hasInput: !!(part as any).input,
      hasArgs: !!(part as any).args,
      hasToolCallId: !!(part as any).toolCallId,
      state: (part as any).state,
      keys: Object.keys(part)
    }))
  });

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className={containerVariants({ spacing: 'tight' })}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={chatAnimations.transition.normal}
        data-role={message.role}
      >
        <div className={cn('flex w-full', {
          'justify-end': message.role === 'user',
          'justify-start': message.role === 'assistant',
        })}>
          {message.role === 'assistant' && (
            <div className={cn(avatarVariants({ variant: 'assistant', size: 'md' }), 'mt-2')}>
              <Dna size={14} className="text-primary" />
            </div>
          )}

          <div
            className={cn('flex flex-col gap-2 w-full', {
              'ml-3': message.role === 'assistant',
              'mr-0': message.role === 'user',
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                data-testid="message-attachments"
                className="flex flex-row justify-end gap-2"
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={{
                      name: attachment.filename ?? 'file',
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Render parts in chronological order as they arrive */}
            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              // Debug each part as it's processed
              console.log(`[Message ${message.id?.slice(0, 8)}] Processing part ${index}:`, {
                type,
                keys: Object.keys(part),
                toolCallId: (part as any).toolCallId?.slice(0, 8),
                state: (part as any).state,
                hasInput: !!(part as any).input,
                hasOutput: !!(part as any).output
              });

              // Handle reasoning parts
              if (type === 'reasoning' && part.text?.trim().length > 0) {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.text}
                  />
                );
              }

              // Handle text parts - show each text part as it arrives
              if (type === 'text' && part.text?.trim()) {
                return (
                  <motion.div
                    key={key}
                    data-testid="message-content"
                    className={messageVariants({
                      role: message.role,
                      variant: hasGenomicsContent(part.text) && message.role === 'assistant' ? 'genomics' : 'default',
                    })}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={chatAnimations.transition.normal}
                  >
                    <Markdown>{sanitizeText(part.text)}</Markdown>
                    {isStreamingText && (
                      <motion.span 
                        className="inline-block w-2 h-4 bg-primary/60 ml-1"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                );
              }

              // Handle data parts
              if (type.startsWith('data-') && (part as any).data) {
                return (
                  <motion.div
                    key={key}
                    className={messageVariants({ variant: 'genomics', role: 'assistant' })}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={chatAnimations.transition.normal}
                  >
                    <GenomicsToolResult
                      toolName="Data Stream"
                      result={(part as any).data}
                      isError={false}
                    />
                  </motion.div>
                );
              }

              // Handle tool calls
              if (type?.startsWith('tool-')) {
                const { toolName, state, input, output, args } = part as any;
                const extractedToolName = type.replace('tool-', '');
                const toolDisplayName = toolName || extractedToolName || 'Analysis';

                return (
                  <ToolCallErrorBoundary 
                    key={key}
                    toolName={toolDisplayName}
                    onRetry={() => regenerate?.()}
                  >
                    {(() => {
                      // Handle completed tool calls
                      if (state === 'output-available' || state === 'completed') {
                        if (output && 'error' in output) {
                          return (
                            <motion.div 
                              className={messageVariants({ variant: 'error', role: 'assistant' })}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                            >
                              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                                <Dna size={14} />
                                <span>{toolDisplayName} Error</span>
                              </div>
                              <div className="text-sm text-destructive mt-1">
                                {String(output.error)}
                              </div>
                            </motion.div>
                          );
                        }

                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ 
                              duration: 0.4, 
                              ease: "easeOut",
                              type: "spring",
                              stiffness: 300,
                              damping: 30
                            }}
                          >
                            <GenomicsToolResult
                              toolName={toolDisplayName}
                              result={output}
                              isError={false}
                            />
                          </motion.div>
                        );
                      }

                      // Handle tool calls in progress
                      if (state === 'started' || state === 'input-available' || state === 'streaming' || state === 'partial-call' || (!state && (input || args))) {
                        return (
                          <motion.div 
                            className={messageVariants({ variant: 'genomics', role: 'assistant' })}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={chatAnimations.transition.normal}
                          >
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Dna size={14} />
                              </motion.div>
                              <span>Running {toolDisplayName}...</span>
                            </div>
                          </motion.div>
                        );
                      }

                      return null;
                    })()}
                  </ToolCallErrorBoundary>
                );
              }

              return null;
            })}

            {/* Loading state for completely empty assistant messages - only show if truly no content */}
            {!hasTextContent && nonTextParts.length === 0 && message.role === 'assistant' && isLoading && (
              <motion.div
                className={messageVariants({ variant: 'genomics', role: 'assistant' })}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={chatAnimations.transition.normal}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Dna size={14} />
                  </motion.div>
                  <span>Thinking...</span>
                </div>
              </motion.div>
            )}

            {/* Show additional loading indicator when text is done but tool calls are still running */}
            {hasTextContent && nonTextParts.some((part: any) => part.type?.startsWith('tool-') && (!part.state || part.state === 'started' || part.state === 'input-available' || part.state === 'streaming')) && isLoading && (
              <motion.div
                className={messageVariants({ variant: 'genomics', role: 'assistant' })}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={chatAnimations.transition.normal}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-primary/70">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Dna size={12} />
                  </motion.div>
                  <span>Running analysis tools...</span>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding) return false;
  
  // Check if text content has changed (accumulated from parts)
  const prevText = prevProps.message.parts
    ?.filter(part => part.type === 'text')
    ?.map(part => part.text || '')
    .join('') || (prevProps.message as any).content || '';
  
  const nextText = nextProps.message.parts
    ?.filter(part => part.type === 'text')
    ?.map(part => part.text || '')
    .join('') || (nextProps.message as any).content || '';
  
  if (prevText !== nextText) return false;
  
  // Check if non-text parts have changed
  const prevNonTextParts = prevProps.message.parts?.filter(part => part.type !== 'text') || [];
  const nextNonTextParts = nextProps.message.parts?.filter(part => part.type !== 'text') || [];
  
  if (!equal(prevNonTextParts, nextNonTextParts)) return false;

  return true;
});

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className={containerVariants({ spacing: 'tight' })}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...chatAnimations.transition.normal, delay: 1 }}
      data-role={role}
    >
      <div className="flex justify-start w-full">
        <div className={avatarVariants({ variant: 'loading', size: 'sm' })}>
          <Dna size={12} className="text-primary animate-pulse" />
        </div>

        <div className="ml-3">
          <div className={messageVariants({ role: 'assistant' })}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              Thinking...
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};