"use client";

interface SubcellularLocationsViewProps {
  locations: Array<Record<string, string>> | null | undefined;
}

export function SubcellularLocationsView({ locations }: SubcellularLocationsViewProps) {
  if (!locations || locations.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {locations.map((loc, i) => {
        const name = loc.location || loc["`location`"] || "";
        if (!name) return null;
        return (
          <span key={i} className="text-sm text-foreground">
            {name}
          </span>
        );
      })}
    </div>
  );
}
