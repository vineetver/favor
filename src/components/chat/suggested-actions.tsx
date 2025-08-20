'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage, VisibilityType } from '@/lib/chatbot/types';

const suggestedActions = [
  {
    title: 'Analyze a variant',
    label: 'Analyze rs1234567 variant impact',
    action: 'Can you analyze the functional impact of rs1234567?',
  },
  {
    title: 'Search genes',
    label: 'Find genes related to diabetes',
    action: 'Help me find genes associated with type 2 diabetes',
  },
  {
    title: 'Explore pathways',
    label: 'Show insulin signaling pathway',
    action: 'Show me the insulin signaling pathway and related genes',
  },
  {
    title: 'GWAS analysis',
    label: 'Explain GWAS results',
    action: 'Help me interpret these GWAS results for cardiovascular disease',
  },
];

function PureSuggestedActions({
  sendMessage,
  selectedVisibilityType,
}: {
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-2 w-full">
      {suggestedActions.map((action, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={action.title}
        >
          <Button
            variant="ghost"
            onClick={() => {
              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: action.action }],
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
          >
            <span className="font-medium">{action.title}</span>
            <span className="text-muted-foreground">{action.label}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions);