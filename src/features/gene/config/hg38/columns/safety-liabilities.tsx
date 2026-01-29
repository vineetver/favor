import type { Gene } from "@features/gene/types";
import {
  cell,
  createColumns,
  tooltip,
} from "@infra/table/column-builder";

const col = createColumns<Gene>();

export const geneSafetyLiabilitiesColumns = [
  col.accessor("safety_liabilities", {
    accessor: (row) => row.opentargets?.safety_liabilities,
    header: "Safety Liabilities",
    description: tooltip({
      title: "Safety Liabilities",
      description:
        "Known safety issues, adverse events, and toxicity information from various sources including clinical trials and literature.",
    }),
    cell: cell.custom<Gene, any>((liabilities: Array<{
      event: string;
      eventId: string;
      effects: Array<{ direction: string; dosing: string }>;
      biosamples: Array<{ tissueLabel: string; tissueId: string; cellLabel: string; cellFormat: string; cellId: string }>;
      datasource: string;
      literature: string;
      url: string;
      studies: Array<{ description: string; name: string; type: string }>;
    }>) => {
      if (!liabilities || liabilities.length === 0) return null;

      return (
        <div>
          {liabilities.map((liability, index) => (
            <div key={index}>
              <div>{liability.event}</div>

              {liability.eventId && (
                <div>Event ID: {liability.eventId}</div>
              )}

              {liability.effects && liability.effects.length > 0 && (
                <div>
                  Effects:
                  <ul>
                    {liability.effects.map((effect, effectIndex) => (
                      <li key={effectIndex}>
                        {effect.direction}
                        {effect.dosing && ` (${effect.dosing})`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {liability.biosamples && liability.biosamples.length > 0 && (
                <div>
                  Biosamples:
                  <ul>
                    {liability.biosamples.map((biosample, bioIndex) => (
                      <li key={bioIndex}>
                        {biosample.tissueLabel && <span>{biosample.tissueLabel}</span>}
                        {biosample.cellLabel && biosample.tissueLabel && <span> - </span>}
                        {biosample.cellLabel && <span>{biosample.cellLabel}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {liability.datasource && (
                <div>Data Source: {liability.datasource}</div>
              )}

              {liability.studies && liability.studies.length > 0 && (
                <div>
                  Studies:
                  <ul>
                    {liability.studies.map((study, studyIndex) => (
                      <li key={studyIndex}>
                        {study.name}
                        {study.type && ` (${study.type})`}
                        {study.description && (
                          <div>{study.description}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {liability.literature && (
                <div>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${liability.literature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PubMed: {liability.literature}
                  </a>
                </div>
              )}

              {liability.url && (
                <div>
                  <a
                    href={liability.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    More Information
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }),
  }),
];

export const geneSafetyLiabilitiesGroup = col.group(
  "safety-liabilities",
  "Safety Liabilities",
  geneSafetyLiabilitiesColumns,
);
