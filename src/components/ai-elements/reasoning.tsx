"use client";

import * as React from "react";
import { ChevronDown, Brain } from "lucide-react";
import { cn } from "@/lib/utils/general";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ReasoningProps extends React.ComponentProps<typeof Collapsible> {
  isStreaming?: boolean;
}

const Reasoning = React.forwardRef<
  React.ElementRef<typeof Collapsible>,
  ReasoningProps
>(({ isStreaming = false, className, defaultOpen, ...props }, ref) => {
  const [hasBeenStreaming, setHasBeenStreaming] = React.useState(isStreaming);
  const [isOpen, setIsOpen] = React.useState(defaultOpen ?? hasBeenStreaming);

  React.useEffect(() => {
    if (isStreaming) {
      setHasBeenStreaming(true);
    }
  }, [isStreaming]);

  React.useEffect(() => {
    if (defaultOpen !== undefined) {
      setIsOpen(defaultOpen);
    } else if (hasBeenStreaming) {
      setIsOpen(true);
    }
  }, [defaultOpen, hasBeenStreaming]);

  return (
    <Collapsible
      ref={ref}
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
      {...props}
    />
  );
});
Reasoning.displayName = "Reasoning";

interface ReasoningTriggerProps
  extends React.ComponentProps<typeof CollapsibleTrigger> {
  title?: string;
}

const ReasoningTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  ReasoningTriggerProps
>(({ title = "Reasoning", className, ...props }, ref) => {
  return (
    <CollapsibleTrigger
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border bg-muted/30 p-3 text-left hover:bg-muted/50 transition-colors",
        "data-[state=open]:border-primary/20 data-[state=open]:bg-primary/5",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
});
ReasoningTrigger.displayName = "ReasoningTrigger";

const ReasoningContent = React.forwardRef<
  React.ElementRef<typeof CollapsibleContent>,
  React.ComponentProps<typeof CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsibleContent ref={ref} className={cn("mt-2", className)} {...props}>
    <div className="rounded-lg border bg-muted/10 p-4">
      <div className="prose prose-sm max-w-none text-muted-foreground">
        {children}
      </div>
    </div>
  </CollapsibleContent>
));
ReasoningContent.displayName = "ReasoningContent";

export { Reasoning, ReasoningTrigger, ReasoningContent };
