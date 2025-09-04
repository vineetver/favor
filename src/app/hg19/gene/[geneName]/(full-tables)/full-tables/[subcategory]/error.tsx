"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto flex h-64 flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <p className="text-muted-foreground">
        Failed to load gene variant data
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}