import { cn } from "@infra/utils";
import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Prose                                                                      */
/* -------------------------------------------------------------------------- */

export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        // headings
        "prose-headings:text-foreground prose-headings:font-semibold",
        // body
        "prose-p:text-muted-foreground prose-li:text-muted-foreground",
        // links
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        // code
        "prose-code:bg-muted prose-code:text-foreground prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[13px] prose-code:before:content-none prose-code:after:content-none",
        // strong
        "prose-strong:text-foreground",
        // hr
        "prose-hr:border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Callout                                                                    */
/* -------------------------------------------------------------------------- */

const calloutVariants = {
  info: {
    border: "border-l-blue-500",
    bg: "bg-blue-500/5",
    icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
  },
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
    icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
  },
  tip: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/5",
    icon: <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
  },
} as const;

export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: keyof typeof calloutVariants;
  title?: string;
  children: ReactNode;
}) {
  const v = calloutVariants[variant];
  return (
    <div className={cn("rounded-lg border-l-4 px-4 py-3 my-4", v.border, v.bg)}>
      <div className="flex gap-2.5">
        {v.icon}
        <div className="min-w-0">
          {title && (
            <p className="text-sm font-semibold text-foreground mb-1">
              {title}
            </p>
          )}
          <div className="text-sm text-muted-foreground leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step                                                                       */
/* -------------------------------------------------------------------------- */

export function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">
          {number}
        </div>
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="pb-8 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-8">
          {title}
        </p>
        <div className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CodeBlock                                                                  */
/* -------------------------------------------------------------------------- */

export function CodeBlock({
  children,
  title,
}: {
  children: string;
  title?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted overflow-hidden my-4">
      {title && (
        <div className="px-4 py-2 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
        </div>
      )}
      <pre className="p-4 overflow-x-auto">
        <code className="text-[13px] leading-relaxed text-foreground font-mono">
          {children}
        </code>
      </pre>
    </div>
  );
}
