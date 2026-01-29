import type { Gene } from "@features/gene/types";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneTepColumns = [
  col.accessor("tep_target_id", {
    accessor: (row) => row.opentargets?.tep?.targetFromSourceId,
    header: "Target ID",
    description: tooltip({
      title: "Target ID",
      description:
        "Target identifier from the Target Enabling Package (TEP) source.",
    }),
    cell: cell.text(),
  }),

  col.accessor("tep_description", {
    accessor: (row) => row.opentargets?.tep?.description,
    header: "TEP Description",
    description: tooltip({
      title: "TEP Description",
      description:
        "Description of the Target Enabling Package, including available resources and tools for target validation.",
    }),
    cell: cell.text(),
  }),

  col.accessor("tep_therapeutic_area", {
    accessor: (row) => row.opentargets?.tep?.therapeuticArea,
    header: "Therapeutic Area",
    description: tooltip({
      title: "Therapeutic Area",
      description:
        "The therapeutic area or disease domain this TEP is focused on.",
    }),
    cell: cell.text(),
  }),

  col.accessor("tep_url", {
    accessor: (row) => row.opentargets?.tep?.url,
    header: "TEP Link",
    description: tooltip({
      title: "TEP Link",
      description:
        "Link to the full Target Enabling Package with detailed information and resources.",
    }),
    cell: cell.custom<Gene, any>((url: string) => {
      if (!url) return null;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          View TEP
        </a>
      );
    }),
  }),

  col.accessor("tep_full", {
    accessor: (row) => row.opentargets?.tep,
    header: "Target Enabling Package (Full)",
    description: tooltip({
      title: "Target Enabling Package (Full)",
      description:
        "Complete Target Enabling Package information including description, therapeutic area, and access to resources.",
    }),
    cell: cell.custom<Gene, any>((tep: {
      targetFromSourceId: string;
      description: string;
      therapeuticArea: string;
      url: string;
    }) => {
      if (!tep) return null;

      return (
        <div>
          {tep.targetFromSourceId && (
            <div>Target ID: {tep.targetFromSourceId}</div>
          )}

          {tep.therapeuticArea && (
            <div>Therapeutic Area: {tep.therapeuticArea}</div>
          )}

          {tep.description && (
            <div>
              Description: {tep.description}
            </div>
          )}

          {tep.url && (
            <div>
              <a
                href={tep.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Full TEP
              </a>
            </div>
          )}
        </div>
      );
    }),
  }),
];

export const geneTepGroup = col.group(
  "tep",
  "Target Enabling Package (TEP)",
  geneTepColumns,
);
