import type { Gene } from "@features/gene/types";
import { cell, createColumns, tooltip } from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneCancerHallmarksColumns = [
  col.accessor("cancer_hallmarks", {
    accessor: (row) => row.opentargets?.hallmarks?.cancerHallmarks,
    header: "Cancer Hallmarks",
    description: tooltip({
      title: "Cancer Hallmarks",
      description:
        "Cancer hallmarks associated with this gene based on literature evidence. These represent fundamental capabilities acquired during cancer development.",
    }),
    cell: cell.custom<Gene, any>(
      (
        hallmarks: Array<{
          pmid: number;
          description: string;
          impact: string;
          label: string;
        }>,
      ) => {
        if (!hallmarks || hallmarks.length === 0) return null;

        return (
          <div>
            {hallmarks.map((hallmark, index) => (
              <div key={index}>
                <div>{hallmark.label}</div>

                {hallmark.impact && <div>Impact: {hallmark.impact}</div>}

                {hallmark.description && <div>{hallmark.description}</div>}

                {hallmark.pmid && (
                  <div>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${hallmark.pmid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PubMed: {hallmark.pmid}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      },
    ),
  }),

  col.accessor("cancer_attributes", {
    accessor: (row) => row.opentargets?.hallmarks?.attributes,
    header: "Cancer Attributes",
    description: tooltip({
      title: "Cancer Attributes",
      description:
        "Additional cancer-related attributes and characteristics associated with this gene.",
    }),
    cell: cell.custom<Gene, any>(
      (
        attributes: Array<{
          pmid: number;
          description: string;
          attribute_name: string;
        }>,
      ) => {
        if (!attributes || attributes.length === 0) return null;

        return (
          <div>
            {attributes.map((attribute, index) => (
              <div key={index}>
                <div>{attribute.attribute_name}</div>

                {attribute.description && <div>{attribute.description}</div>}

                {attribute.pmid && (
                  <div>
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${attribute.pmid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PubMed: {attribute.pmid}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      },
    ),
  }),
];

export const geneCancerHallmarksGroup = col.group(
  "cancer-hallmarks",
  "Cancer Hallmarks",
  geneCancerHallmarksColumns,
);
