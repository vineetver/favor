'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import { Markdown } from './markdown';
import { PreviewAttachment } from './preview-attachment';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils/general';
import { MessageReasoning } from './message-reasoning';
import { Dna } from 'lucide-react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/chatbot/types';
import { messageVariants, avatarVariants, containerVariants } from '@/lib/design-system/chat-variants';
import { chatAnimations } from '@/lib/design-system/chat-theme';

const PurePreviewMessage = ({
  chatId,
  message,
  isLoading,
  regenerate,
  isReadonly,
  requiresScrollPadding,
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

  // Function to sanitize message text
  const sanitizeText = (text: string) => {
    return text.replace('<has_function_call>', '');
  };

  // Check if message contains genomics content
  const hasGenomicsContent = (text: string) => {
    const genomicsPatterns = [
      /rs\d+/i, // SNP IDs
      /chr\d+:/i, // Chromosome coordinates
      /\b[A-Z]{3,6}\b/i, // Gene symbols
      /p\.\w+\d+\w+/i, // Protein variants
      /c\.\d+/i, // cDNA variants
    ];
    return genomicsPatterns.some(pattern => pattern.test(text));
  };

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className={containerVariants({ spacing: 'normal' })}
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={chatAnimations.transition.normal}
        data-role={message.role}
      >
        <div className="flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit">
          {message.role === 'assistant' && (
            <div className={avatarVariants({ variant: 'assistant' })}>
              <Dna size={14} className="text-primary" />
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4 w-full', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
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

            {/* Render message parts or fallback to basic content */}
            {message.parts && message.parts.length > 0 ? (
              message.parts.map((part, index) => {
                const { type } = part;
                const key = `message-${message.id}-part-${index}`;

                if (type === 'reasoning' && part.text?.trim().length > 0) {
                  return (
                    <MessageReasoning
                      key={key}
                      isLoading={isLoading}
                      reasoning={part.text}
                    />
                  );
                }

                if (type === 'text') {
                  const textContent = part.text || '';
                  const isGenomicsContent = hasGenomicsContent(textContent);

                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div
                        data-testid="message-content"
                        className={messageVariants({
                          role: message.role,
                          variant: isGenomicsContent && message.role === 'assistant' ? 'genomics' : 'default',
                        })}
                      >
                        {isGenomicsContent && message.role === 'assistant' && (
                          <div className="flex items-center gap-2 text-xs font-medium text-primary border-b border-primary/20 pb-2 mb-1">
                            <div className="p-1 bg-primary/10 rounded-full">
                              <Dna size={10} className="text-primary" />
                            </div>
                            <span>Genomics Analysis</span>
                          </div>
                        )}
                        <Markdown>{sanitizeText(textContent)}</Markdown>
                      </div>
                    </div>
                  );
                }

                // Handle step-start and other AI SDK specific parts
                if (type && (type.includes('step-') || type.includes('delta'))) {
                  // Skip these parts, they're for AI SDK internal use
                  return null;
                }

                // Handle all genomics tool calls with simple state management
                if (type?.startsWith('tool-')) {
                  const { toolCallId, state } = part as any;

                  if (state === 'input-available') {
                    return (
                      <div key={toolCallId} className={messageVariants({ variant: 'genomics', role: 'assistant' })}>
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                          <Dna size={14} />
                          <span>Executing genomics analysis...</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Fetching data...
                        </div>
                      </div>
                    );
                  }

                  if (state === 'output-available') {
                    const { output } = part as any;
                    
                    // Handle error case
                    if ('error' in output) {
                      return (
                        <div key={toolCallId} className={messageVariants({ variant: 'error', role: 'assistant' })}>
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Dna size={14} />
                            <span>Analysis Error</span>
                          </div>
                          <div className="text-sm">
                            {String(output.error)}
                          </div>
                        </div>
                      );
                    }

                    // Handle successful output
                    return (
                      <div key={toolCallId} className={messageVariants({ variant: 'genomics', role: 'assistant' })}>
                        <div className="flex items-center gap-2 text-sm font-medium text-primary">
                          <Dna size={14} />
                          <span>Analysis Results</span>
                        </div>
                        <div className="text-sm">
                          <pre className="whitespace-pre-wrap font-mono text-xs bg-muted/50 p-3 rounded-lg max-h-60 overflow-auto">
                            {JSON.stringify(output, null, 2)}
                          </pre>
                        </div>
                      </div>
                    );
                  }
                }

                return null;
              })
            ) : (
              // Fallback rendering for messages without proper parts structure
              <div className="flex flex-row gap-2 items-start">
                <div
                  data-testid="message-content-fallback"
                  className={messageVariants({ role: message.role })}
                >
                  <div className="text-sm">
                    {(message as any).content || 
                     (message as any).text || 
                     JSON.stringify(message)}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (!equal(prevProps.message, nextProps.message)) return false;

  return true;
});

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className={containerVariants({ spacing: 'normal' })}
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ ...chatAnimations.transition.normal, delay: 1 }}
      data-role={role}
    >
      <div className="flex gap-4 w-full">
        <div className={avatarVariants({ variant: 'loading' })}>
          <Dna size={14} className="text-primary animate-pulse" />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground animate-pulse">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  );
};