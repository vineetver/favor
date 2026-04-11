import type { Gene } from "@features/gene/types";
import { cell, createColumns, tooltip } from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneTractabilityTargetClassColumns = [
  col.accessor("tractability", {
    accessor: (row) => row.opentargets?.tractability,
    header: "Tractability",
    description: tooltip({
      title: "Tractability",
      description:
        "Target tractability data from Open Targets including modality-specific assessments.",
    }),
    cell: cell.custom<Gene, any>(
      (
        tractability: Array<{ modality: string; id: string; value: boolean }>,
      ) => {
        if (!tractability || tractability.length === 0) return null;

        const grouped = tractability.reduce(
          (acc, item) => {
            if (!acc[item.modality]) {
              acc[item.modality] = [];
            }
            acc[item.modality].push(item);
            return acc;
          },
          {} as Record<
            string,
            Array<{ modality: string; id: string; value: boolean }>
          >,
        );

        return (
          <div>
            {Object.entries(grouped).map(([modality, items]) => (
              <div key={modality}>
                <div>{modality}</div>
                <ul>
                  {items
                    .filter((item) => item.value)
                    .map((item, index) => (
                      <li key={index}>{item.id.replace(/_/g, " ")}</li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        );
      },
    ),
  }),

  col.accessor("target_class", {
    accessor: (row) => row.opentargets?.target_class,
    header: "Target Class",
    description: tooltip({
      title: "Target Class",
      description:
        "Target classification from ChEMBL including protein family and functional class.",
    }),
    cell: cell.custom<Gene, any>(
      (targetClass: Array<{ id: number; label: string; level: string }>) => {
        if (!targetClass || targetClass.length === 0) return null;

        const grouped = targetClass.reduce(
          (acc, item) => {
            if (!acc[item.level]) {
              acc[item.level] = [];
            }
            acc[item.level].push(item);
            return acc;
          },
          {} as Record<
            string,
            Array<{ id: number; label: string; level: string }>
          >,
        );

        const levelOrder = ["level1", "level2", "level3"];
        const sortedLevels = levelOrder.filter((level) => grouped[level]);

        return (
          <div>
            {sortedLevels.map((level) => (
              <div key={level}>
                <div>{level.replace("level", "Level ")}</div>
                <ul>
                  {grouped[level].map((item, index) => (
                    <li key={index}>{item.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      },
    ),
  }),
];

export const geneTractabilityTargetClassGroup = col.group(
  "tractability-and-target-class",
  "Tractability & Target Class",
  geneTractabilityTargetClassColumns,
);
