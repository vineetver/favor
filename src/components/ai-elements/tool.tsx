"use client";

import * as React from "react";
import {
  ChevronDown,
  Code2,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/general";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

interface ToolProps extends React.ComponentProps<typeof Collapsible> {
  defaultOpen?: boolean;
}

const Tool = React.forwardRef<React.ElementRef<typeof Collapsible>, ToolProps>(
  ({ defaultOpen = false, className, ...props }, ref) => (
    <Collapsible
      ref={ref}
      defaultOpen={defaultOpen}
      className={cn("w-full", className)}
      {...props}
    />
  ),
);
Tool.displayName = "Tool";

interface ToolHeaderProps
  extends Omit<React.ComponentProps<typeof CollapsibleTrigger>, "type"> {
  type: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
}

const ToolHeader = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  ToolHeaderProps
>(({ type, state, className, ...props }, ref) => {
  const getStateIcon = () => {
    switch (state) {
      case "input-streaming":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "input-available":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "output-available":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "output-error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  const getStateBadge = () => {
    switch (state) {
      case "input-streaming":
        return <Badge variant="secondary">Streaming</Badge>;
      case "input-available":
        return <Badge variant="secondary">Running</Badge>;
      case "output-available":
        return <Badge variant="default">Complete</Badge>;
      case "output-error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  const displayName = type
    .replace("tool-", "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());

  return (
    <CollapsibleTrigger
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border bg-card p-3 text-left hover:bg-accent/50 transition-colors",
        "data-[state=open]:border-primary/20",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {getStateIcon()}
        <div className="flex flex-col">
          <span className="text-sm font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground">{type}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getStateBadge()}
        <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
      </div>
    </CollapsibleTrigger>
  );
});
ToolHeader.displayName = "ToolHeader";

const ToolContent = React.forwardRef<
  React.ElementRef<typeof CollapsibleContent>,
  React.ComponentProps<typeof CollapsibleContent>
>(({ className, ...props }, ref) => (
  <CollapsibleContent
    ref={ref}
    className={cn("mt-2 space-y-3", className)}
    {...props}
  />
));
ToolContent.displayName = "ToolContent";

interface ToolInputProps extends React.ComponentProps<"div"> {
  input: any;
}

const ToolInput = React.forwardRef<React.ElementRef<"div">, ToolInputProps>(
  ({ input, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-muted/30 p-3", className)}
      {...props}
    >
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        Input Parameters
      </div>
      <pre className="text-xs overflow-x-auto">
        <code>{JSON.stringify(input, null, 2)}</code>
      </pre>
    </div>
  ),
);
ToolInput.displayName = "ToolInput";

interface ToolOutputProps extends React.ComponentProps<"div"> {
  output: React.ReactNode;
  errorText?: string;
}

const ToolOutput = React.forwardRef<React.ElementRef<"div">, ToolOutputProps>(
  ({ output, errorText, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border p-3",
        errorText ? "bg-destructive/5 border-destructive/20" : "bg-card",
        className,
      )}
      {...props}
    >
      {errorText ? (
        <>
          <div className="mb-2 text-xs font-medium text-destructive">Error</div>
          <div className="text-sm text-destructive">{errorText}</div>
        </>
      ) : (
        <>
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Output
          </div>
          <div className="text-sm">{output}</div>
        </>
      )}
    </div>
  ),
);
ToolOutput.displayName = "ToolOutput";

export { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput };
