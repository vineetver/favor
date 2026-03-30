"use client";

import { Button } from "@shared/components/ui/button";
import { Share2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

interface ShareButtonProps {
  label: string;
}

export function ShareButton({ label }: ShareButtonProps) {
  const handleShare = useCallback(async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: label, url });
        return;
      } catch {
        // User cancelled or API unavailable — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  }, [label]);

  return (
    <Button variant="outline" className="shrink-0" onClick={handleShare}>
      <Share2 />
      Share
    </Button>
  );
}
