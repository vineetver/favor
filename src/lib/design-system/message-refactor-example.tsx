// Example: Refactored Message Component with Consistent Styling
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
import { 
  messageVariants, 
  chatContainerVariants, 
  iconContainerVariants 
} from './chat-variants';
import { chatAnimations, chatTypography } from './chat-theme';

const RefactoredMessage = ({
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

  const sanitizeText = (text: string) => {
    return text.replace('<has_function_call>', '');
  };

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
        className={cn(
          chatContainerVariants({ size: 'md' }),
          'group/message'
        )}
        {...chatAnimations.message}
        data-role={message.role}
      >
        <div className="flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit">
          {message.role === 'assistant' && (
            <div className={cn(
              iconContainerVariants({ color: 'primary', size: 'md' }),
              'size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-primary/20 shadow-sm'
            )}>
              <div className="translate-y-px">
                <Dna size={14} className="text-primary" />
              </div>
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4 w-full', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            })}
          >
            {/* Attachments */}
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

            {/* Message Content */}
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
                  
                  // Determine message variant
                  const variant = isGenomicsContent ? 'genomics' : 'default';

                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div
                        data-testid="message-content"
                        className={messageVariants({ 
                          role: message.role, 
                          variant 
                        })}
                      >
                        {isGenomicsContent && message.role === 'assistant' && (
                          <div className="flex items-center gap-2 text-xs font-medium text-primary border-b border-primary/20 pb-2 mb-1">
                            <div className={iconContainerVariants({ 
                              color: 'primary', 
                              size: 'sm' 
                            })}>
                              <Dna size={10} className="text-primary" />
                            </div>
                            <span>Genomics Analysis</span>
                          </div>
                        )}
                        <div className={cn(
                          message.role === 'user' 
                            ? chatTypography.message.user 
                            : chatTypography.message.assistant
                        )}>
                          <Markdown>{sanitizeText(textContent)}</Markdown>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Handle tool calls with consistent styling
                if (type?.startsWith('tool-')) {
                  const { toolCallId, state } = part as any;

                  if (state === 'input-available') {
                    return (
                      <div key={toolCallId} className={messageVariants({ 
                        role: 'assistant', 
                        variant: 'genomics' 
                      })}>
                        <div className="flex items-center gap-2 text-sm font-medium mb-2 text-primary">
                          <Dna size={14} />
                          <span>Executing genomics analysis...</span>
                        </div>
                        <div className={chatTypography.ui.caption}>
                          Fetching data...
                        </div>
                      </div>
                    );
                  }

                  if (state === 'output-available') {
                    const { output } = part as any;
                    
                    if ('error' in output) {
                      return (
                        <div
                          key={toolCallId}
                          className={messageVariants({ 
                            role: 'assistant', 
                            variant: 'error' 
                          })}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium mb-2">
                            <Dna size={14} />
                            <span>Analysis Error</span>
                          </div>
                          <div className={chatTypography.ui.caption}>
                            {String(output.error)}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={toolCallId} className={messageVariants({ 
                        role: 'assistant', 
                        variant: 'genomics' 
                      })}>
                        <div className="flex items-center gap-2 text-sm font-medium mb-2 text-primary">
                          <Dna size={14} />
                          <span>Analysis Results</span>
                        </div>
                        <div className="text-sm">
                          <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded max-h-60 overflow-auto">
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
              // Fallback rendering
              <div className="flex flex-row gap-2 items-start">
                <div
                  data-testid="message-content-fallback"
                  className={messageVariants({ role: message.role })}
                >
                  <div className={chatTypography.message.system}>
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

export const RefactoredPreviewMessage = memo(RefactoredMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (!equal(prevProps.message, nextProps.message)) return false;
  return true;
});