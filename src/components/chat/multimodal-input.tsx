'use client';

import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useWindowSize } from '@/hooks/use-window-size';

import { ArrowUp, Paperclip, Square, RotateCcw } from 'lucide-react';
import { PreviewAttachment } from '@/components/chat/preview-attachment';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import type { Attachment, ChatMessage } from '@/lib/chatbot/types';
import { buttonVariants, inputVariants } from '@/lib/design-system/chat-variants';
import { chatAnimations } from '@/lib/design-system/chat-theme';

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  onReset,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<ChatMessage>;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  className?: string;
  onReset?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile } = useWindowSize();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    const messageToSend = {
      role: 'user' as const,
      parts: [
        ...attachments.map((attachment) => ({
          type: 'file' as const,
          url: attachment.url,
          filename: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: 'text' as const,
          text: input,
        },
      ],
    };
    
    console.log('[MultimodalInput] Sending message:', messageToSend);
    sendMessage(messageToSend);

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();
    setInput('');

    if (!isMobile) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    isMobile,
    chatId,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error('Failed to upload file, please try again!');
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );


  return (
    <div className="relative w-full flex flex-col gap-4">


      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-auto items-end scrollbar-hide"
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Send a message..."
        value={input}
        onChange={handleInput}
        className={cx(
          inputVariants({ variant: 'elevated' }),
          'min-h-[60px] max-h-[calc(75dvh)] overflow-hidden resize-none pl-12 pr-12 pb-3',
          className,
        )}
        rows={2}
        autoFocus
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();

            if (status !== 'ready') {
              toast.error('Please wait for the model to finish its response!');
            } else {
              submitForm();
            }
          }
        }}
      />

      <div className="absolute bottom-0 left-0 p-3">
        {onReset && messages.length > 0 && (
          <ResetButton onReset={onReset} status={status} />
        )}
      </div>

      <div className="absolute bottom-0 right-0 p-3 flex items-center gap-2">
        <AttachmentsButton fileInputRef={fileInputRef} status={status} />
        {status === 'submitted' ? (
          <StopButton stop={stop} />
        ) : (
          <SendButton
            input={input}
            submitForm={submitForm}
            uploadQueue={uploadQueue}
          />
        )}
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;
    if (prevProps.onReset !== nextProps.onReset) return false;
    if (prevProps.messages.length !== nextProps.messages.length) return false;

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
    >
      <Paperclip size={16} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
}: {
  stop: () => void;
}) {
  return (
    <Button
      data-testid="stop-button"
      variant="outline"
      size="icon"
      className="h-8 w-8 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/50"
      onClick={(event) => {
        event.preventDefault();
        stop();
      }}
    >
      <Square size={16} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  const isDisabled = input.length === 0 || uploadQueue.length > 0;
  
  return (
    <Button
      data-testid="send-button"
      variant="default"
      size="icon"
      className={`h-8 w-8 ${
        isDisabled 
          ? 'bg-muted text-muted-foreground cursor-not-allowed' 
          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
      } transition-all duration-200`}
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={isDisabled}
    >
      <ArrowUp size={16} />
    </Button>
  );
}

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

function PureResetButton({
  onReset,
  status,
}: {
  onReset: () => void;
  status: UseChatHelpers<ChatMessage>['status'];
}) {
  const isStreaming = status === 'submitted' || status === 'streaming';
  
  return (
    <Button
      data-testid="reset-button"
      variant="ghost"
      size="icon"
      className={`h-8 w-8 transition-colors ${
        isStreaming 
          ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20' 
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'
      }`}
      onClick={(event) => {
        event.preventDefault();
        onReset();
      }}
      title={isStreaming ? "Stop and reset chat" : "Reset chat"}
    >
      <RotateCcw size={16} className={isStreaming ? 'animate-pulse' : ''} />
    </Button>
  );
}

const ResetButton = memo(PureResetButton);