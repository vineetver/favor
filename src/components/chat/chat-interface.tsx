"use client";

import { Chat } from "@/components/chat/chat";
import { generateUUID } from "@/lib/chatbot/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import FABButton from "@/components/ui/fab";
import React from "react";
import { useWindowSize } from "@/hooks/use-window-size";
import { DataStreamProvider } from "@/components/chat/data-stream-provider";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { buttonVariants } from "@/lib/design-system/chat-variants";
import { chatAnimations } from "@/lib/design-system/chat-theme";

export function ChatInterface({ selectedModelId }: { selectedModelId: string }) {
  const { isMobile } = useWindowSize();

  const CloseButton = ({ onClick }: { onClick?: () => void }) => (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={chatAnimations.spring.snappy}
      className={buttonVariants({ variant: 'ghost', size: 'icon' })}
    >
      <X className="h-4 w-4" />
    </motion.button>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger className="fixed bottom-9 right-4" asChild>
          <motion.div 
            className="inline-block"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={chatAnimations.spring.snappy}
          >
            <FABButton className={buttonVariants({ variant: 'fab', size: 'fab' })}>
              Chat with FAVOR-GPT
            </FABButton>
          </motion.div>
        </SheetTrigger>
        <SheetContent className="bg-background text-foreground w-full p-0 border-l border-border">
          <DataStreamProvider>
            <Chat
              key="mobile-chat"
              id="mobile-chat"
              initialMessages={[]}
              selectedModelId={selectedModelId}
              isReadonly={false}
              Close={CloseButton}
            />
          </DataStreamProvider>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        id="chatbot-trigger-button"
        className="fixed bottom-8 right-6 z-50"
        asChild
      >
        <motion.div 
          className="inline-block"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={chatAnimations.spring.snappy}
        >
          <FABButton className={buttonVariants({ variant: 'fab', size: 'fab' })}>
            Chat with FAVOR-GPT
          </FABButton>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="bg-background text-foreground md:m-4 md:h-[610px] md:w-[650px] p-0 border border-border shadow-xl">
        <DataStreamProvider>
          <Chat
            key="desktop-chat"
            id="desktop-chat"
            initialMessages={[]}
            selectedModelId={selectedModelId}
            isReadonly={false}
            Close={CloseButton}
          />
        </DataStreamProvider>
      </PopoverContent>
    </Popover>
  );
}