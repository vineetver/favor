import { Button } from "@shared/components/ui/button";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { memo, useEffect, useRef, useState } from "react";
import { Streamdown, type StreamdownProps } from "streamdown";

type Components = StreamdownProps["components"];

const components: Partial<Components> = {
  a: ({ node, children, ...props }) => {
    return (
      // @ts-expect-error
      <Link
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </Link>
    );
  },
  ol: ({ node, children, ...props }) => (
    <ol className="list-decimal list-outside ml-4 space-y-3" {...props}>
      {children}
    </ol>
  ),
  ul: ({ node, children, ...props }) => (
    <ul className="list-disc list-outside ml-4 space-y-1" {...props}>
      {children}
    </ul>
  ),
  li: ({ node, children, ...props }) => (
    <li className="pl-1" {...props}>
      {children}
    </li>
  ),
  p: ({ node, children, ...props }) => (
    <p className="my-2 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  strong: ({ node, children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
};

interface MarkdownProps {
  children: string;
  showCopy?: boolean;
}

const NonMemoizedMarkdown = ({ children, showCopy = true }: MarkdownProps) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const onCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {showCopy && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onCopy}
          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
          aria-label="Copy to clipboard"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      )}
      <Streamdown components={components}>{children}</Streamdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.showCopy === nextProps.showCopy,
);
