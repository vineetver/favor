import { InfoIcon } from "lucide-react";

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 flex gap-2.5 rounded-2xl border border-primary bg-primary-container p-4 leading-6">
      <InfoIcon className="mt-1 h-5 w-5 flex-none fill-primary stroke-surface" />
      <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
