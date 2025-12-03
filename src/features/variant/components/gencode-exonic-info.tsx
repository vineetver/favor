import React from "react";

interface GencodeExonicInfoProps {
  value: string | null | undefined;
}

export function GencodeExonicInfo({ value }: GencodeExonicInfoProps) {
  if (!value) return <span>-</span>;

  const items = value.split(",").map((item) => item.trim());

  // Extract unique protein changes
  const changes = new Map<string, { protein: string; exons: Set<string> }>();

  items.forEach((item) => {
    const [, , exon, , protein] = item.split(":");
    if (!protein) return;

    if (!changes.has(protein)) {
      changes.set(protein, { protein, exons: new Set() });
    }
    if (exon) changes.get(protein)!.exons.add(exon.replace("exon", ""));
  });

  return (
    <div className="text-xs">
      <div className="text-gray-500 text-[11px] mb-1">Protein changes:</div>
      <div className="space-y-0.5">
        {Array.from(changes.values()).map((item, index) => (
          <div key={index} className="flex items-baseline gap-1.5 text-gray-700">
            <span className="font-mono font-medium text-gray-900">
              {item.protein}
            </span>
            {item.exons.size > 0 && (
              <span className="text-gray-500">
                in exon {Array.from(item.exons).join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}