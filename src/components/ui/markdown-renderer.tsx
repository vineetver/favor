'use client'

import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import { useMemo } from 'react'
import { cn } from '@/lib/utils/general'

interface MarkdownRendererProps {
  content: string
  className?: string
}

interface ImageRendererProps {
  src: string
  alt: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    return unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        behavior: 'wrap',
        properties: {
          className: ['anchor-link']
        }
      })
      .use(rehypeHighlight)
      .use(rehypeStringify)
      .processSync(content)
      .toString()
  }, [content])

  return (
    <div 
      className={cn(
        'prose prose-sm prose-slate dark:prose-invert max-w-none',
        'prose-headings:scroll-mt-24 prose-headings:font-semibold',
        'prose-h1:text-2xl prose-h1:mb-6 prose-h1:mt-8',
        'prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:border-b prose-h2:border-border prose-h2:pb-2',
        'prose-h3:text-lg prose-h3:mb-3 prose-h3:mt-6',
        'prose-p:leading-7 prose-p:mb-4',
        'prose-ul:my-4 prose-ul:space-y-2',
        'prose-li:my-1',
        'prose-strong:font-semibold prose-strong:text-foreground',
        'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto',
        'prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
        'prose-a:text-primary prose-a:underline prose-a:decoration-primary/30 hover:prose-a:decoration-primary',
        className
      )}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  )
}

export function ImageRenderer({ src, alt, className }: ImageRendererProps) {
  return (
    <div className="overflow-hidden">
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-auto object-cover transition-transform duration-300 hover:scale-105',
          className
        )}
        loading="lazy"
      />
    </div>
  )
}