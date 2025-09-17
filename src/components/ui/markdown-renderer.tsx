"use client";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { useMemo } from "react";
import { cn } from "@/lib/utils/general";
import { VideoPlayer } from "./video-player";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface ImageRendererProps {
  src: string;
  alt: string;
  className?: string;
}

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const { processedContent, videos } = useMemo(() => {
    let processedMarkdown = content;
    const foundVideos: Array<{
      src: string;
      title?: string;
      placeholder: string;
    }> = [];

    // Find and extract video tags
    processedMarkdown = processedMarkdown.replace(
      /<video[^>]*>[\s\S]*?<source\s+src="([^"]+)"[^>]*>[\s\S]*?<\/video>/gi,
      (match, src) => {
        // Extract title from the content between source and closing video tag
        const titleMatch = match.match(
          /<source[^>]*>[\s\S]*?([^<]+?)[\s\S]*?<\/video>/i,
        );
        const title = titleMatch?.[1]?.trim();

        const placeholder = `VIDEO_PLACEHOLDER_${foundVideos.length}`;
        foundVideos.push({ src, title, placeholder });
        return placeholder;
      },
    );

    const htmlContent = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync(processedMarkdown)
      .toString();

    return { processedContent: htmlContent, videos: foundVideos };
  }, [content]);

  const renderContentWithVideos = () => {
    let html = processedContent;
    const elements: React.ReactNode[] = [];

    videos.forEach((video, index) => {
      const parts = html.split(video.placeholder);
      if (parts.length > 1) {
        elements.push(
          <div
            key={`content-${index}`}
            className={cn(
              "prose prose-sm prose-slate max-w-none",
              "prose-p:text-base prose-p:leading-7 prose-p:my-4",
              "prose-li:text-base prose-li:leading-7",
              "prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-6",
              "prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-4",
              "prose-ul:my-6 prose-ol:my-6",
              "prose-strong:font-semibold",
              "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            )}
            dangerouslySetInnerHTML={{ __html: parts[0] }}
          />,
        );

        elements.push(
          <VideoPlayer
            key={`video-${index}`}
            src={video.src}
            title={video.title}
          />,
        );

        html = parts[1];
      }
    });

    if (html) {
      elements.push(
        <div
          key="final-content"
          className={cn(
            "prose prose-sm prose-slate max-w-none",
            "prose-p:text-base prose-p:leading-7 prose-p:my-4",
            "prose-li:text-base prose-li:leading-7",
            "prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-6",
            "prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-4",
            "prose-ul:my-6 prose-ol:my-6",
            "prose-strong:font-semibold",
            "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />,
      );
    }

    return elements;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {renderContentWithVideos()}
    </div>
  );
}

export function ImageRenderer({ src, alt, className }: ImageRendererProps) {
  return (
    <div className="overflow-hidden">
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-auto object-cover transition-transform duration-300 hover:scale-105",
          className,
        )}
        loading="lazy"
      />
    </div>
  );
}
