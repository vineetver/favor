"use client";

import { cn } from "@/lib/utils/general";

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

export function VideoPlayer({ src, title, className }: VideoPlayerProps) {
  return (
    <div className={cn("my-8", className)}>
      <div className="w-full max-w-2xl">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden shadow-lg border border-border">
          <video
            autoPlay
            muted
            loop
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            aria-label={title || "Feature demonstration video"}
          >
            <source src={src} type="video/mp4" />
            <source src={src} type="video/quicktime" />
            Your browser does not support the video tag.
          </video>
        </div>
        {title && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            {title}
          </p>
        )}
      </div>
    </div>
  );
}
