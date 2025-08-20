'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/general';

interface CodeBlockProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: any;
  [key: string]: any;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = String(children).replace(/\n$/, '');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (inline) {
    return (
      <code
        className={cn(
          'text-sm bg-muted px-1.5 py-0.5 rounded-md font-mono',
          className
        )}
        {...props}
      >
        {children}
      </code>
    );
  }

  const language = className?.replace('language-', '') || 'text';
  const isGenomicsCode = ['vcf', 'fasta', 'fastq', 'bed', 'gff'].includes(language.toLowerCase());

  return (
    <div className="not-prose flex flex-col my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b rounded-t-lg">
        <span className="text-xs font-medium text-muted-foreground">
          {isGenomicsCode ? `${language.toUpperCase()} file` : language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </Button>
      </div>
      <pre
        {...props}
        className={cn(
          'text-sm w-full overflow-x-auto bg-muted/30 p-4 rounded-b-lg border border-t-0',
          isGenomicsCode && 'font-mono bg-primary/5 border-primary/20'
        )}
      >
        <code className="whitespace-pre-wrap break-words font-mono">
          {children}
        </code>
      </pre>
    </div>
  );
}