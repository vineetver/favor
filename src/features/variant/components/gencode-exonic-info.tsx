import { Badge } from "@/components/ui/badge";

interface GencodeExonicInfoProps {
  value: string | null | undefined;
}

export function GencodeExonicInfo({ value }: GencodeExonicInfoProps) {
  if (!value) return <span>-</span>;

  const items = value.split(",").map((item) => item.trim());

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const [gene, transcript, exon, cdna, protein] = item.split(":");

        return (
          <div
            key={index}
            className="flex flex-col gap-1.5 text-xs border-l-2 border-blue-300/50 pl-3 py-1"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-700 text-sm">{gene}</span>
              <span className="text-gray-400">→</span>
              {protein && (
                <Badge
                  variant="default"
                  className="h-6 px-2 text-xs font-semibold bg-purple-500 hover:bg-purple-600"
                >
                  {protein}
                </Badge>
              )}
              {exon && (
                <span className="text-gray-500 text-[11px]">{exon}</span>
              )}
            </div>

            {/* Secondary info: Technical details */}
            <div className="flex items-center gap-3 text-[11px]">
              {cdna && (
                <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                  {cdna}
                </span>
              )}
              {transcript && (
                <span className="font-mono text-gray-400">{transcript}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
