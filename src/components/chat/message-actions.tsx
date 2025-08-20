import { memo } from 'react';
import { Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import equal from 'fast-deep-equal';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { ChatMessage } from '@/lib/chatbot/types';
import type { UseChatHelpers } from '@ai-sdk/react';

interface Vote {
  isUpvoted?: boolean;
  isDownvoted?: boolean;
}

interface MessageActionsProps {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  regenerate?: UseChatHelpers<ChatMessage>['regenerate'];
}

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  regenerate,
}: MessageActionsProps) {
  if (isLoading) return null;
  if (message.role === 'user') return null;

  const handleCopy = async () => {
    const textFromParts = message.parts
      ?.filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
      .trim();

    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    try {
      await navigator.clipboard.writeText(textFromParts);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleRegenerate = () => {
    if (regenerate) {
      regenerate();
      toast.success('Regenerating response...');
    }
  };

  const handleVote = async (type: 'up' | 'down') => {
    try {
      // For now, just show feedback since we don't have voting API
      const action = type === 'up' ? 'upvoted' : 'downvoted';
      toast.success(`Response ${action}! Thanks for your feedback.`);
      
      // In the future, this would make an API call:
      // await fetch('/api/vote', {
      //   method: 'PATCH',
      //   body: JSON.stringify({
      //     chatId,
      //     messageId: message.id,
      //     type,
      //   }),
      // });
    } catch (error) {
      toast.error(`Failed to ${type === 'up' ? 'upvote' : 'downvote'} response`);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              <Copy size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>

        {regenerate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleRegenerate}
              >
                <RotateCcw size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Regenerate response</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-upvote"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              disabled={vote?.isUpvoted}
              onClick={() => handleVote('up')}
            >
              <ThumbsUp size={14} className={vote?.isUpvoted ? 'fill-current' : ''} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-downvote"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              disabled={vote?.isDownvoted}
              onClick={() => handleVote('down')}
            >
              <ThumbsDown size={14} className={vote?.isDownvoted ? 'fill-current' : ''} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote response</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    return true;
  },
);