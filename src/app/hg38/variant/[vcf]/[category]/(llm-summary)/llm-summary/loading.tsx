import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-2xl font-semibold">
            AI-Generated Variant Summary
          </h2>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading variant data...</span>
        </div>
      </div>
    </div>
  );
}
