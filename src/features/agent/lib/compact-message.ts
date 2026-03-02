import { isToolUIPart, getToolName, type UIMessage } from "ai";
import { agentFetch } from "./api-client";

const SIZE_THRESHOLD = 2_000; // bytes — skip compaction for small outputs

export interface ArtifactRef {
  _artifact_ref: number;
  text_summary: string;
  state_delta: unknown;
  preview: unknown; // compact preview for ActivityTimeline
}

export function isArtifactRef(output: unknown): output is ArtifactRef {
  return (
    typeof output === "object" &&
    output !== null &&
    "_artifact_ref" in output
  );
}

export async function compactMessageForStorage(
  sessionId: string,
  msg: UIMessage,
): Promise<UIMessage> {
  const parts = await Promise.all(
    msg.parts.map(async (part) => {
      if (!isToolUIPart(part)) return part;
      if (part.state !== "output-available") return part;

      const output = part.output as Record<string, unknown>;
      if (output.error) return part; // errors stay inline

      const raw = JSON.stringify(output);
      if (raw.length < SIZE_THRESHOLD) return part;

      const toolName = getToolName(part);
      const toolCallId =
        (part as Record<string, unknown>).toolCallId as string | undefined;

      // Store full output as artifact
      const artifact = await agentFetch<{ id: number }>(
        `/agent/sessions/${sessionId}/artifacts`,
        {
          method: "POST",
          body: {
            type: "tool_output",
            data: output,
            metadata: {
              toolName,
              toolCallId: toolCallId ?? "",
              summary:
                typeof output.text_summary === "string"
                  ? output.text_summary
                  : "",
              sizeBytes: raw.length,
            },
          },
        },
      );

      // Replace output with pointer
      const ref: ArtifactRef = {
        _artifact_ref: artifact.id,
        text_summary:
          typeof output.text_summary === "string" ? output.text_summary : "",
        state_delta: output.state_delta ?? {},
        preview: buildPreview(toolName, output),
      };

      return { ...part, output: ref };
    }),
  );

  return { ...msg, parts };
}

function buildPreview(
  toolName: string,
  output: Record<string, unknown>,
): unknown {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return {};

  // Enough for ActivityTimeline to render a summary line
  if (toolName === "Run") {
    const cmd =
      (output as { command?: string }).command ?? data.command;
    return {
      command: cmd,
      total:
        data.total ?? data.total_ranked ?? data.total_scored ?? data.total_groups,
      columns:
        Array.isArray(data.rows) && data.rows.length > 0
          ? Object.keys(data.rows[0] as Record<string, unknown>)
          : undefined,
    };
  }

  return {};
}
