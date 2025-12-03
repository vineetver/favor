import { createColumnHelper } from "@/lib/data-display/builder";
import type { Variant } from "../../../types/types";

const helper = createColumnHelper<Variant>();

export const chromatinStateConfig = helper.group(
  "chromatin-states",
  "Chromatin State",
  [
    helper.accessor("chmm_e1", {
      header: "TssA (Active TSS)",
      description:
        "TssA (Active TSS): Number of cell types (out of 48) where this region is in the Active Transcription Start Site chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg className="h-2 w-2 mr-2 fill-red-500" viewBox="0 0 6 6">
            <title>TssA(Active TSS) </title>
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
    helper.accessor("chmm_e2", {
      header: "PromU (Promoter Upstream TSS)",
      description:
        "PromU (Promoter Upstream TSS): Number of cell types (out of 48) where this region is in the Promoter Upstream TSS chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg
            className="h-2 w-2 mr-2 fill-amber-500"
            viewBox="0 0 6 6"
            aria-hidden="true"
          >
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
    helper.accessor("chmm_e3", {
      header: "PromD1 (Promoter Downstream TSS with Dnase)",
      description:
        "PromD1 (Promoter Downstream TSS with DNase): Number of cell types (out of 48) where this region is in the Promoter Downstream TSS with DNase chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg
            className="h-2 w-2 mr-2 fill-amber-500"
            viewBox="0 0 6 6"
            aria-hidden="true"
          >
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
    helper.accessor("chmm_e4", {
      header: "PromD2 (Promoter Downstream TSS)",
      description:
        "PromD2 (Promoter Downstream TSS): Number of cell types (out of 48) where this region is in the Promoter Downstream TSS chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg
            className="h-2 w-2 mr-2 fill-amber-500"
            viewBox="0 0 6 6"
            aria-hidden="true"
          >
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
    helper.accessor("chmm_e5", {
      header: `Tx5' (Transcription 5')`,
      description:
        "Tx5' (Transcription 5'): Number of cell types (out of 48) where this region is in the Transcription 5' chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg
            className="h-2 w-2 mr-2 fill-green-500"
            viewBox="0 0 6 6"
            aria-hidden="true"
          >
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
    helper.accessor("chmm_e6", {
      header: `Tx (Transcription)`,
      description:
        "Tx (Transcription): Number of cell types (out of 48) where this region is in the Transcription chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg
            className="h-2 w-2 mr-2 fill-green-500"
            viewBox="0 0 6 6"
            aria-hidden="true"
          >
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
    helper.accessor("chmm_e7", {
      header: `Tx3' (Transcription 3')`,
      description:
        "Tx3' (Transcription 3'): Number of cell types (out of 48) where this region is in the Transcription 3' chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg
            className="h-2 w-2 mr-2 fill-green-500"
            viewBox="0 0 6 6"
            aria-hidden="true"
          >
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
    helper.accessor("chmm_e8", {
      header: "TxWk (Transcription Weak)",
      description:
        "TxWk (Transcription Weak): Number of cell types (out of 48) where this region is in the Transcription Weak chromatin state. (default: 1.92). (Ernst and Kellis, 2015)",
      cell: helper.format.custom((value) => (
        <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 font-medium ring-1 ring-inset ring-border">
          <svg
            className="h-2 w-2 mr-2 fill-green-500"
            viewBox="0 0 6 6"
            aria-hidden="true"
          >
            <circle cx={3} cy={3} r={3} />
          </svg>
          {value}
        </span>
      )),
    }),
  ],
);
