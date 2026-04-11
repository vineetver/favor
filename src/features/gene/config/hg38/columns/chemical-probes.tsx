import type { Gene } from "@features/gene/types";
import { cell, createColumns, tooltip } from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneChemicalProbesColumns = [
  col.accessor("chemical_probes", {
    accessor: (row) => row.opentargets?.chemical_probes,
    header: "Chemical Probes",
    description: tooltip({
      title: "Chemical Probes",
      description:
        "High-quality chemical probes for target validation from Probes & Drugs and Probe Miner.",
    }),
    cell: cell.custom<Gene, any>(
      (
        probes: Array<{
          targetFromSourceId: string;
          id: string;
          drugId: string;
          mechanismOfAction: string[];
          origin: string[];
          control: string;
          isHighQuality: boolean;
          probesDrugsScore: number;
          probeMinerScore: number;
          scoreInCells: number;
          scoreInOrganisms: number;
          urls: Array<{ niceName: string; url: string }>;
        }>,
      ) => {
        if (!probes || probes.length === 0) return null;

        return (
          <div>
            {probes.map((probe, index) => (
              <div key={index}>
                <div>
                  {probe.id || probe.drugId}
                  {probe.isHighQuality && " (High Quality)"}
                </div>

                {probe.mechanismOfAction &&
                  probe.mechanismOfAction.length > 0 && (
                    <div>
                      Mechanism of Action: {probe.mechanismOfAction.join(", ")}
                    </div>
                  )}

                {probe.origin && probe.origin.length > 0 && (
                  <div>Origin: {probe.origin.join(", ")}</div>
                )}

                {probe.control && <div>Control: {probe.control}</div>}

                <div>
                  {typeof probe.probesDrugsScore === "number" && (
                    <div>
                      Probes & Drugs Score: {probe.probesDrugsScore.toFixed(2)}
                    </div>
                  )}
                  {typeof probe.probeMinerScore === "number" && (
                    <div>
                      Probe Miner Score: {probe.probeMinerScore.toFixed(2)}
                    </div>
                  )}
                  {typeof probe.scoreInCells === "number" && (
                    <div>Score in Cells: {probe.scoreInCells.toFixed(2)}</div>
                  )}
                  {typeof probe.scoreInOrganisms === "number" && (
                    <div>
                      Score in Organisms: {probe.scoreInOrganisms.toFixed(2)}
                    </div>
                  )}
                </div>

                {probe.urls && probe.urls.length > 0 && (
                  <div>
                    Links:
                    <ul>
                      {probe.urls.map((urlObj, urlIndex) => (
                        <li key={urlIndex}>
                          <a
                            href={urlObj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {urlObj.niceName}
                          </a>
                        </li>
                      ))}
                    </ul>
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

export const geneChemicalProbesGroup = col.group(
  "chemical-probes",
  "Chemical Probes",
  geneChemicalProbesColumns,
);
