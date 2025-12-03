"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="p-6">
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <h3 className="text-destructive font-medium mb-2">Error loading variant</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}
