import { Card } from "@shared/components/ui/card";
import { Skeleton } from "@shared/components/ui/skeleton";
import { MessageSquare, Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-3">
      <Card className="gap-0 py-0">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[13px] text-subtle font-medium">
              Powered by FAVOR-GPT
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-subtle">
            <MessageSquare className="w-4 h-4" />
            Ask follow-up
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
