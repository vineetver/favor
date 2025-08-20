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
import { DataStreamProvider } from "@/components/chatbot/data-stream-provider";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export function ChatInterface({ selectedModelId }: { selectedModelId: string }) {
  const id = generateUUID();
  const { isMobile } = useWindowSize();

  const CloseButton = ({ onClick }: { onClick?: () => void }) => (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="flex-none self-end"
    >
      <X className="h-5 w-5 font-normal" />
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
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <FABButton className="font-semibold bg-gradient-to-r from-primary to-pink text-on-primary shadow-lg hover:shadow-xl transform transition-all duration-300">
              Chat with FAVOR-GPT
            </FABButton>
          </motion.div>
        </SheetTrigger>
        <SheetContent className="bg-secondary-container text-on-secondary-container w-full p-0">
          <DataStreamProvider>
            <Chat
              key={id}
              id={id}
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
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <FABButton className="font-semibold bg-gradient-to-r from-primary to-pink text-on-primary shadow-lg hover:shadow-xl transform transition-all duration-300">
            Chat with FAVOR-GPT
          </FABButton>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="bg-secondary-container text-on-secondary-container md:m-4 md:h-[610px] md:w-[650px] p-0">
        <DataStreamProvider>
          <Chat
            key={id}
            id={id}
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