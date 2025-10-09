"use client";

import { motion } from "framer-motion";
import { Loader } from "@/components/ai-elements/loader";

export const ThinkingMessage = () => {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role="assistant"
      data-testid="message-assistant-loading"
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-start gap-3 px-4">
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader />
            <span>Thinking...</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
