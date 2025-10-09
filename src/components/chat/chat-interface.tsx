"use client";

import { Chat } from "@/components/chat/chat";
import { generateUUID } from "@/lib/chatbot/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import FABButton from "@/components/ui/fab";
import React, { StrictMode, useState } from "react";
import { useWindowSize } from "@/hooks/use-window-size";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { buttonVariants } from "@/lib/design-system/chat-variants";
import { chatAnimations } from "@/lib/design-system/chat-theme";
import { useChat } from "@ai-sdk/react";
import { ChatSDKError } from "@/lib/chatbot/errors";
import { toast } from "@/components/ui/toast";

export function ChatInterface({
  selectedModelId,
}: {
  selectedModelId: string;
}) {
  const { isMobile } = useWindowSize();
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, regenerate, setMessages } = useChat({
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: "error",
          description: error.message,
        });
      }
    },
  });

  const PopoverCloseButton = ({ onClick }: { onClick?: () => void }) => (
    <PopoverPrimitive.Close asChild>
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={chatAnimations.spring.snappy}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <X className="h-4 w-4" />
      </motion.button>
    </PopoverPrimitive.Close>
  );

  const SheetCloseButton = ({ onClick }: { onClick?: () => void }) => (
    <SheetPrimitive.Close asChild>
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={chatAnimations.spring.snappy}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <X className="h-4 w-4" />
      </motion.button>
    </SheetPrimitive.Close>
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
            <FABButton
              className={buttonVariants({ variant: "fab", size: "fab" })}
            >
              Chat with FAVOR-GPT
            </FABButton>
          </motion.div>
        </SheetTrigger>
        <SheetContent className="bg-background text-foreground w-full p-0 border-l border-border">
          <Chat
            selectedModelId={selectedModelId}
            Close={SheetCloseButton}
            messages={messages}
            sendMessage={sendMessage}
            status={status}
            regenerate={regenerate}
            setMessages={setMessages}
            input={input}
            setInput={setInput}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <StrictMode>
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
            <FABButton
              className={buttonVariants({ variant: "fab", size: "fab" })}
            >
              Chat with FAVOR-GPT
            </FABButton>
          </motion.div>
        </PopoverTrigger>
        <PopoverContent className="bg-background text-foreground p-0 md:m-4 md:h-[610px] md:w-[850px] md:max-w-[90vw] md:max-h-[85vh]">
          <Chat
            selectedModelId={selectedModelId}
            Close={PopoverCloseButton}
            messages={messages}
            sendMessage={sendMessage}
            status={status}
            regenerate={regenerate}
            setMessages={setMessages}
            input={input}
            setInput={setInput}
          />
        </PopoverContent>
      </Popover>
    </StrictMode>
  );
}
