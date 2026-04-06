"use client";

import { cn } from "@infra/utils";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

const INSTALL_CMD =
  "curl -fsSL https://raw.githubusercontent.com/vineetver/favor-cli/master/install.sh | sh";

export function CopyInstallCommand() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-8 mx-auto max-w-xl">
      <button
        type="button"
        onClick={copy}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3 rounded-xl",
          "bg-muted/60 border border-border",
          "text-left font-mono text-sm text-foreground",
          "hover:bg-muted transition-colors group cursor-pointer",
        )}
      >
        <span className="text-muted-foreground select-none shrink-0">$</span>
        <span className="truncate flex-1">{INSTALL_CMD}</span>
        {copied ? (
          <Check className="w-4 h-4 text-primary shrink-0" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    </div>
  );
}
