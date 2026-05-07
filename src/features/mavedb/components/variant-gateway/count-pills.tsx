import { LABEL_CLASS_ORDER } from "../../constants";
import type { LabelClass, VariantBand } from "../../types";
import { LabelClassPill } from "../shared/label-class-pill";

interface CountPillsProps {
  bands: VariantBand[];
  active: LabelClass | null;
  onSelect: (labelClass: LabelClass | null) => void;
}

export function CountPills({ bands, active, onSelect }: CountPillsProps) {
  const counts: Record<LabelClass, number> = {
    LOF: 0,
    GoF: 0,
    Functional: 0,
    Intermediate: 0,
  };
  for (const b of bands) {
    if (b.label_class) counts[b.label_class] += 1;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {LABEL_CLASS_ORDER.map((cls) => (
        <LabelClassPill
          key={cls}
          labelClass={cls}
          count={counts[cls]}
          active={active === cls}
          onClick={() => onSelect(active === cls ? null : cls)}
        />
      ))}
    </div>
  );
}
