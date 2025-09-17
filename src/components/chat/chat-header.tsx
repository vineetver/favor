import { motion } from "framer-motion";
import { ModelSelector } from "@/components/chat/model-selector";
import { chatAnimations } from "@/lib/design-system/chat-theme";

interface ChatHeaderProps {
  selectedModelId: string;
  Close: React.ComponentType<{ onClick?: () => void }>;
}

export function ChatHeader({ selectedModelId, Close }: ChatHeaderProps) {
  return (
    <motion.div
      className="flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border/60"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={chatAnimations.transition.normal}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold tracking-tight text-foreground">
          FAVOR-GPT
        </span>
        <ModelSelector selectedModelId={selectedModelId} />
      </div>

      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={chatAnimations.spring.snappy}
      >
        <Close />
      </motion.div>
    </motion.div>
  );
}
