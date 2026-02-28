import { tool } from "ai";
import { z } from "zod";
import type { ResultStore } from "../lib/result-store";
import type { ResultRef } from "../types";

/** Create getResultSlice tool — access stored data by refId */
export function createGetResultSliceTool(store: ResultStore) {
  return tool({
    description:
      "Access structured data from a prior tool call by reference ID. Use this to retrieve gene lists, variant lists, enrichment results, etc. from earlier in the conversation for chaining into new analyses.",
    inputSchema: z.object({
      refId: z.string().describe("The result reference ID (e.g., 'getRankedNeighbors_1')"),
      offset: z.number().optional().describe("Start index for array slicing (default: 0)"),
      limit: z.number().optional().describe("Max items to return (default: 50)"),
    }),
    execute: async ({ refId, offset, limit }) => {
      const data = store.getSlice(refId, offset, limit);
      if (data === undefined) {
        return { error: true, message: `No stored result with refId "${refId}". Use listResults to see available refs.` };
      }
      return data as Record<string, unknown>;
    },
  });
}

/** Create listResults tool — list all stored result refs */
export function createListResultsTool(store: ResultStore) {
  return tool({
    description:
      "List all stored result references from this conversation. Shows what data is available for chaining — gene lists, variant lists, enrichment results, etc. Each ref has a refId you can pass to getResultSlice.",
    inputSchema: z.object({}),
    execute: async (): Promise<{ results: ResultRef[] }> => {
      return { results: store.list() };
    },
  });
}
