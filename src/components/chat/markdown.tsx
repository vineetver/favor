import Link from 'next/link';
import React, { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';
import { cn } from '@/lib/utils/general';

const components: Partial<Components> = {
  code: CodeBlock as any,
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal list-outside ml-4 my-2 space-y-1" {...props}>
        {children}
      </ol>
    );
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-disc list-outside ml-4 my-2 space-y-1" {...props}>
        {children}
      </ul>
    );
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="text-sm leading-relaxed" {...props}>
        {children}
      </li>
    );
  },
  p: ({ node, children, ...props }) => {
    return (
      <p className="text-sm leading-relaxed mb-3" {...props}>
        {children}
      </p>
    );
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold text-foreground" {...props}>
        {children}
      </span>
    );
  },
  em: ({ node, children, ...props }) => {
    return (
      <em className="italic" {...props}>
        {children}
      </em>
    );
  },
  a: ({ node, href, children, ...props }) => {
    const isExternal = href?.startsWith('http');
    return (
      <Link
        href={href || '#'}
        className="text-primary hover:underline hover:underline-offset-2"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer noopener' : undefined}
        {...props}
      >
        {children}
      </Link>
    );
  },
  blockquote: ({ node, children, ...props }) => {
    return (
      <blockquote className="border-l-4 border-primary/20 pl-4 my-4 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md" {...props}>
        {children}
      </blockquote>
    );
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-xl font-semibold mt-6 mb-3 text-foreground" {...props}>
        {children}
      </h1>
    );
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-lg font-semibold mt-5 mb-3 text-foreground" {...props}>
        {children}
      </h2>
    );
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-base font-semibold mt-4 mb-2 text-foreground" {...props}>
        {children}
      </h3>
    );
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-sm font-semibold mt-4 mb-2 text-foreground" {...props}>
        {children}
      </h4>
    );
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-sm font-medium mt-3 mb-2 text-foreground" {...props}>
        {children}
      </h5>
    );
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-xs font-medium mt-3 mb-2 text-muted-foreground" {...props}>
        {children}
      </h6>
    );
  },
  table: ({ node, children, ...props }) => {
    return (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-border" {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead: ({ node, children, ...props }) => {
    return (
      <thead className="bg-muted/50" {...props}>
        {children}
      </thead>
    );
  },
  tbody: ({ node, children, ...props }) => {
    return (
      <tbody {...props}>
        {children}
      </tbody>
    );
  },
  tr: ({ node, children, ...props }) => {
    return (
      <tr className="border-b border-border" {...props}>
        {children}
      </tr>
    );
  },
  th: ({ node, children, ...props }) => {
    return (
      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border" {...props}>
        {children}
      </th>
    );
  },
  td: ({ node, children, ...props }) => {
    return (
      <td className="px-3 py-2 text-sm border border-border" {...props}>
        {children}
      </td>
    );
  },
  hr: ({ node, ...props }) => {
    return (
      <hr className="my-6 border-border" {...props} />
    );
  },
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);