import { motion } from "framer-motion";
import { ModelSelector } from "@/components/chat/model-selector";
import { buttonVariants } from "@/lib/design-system/chat-variants";
import { chatAnimations } from "@/lib/design-system/chat-theme";

interface ChatHeaderProps {
  selectedModelId: string;
  onClose?: () => void;
  Close?: React.ComponentType<{ onClick?: () => void }>;
}

export function ChatHeader({ selectedModelId, onClose, Close }: ChatHeaderProps) {
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
      
      {(onClose || Close) && (
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={chatAnimations.spring.snappy}
        >
          {Close ? (
            <Close onClick={onClose} />
          ) : (
            <button 
              onClick={onClose} 
              type="button"
              className={buttonVariants({ variant: 'ghost', size: 'icon' })}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}