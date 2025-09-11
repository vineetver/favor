'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import { Markdown } from './markdown';
import { PreviewAttachment } from './preview-attachment';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils/general';
import { Dna } from 'lucide-react';
import type { ChatMessage } from '@/lib/chatbot/types';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { ChartRenderer } from './chart-renderer';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';

const PurePreviewMessage = ({
  message,
  isLoading,
  requiresScrollPadding,
}: {
  message: ChatMessage;
  isLoading: boolean;
  requiresScrollPadding: boolean;
}) => {
  const attachmentsFromMessage = message.parts?.filter(
    (part) => part.type === 'file',
  ) || [];

  const sanitizeText = (text: string) => {
    return text.replace('<has_function_call>', '');
  };

  // Debug: Log message structure to understand why it's not showing
  console.log('🔍 Message debug:', {
    id: message.id,
    role: message.role,
    hasParts: !!message.parts,
    partsLength: message.parts?.length,
    hasContent: !!(message as any).content,
    content: (message as any).content,
    allKeys: Object.keys(message)
  });

  return (
    <motion.div
      data-testid={`message-${message.role}`}
      className="group/message w-full mb-4"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      data-role={message.role}
    >
      <div
        className={cn('flex w-full items-start gap-2 md:gap-3', {
          'justify-end': message.role === 'user',
          'justify-start': message.role === 'assistant',
        })}
      >
        {message.role === 'assistant' && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border mt-1">
            <Dna size={14} className="text-primary" />
          </div>
        )}

        <div
          className={cn('flex flex-col', {
            'gap-2 md:gap-4': message.parts?.some(
              (p) => p.type === 'text' && p.text?.trim(),
            ),
            'min-h-96': message.role === 'assistant' && requiresScrollPadding,
            'w-full':
              message.role === 'assistant' &&
              message.parts?.some(
                (p) => p.type === 'text' && p.text?.trim(),
              ),
            'max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)] ml-3':
              message.role === 'user',
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

          {/* Render message parts in order */}
          {/* First, try to render parts if they exist */}
          {message.parts && message.parts.length > 0 ? message.parts.map((part, index) => {
            const key = `${message.id}-part-${index}`;

            // Handle reasoning parts
            if (part.type === 'reasoning' && part.text?.trim()) {
              return (
                <Reasoning
                  key={key}
                  className="w-full"
                  isStreaming={isLoading && index === message.parts!.length - 1}
                >
                  <ReasoningTrigger />
                  <ReasoningContent>
                    <Markdown>{sanitizeText(part.text)}</Markdown>
                  </ReasoningContent>
                </Reasoning>
              );
            }

            // Handle text parts
            if (part.type === 'text' && part.text?.trim()) {
              return (
                <div key={key}>
                  <div
                    data-testid="message-content"
                    className={cn({
                      'w-fit break-words rounded-2xl px-3 py-2 text-right bg-primary text-white [&>*]:text-white':
                        message.role === 'user',
                      'bg-transparent px-0 py-0 text-left':
                        message.role === 'assistant',
                    })}
                  >
                    <Markdown>{sanitizeText(part.text)}</Markdown>
                    {isLoading && message.role === 'assistant' && index === message.parts!.length - 1 && (
                      <motion.span 
                        className="inline-block w-0.5 h-4 bg-foreground ml-1"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                </div>
              );
            }

            // Handle tool calls
            if (part.type?.startsWith('tool-')) {
              const toolPart = part as any;
              const defaultOpen = false;

              return (
                <Tool key={key} defaultOpen={defaultOpen}>
                  <ToolHeader type={part.type} state={toolPart.state || 'input-available'} />
                  <ToolContent>
                    {toolPart.input && (
                      <ToolInput input={toolPart.input} />
                    )}
                    {(toolPart.state === 'output-available' || toolPart.state === 'output-error') && (
                      <ToolOutput
                        output={
                          toolPart.output && typeof toolPart.output === 'object' ? (
                            <>
                              <details className="cursor-pointer">
                                <summary className="text-xs font-medium text-muted-foreground mb-2">
                                  View Raw Data
                                </summary>
                                <pre className="text-xs overflow-x-auto bg-muted/50 p-2 rounded">
                                  <code>{JSON.stringify(toolPart.output, null, 2)}</code>
                                </pre>
                              </details>
                            </>
                          ) : (
                            <Markdown>{String(toolPart.output || '')}</Markdown>
                          )
                        }
                        errorText={toolPart.errorText}
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          }) : 
          /* Fallback: Handle AI SDK content format if no parts */
          (() => {
            const msgContent = (message as any).content;
            
            // String content
            if (typeof msgContent === 'string' && msgContent.trim()) {
              return (
                <div key={`${message.id}-content`}>
                  <div
                    data-testid="message-content"
                    className={cn({
                      'w-fit break-words rounded-2xl px-3 py-2 text-right bg-primary text-white [&>*]:text-white':
                        message.role === 'user',
                      'bg-transparent px-0 py-0 text-left':
                        message.role === 'assistant',
                    })}
                  >
                    <Markdown>{sanitizeText(msgContent)}</Markdown>
                    {isLoading && message.role === 'assistant' && (
                      <motion.span 
                        className="inline-block w-0.5 h-4 bg-foreground ml-1"
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                </div>
              );
            }
            
            // Array content
            if (Array.isArray(msgContent)) {
              return msgContent.map((part, index) => {
                const key = `${message.id}-content-${index}`;
                
                if (part.type === 'text' && part.text?.trim()) {
                  return (
                    <div key={key}>
                      <div
                        data-testid="message-content"
                        className={cn({
                          'w-fit break-words rounded-2xl px-3 py-2 text-right bg-primary text-white [&>*]:text-white':
                            message.role === 'user',
                          'bg-transparent px-0 py-2 text-left':
                            message.role === 'assistant',
                        })}
                      >
                        <Markdown>{sanitizeText(part.text)}</Markdown>
                        {isLoading && message.role === 'assistant' && index === msgContent.length - 1 && (
                          <motion.span 
                            className="inline-block w-0.5 h-4 bg-foreground ml-1"
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                      </div>
                    </div>
                  );
                }
                
                return null;
              }).filter(Boolean);
            }
            
            return null;
          })()}

          {/* Handle chart data from tool outputs */}
          {message.role === 'assistant' && message.parts?.map((part, index) => {
            if (part.type?.startsWith('tool-') && (part as any).output?.type === 'chart') {
              const toolPart = part as any;
              return (
                <ChartRenderer 
                  key={`${message.id}-chart-${index}`}
                  type={toolPart.output.type}
                  chartType={toolPart.output.chartType}
                  data={toolPart.output.data}
                  config={toolPart.output.config}
                  metadata={toolPart.output.metadata}
                />
              );
            }
            return null;
          })}

          {/* Show loading state if no parts yet OR if only tools with no text response */}
          {message.role === 'assistant' && isLoading && (
            (!message.parts || message.parts.length === 0) ||
            (message.parts && !message.parts.some((part: any) => part.type === 'text' && part.text?.trim()))
          ) && (
            <div className="bg-muted rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Dna size={12} />
                </motion.div>
                <span>
                  {message.parts?.some((part: any) => part.type?.startsWith('tool-')) 
                    ? 'Processing results...' 
                    : 'Thinking...'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;

    return true;
  },
);

const LoadingText = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      animate={{ backgroundPosition: ['100% 50%', '-100% 50%'] }}
      transition={{
        duration: 1.5,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'linear',
      }}
      style={{
        background:
          'linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--muted-foreground)) 35%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground)) 65%, hsl(var(--muted-foreground)) 100%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
      }}
      className="flex items-center text-transparent"
    >
      {children}
    </motion.div>
  );
};

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="group/message w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-role={role}
    >
      <div className="flex items-start justify-start gap-3">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <Dna size={14} className="text-primary" />
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="p-0 text-muted-foreground text-sm">
            <LoadingText>Thinking...</LoadingText>
          </div>
        </div>
      </div>
    </motion.div>
  );
};