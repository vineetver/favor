"use client";

import { cn } from "@infra/utils";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTrigger,
} from "@shared/components/ui/dialog";
import { Maximize2, X } from "lucide-react";
import Image from "next/image";
import { Dialog as DialogPrimitive } from "radix-ui";

interface ReleaseImageCardProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export function ReleaseImageCard({
  src,
  alt,
  width,
  height,
  caption,
}: ReleaseImageCardProps) {
  return (
    <Dialog>
      <figure className="max-w-sm">
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="View screenshot at full size"
            className={cn(
              "group relative block w-full overflow-hidden rounded-lg border border-border bg-card",
              "shadow-sm transition-all duration-200",
              "hover:shadow-md hover:border-foreground/20 hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              className="block w-full h-auto"
            />
            <span
              aria-hidden
              className={cn(
                "absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md",
                "bg-background/90 backdrop-blur px-1.5 py-1 text-[10px] font-medium text-foreground",
                "border border-border shadow-sm",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
              )}
            >
              <Maximize2 className="h-3 w-3" />
              Zoom
            </span>
          </button>
        </DialogTrigger>
        {caption && (
          <figcaption className="mt-2 text-xs text-muted-foreground">
            {caption}
          </figcaption>
        )}
      </figure>

      <DialogPortal>
        <DialogOverlay className="bg-black/80" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-[min(96vw,1400px)] max-h-[92vh]",
            "outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-200",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            {alt}
          </DialogPrimitive.Title>
          <div className="relative rounded-lg overflow-hidden bg-background shadow-2xl border border-border">
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              className="block w-full h-auto max-h-[88vh] object-contain"
              priority
            />
          </div>
          {caption && (
            <p className="mt-3 text-center text-xs text-white/80">{caption}</p>
          )}
          <DialogClose
            aria-label="Close"
            className={cn(
              "absolute -top-3 -right-3 rounded-full bg-background border border-border",
              "p-1.5 shadow-lg",
              "hover:bg-accent transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
