import {
  isValidNumber,
  roundNumber,
  safeCellRenderer,
} from "@/lib/annotations/helpers";
import type { VariantColumnsType } from "@/lib/annotations/types";

export const variantSingleCellColumns: VariantColumnsType[] = [
  {
    name: "CV2f",
    slug: "cv2f",
    items: [
      {
        key: 1,
        header: "Cm (Overall)",
        accessor: "Cm",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "Overall Coefficient of Variation (Cm) is a general measure of the variability across all cell types.",
      },
      {
        key: 2,
        header: "CV2F",
        accessor: "Cv2f",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells. It is calculated as the standard deviation of the VAF divided by the mean VAF.",
      },
      {
        key: 3,
        header: "Liver CV2F",
        accessor: "LiverCv2f",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "Liver Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in liver cells.",
      },
      {
        key: 4,
        header: "Blood CV2F",
        accessor: "BloodCv2f",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "Blood Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in blood cells.",
      },
      {
        key: 5,
        header: "Brain CV2F",
        accessor: "BrainCv2f",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "Brain Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in brain cells.",
      },
      {
        key: 6,
        header: "GM12878 CV2F",
        accessor: "Gm12878Cv2f",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "GM12878 Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in GM12878 cells.",
      },
      {
        key: 7,
        header: "K562 CV2F",
        accessor: "K562Cv2f",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "K562 Coefficient of Variation (CV2) is a measure of the variability of the variant allele frequency (VAF) across single cells in K562 cells.",
      },
      {
        key: 8,
        header: "HepG2 CV2F",
        accessor: "HepG2CV2F",
        Cell: (value) => {
          return safeCellRenderer(
            value,
            (num) => <span>{roundNumber(num)}</span>,
            isValidNumber,
          );
        },
        tooltip:
          "HepG2 Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in HepG2 cells.",
      },
    ],
  },
];
