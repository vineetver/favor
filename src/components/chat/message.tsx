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

  // Debug logging for message structure
  console.log(`[Message] Rendering message:`, {
    id: message.id?.slice(0, 8),
    role: message.role,
    hasContent: !!(message as any).content,
    contentType: typeof (message as any).content,
    contentLength: (message as any).content?.length || 0,
    hasParts: !!(message.parts && message.parts.length > 0),
    partsCount: message.parts?.length || 0,
    isLoading,
    messageKeys: Object.keys(message)
  });

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

            {/* Handle direct content field from AI SDK */}
            {(message as any).content && typeof (message as any).content === 'string' ? (
              <div
                data-testid="message-content-direct"
                className={messageVariants({
                  role: message.role,
                  variant: hasGenomicsContent((message as any).content) && message.role === 'assistant' ? 'genomics' : 'default',
                })}
              >
                <Markdown>{sanitizeText((message as any).content)}</Markdown>
              </div>
            ) : 
            /* Render message parts or show loading state for empty assistant messages */
            message.parts && message.parts.length > 0 ? (
              message.parts.map((part, index) => {
                const { type } = part;
                const key = `message-${message.id}-part-${index}`;

                // Debug logging for all message parts
                console.log(`[Message] Processing part ${index}:`, {
                  type,
                  messageId: message.id?.slice(0, 8),
                  messageRole: message.role,
                  partKeys: Object.keys(part),
                  isLoading
                });

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
                    <div
                      key={key}
                      data-testid="message-content"
                      className={messageVariants({
                        role: message.role,
                        variant: isGenomicsContent && message.role === 'assistant' ? 'genomics' : 'default',
                      })}
                    >
                      <Markdown>{sanitizeText(textContent)}</Markdown>
                    </div>
                  );
                }

                // Handle AI SDK streaming delta parts and data parts
                if (type && (type.includes('delta') || type === 'data')) {
                  const deltaContent = (part as any).text || '';
                  const dataContent = (part as any).data;
                  
                  // Handle structured data parts for genomics results
                  if (type === 'data' && dataContent) {
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
                          result={dataContent}
                          isError={false}
                        />
                      </motion.div>
                    );
                  }
                  
                  // Handle text deltas
                  if (deltaContent) {
                    return (
                      <div
                        key={key}
                        data-testid="message-content-delta"
                        className={messageVariants({
                          role: message.role,
                          variant: hasGenomicsContent(deltaContent) && message.role === 'assistant' ? 'genomics' : 'default',
                        })}
                      >
                        <Markdown>{sanitizeText(deltaContent)}</Markdown>
                      </div>
                    );
                  }
                  
                  return null;
                }

                // Handle step-start parts (skip these as they're for AI SDK internal use)
                if (type && type.includes('step-')) {
                  return null;
                }

                // Handle all genomics tool calls with AI SDK 5 enhanced state management
                if (type?.startsWith('tool-')) {
                  const { toolCallId, toolName, state, input, output, args } = part as any;
                  const extractedToolName = type.replace('tool-', '');
                  const toolDisplayName = toolName || extractedToolName || 'Analysis';

                  // Debug logging for all tool call states with enhanced info
                  console.log(`[Message] Tool call state:`, {
                    type,
                    toolCallId: toolCallId?.slice(0, 8),
                    toolName,
                    state,
                    hasInput: !!input,
                    hasArgs: !!args,
                    hasOutput: !!output,
                    inputKeys: input ? Object.keys(input) : [],
                    outputType: output ? typeof output : 'none',
                    partKeys: Object.keys(part),
                    fullPart: part
                  });

                  return (
                    <ToolCallErrorBoundary 
                      key={`${toolCallId}-boundary`} 
                      toolName={toolDisplayName}
                      onRetry={() => {
                        regenerate?.();
                      }}
                    >
                      {(() => {
                        // PRIORITY: Handle completed tool calls first (output-available/completed)
                        if (state === 'output-available' || state === 'completed') {
                          // Handle error case
                          if (output && 'error' in output) {
                            return (
                              <motion.div 
                                key={`${toolCallId}-error`}
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

                          // Handle successful output
                          return (
                            <motion.div 
                              key={`${toolCallId}-success`}
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

                        // Handle initial tool call detection (any tool call with input but unclear state)
                        if ((!state || state === undefined) && (input || args)) {
                          const displayData = input || args;
                          return (
                            <motion.div 
                              key={`${toolCallId}-preparing`}
                              className={messageVariants({ variant: 'genomics', role: 'assistant' })}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={chatAnimations.transition.normal}
                            >
                              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                >
                                  <Dna size={14} />
                                </motion.div>
                                <span>Running {toolDisplayName}...</span>
                                <motion.div 
                                  className="ml-2 flex gap-1"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.5 }}
                                >
                                  {[0, 1, 2].map((i) => (
                                    <motion.div
                                      key={i}
                                      className="w-1 h-1 bg-primary/60 rounded-full"
                                      animate={{ scale: [1, 1.5, 1] }}
                                      transition={{ 
                                        duration: 1, 
                                        repeat: Infinity, 
                                        delay: i * 0.2 
                                      }}
                                    />
                                  ))}
                                </motion.div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                <div className="bg-muted/30 p-2 rounded text-xs">
                                  <div className="font-medium mb-1">Query:</div>
                                  <div className="truncate">{JSON.stringify(displayData).slice(0, 100)}...</div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        }

                        // Handle any tool call that exists but doesn't match other states
                        if (toolCallId && !state) {
                          return (
                            <motion.div 
                              key={`${toolCallId}-initializing`}
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
                                <span>Executing {toolDisplayName}...</span>
                              </div>
                            </motion.div>
                          );
                        }

                        // Tool call started - show preparation
                        if (state === 'started' || state === 'input-available') {
                          return (
                            <motion.div 
                              key={`${toolCallId}-executing`}
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
                                <span>Executing {toolDisplayName}...</span>
                              </div>
                              <div className="flex items-center gap-1 mt-2">
                                <div className="h-1 w-8 bg-primary/20 rounded">
                                  <motion.div 
                                    className="h-full bg-primary rounded"
                                    animate={{ width: ["0%", "100%"] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">Querying database...</span>
                              </div>
                            </motion.div>
                          );
                        }

                        // Tool call streaming - show progress
                        if (state === 'streaming' || state === 'partial-call') {
                          return (
                            <motion.div 
                              key={`${toolCallId}-streaming`}
                              className={messageVariants({ variant: 'genomics', role: 'assistant' })}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <motion.div
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  <Dna size={14} />
                                </motion.div>
                                <span>Processing {toolDisplayName}...</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex gap-1">
                                  {[0, 1, 2].map((i) => (
                                    <motion.div
                                      key={i}
                                      className="w-1 h-1 bg-primary rounded-full"
                                      animate={{ opacity: [0.4, 1, 0.4] }}
                                      transition={{ 
                                        duration: 1.2, 
                                        repeat: Infinity, 
                                        delay: i * 0.3 
                                      }}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">Analyzing genomics data...</span>
                              </div>
                            </motion.div>
                          );
                        }


                        // Tool call cancelled
                        if (state === 'cancelled') {
                          return (
                            <motion.div 
                              key={`${toolCallId}-cancelled`}
                              className={messageVariants({ variant: 'default', role: 'assistant' })}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 0.6 }}
                            >
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Dna size={14} />
                                <span>{toolDisplayName} cancelled</span>
                                <span className="text-xs">⊘</span>
                              </div>
                            </motion.div>
                          );
                        }

                        // Tool call failed
                        if (state === 'failed' || state === 'error') {
                          return (
                            <motion.div 
                              key={`${toolCallId}-failed`}
                              className={messageVariants({ variant: 'error', role: 'assistant' })}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                            >
                              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                                <Dna size={14} />
                                <span>{toolDisplayName} Failed</span>
                                <span className="text-xs">✗</span>
                              </div>
                              <div className="text-sm text-destructive mt-1">
                                Tool execution failed. Please try again.
                              </div>
                            </motion.div>
                          );
                        }

                        // Fallback for unknown/undefined states
                        return (
                          <motion.div 
                            key={`${toolCallId}-unknown`}
                            className={messageVariants({ variant: 'genomics', role: 'assistant' })}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              >
                                <Dna size={14} />
                              </motion.div>
                              <span>Initializing {toolDisplayName}...</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              State: {state || 'unknown'}
                            </div>
                          </motion.div>
                        );
                      })()}
                    </ToolCallErrorBoundary>
                  );
                }

                return null;
              })
            ) : (
              // Handle empty assistant messages 
              message.role === 'assistant' && isLoading ? (
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
                    <span>Analyzing...</span>
                  </div>
                </motion.div>
              ) : message.role === 'assistant' ? (
                // Create an empty streamable container for assistant messages
                <div
                  data-testid="message-content-streaming"
                  className={messageVariants({ 
                    role: 'assistant',
                    variant: 'default' 
                  })}
                >
                  <div className="min-h-[1rem]">
                    {/* Cursor indicator for streaming */}
                    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
                  </div>
                </div>
              ) : (
                // Fallback for user messages or other roles
                <div
                  data-testid="message-content-fallback"
                  className={messageVariants({ role: message.role })}
                >
                  <div className="text-sm">
                    {(message as any).content || 
                     (message as any).text || 
                     'Message content unavailable'}
                  </div>
                </div>
              )
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