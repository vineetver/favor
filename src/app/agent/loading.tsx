import { Skeleton } from "@shared/components/ui/skeleton";

export default function AgentLoading() {
  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-64 border-r border-border p-4 gap-3">
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="space-y-1.5 mt-4">
          {Array.from({ length: 6 }, (_, i) => `agent-nav-${i}`).map((k) => (
            <Skeleton key={k} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 space-y-4">
          <div className="flex justify-center pt-24">
            <Skeleton className="h-8 w-64 rounded-lg" />
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
