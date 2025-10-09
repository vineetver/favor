"use client";

import { ChartRenderer } from "./chart-renderer";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
} from "@/components/ai-elements/tool";

type ToolBarChartProps = {
  toolCallId: string;
  state: "output-available" | "input-streaming" | "input-available" | "output-error";
  input?: any;
  output?: any;
};

export function ToolBarChart({ toolCallId, state, input, output }: ToolBarChartProps) {
  const isChart = output?.type === 'chart';

  return (
    <>
      <Tool defaultOpen={false}>
        <ToolHeader type="tool-barChart" state={state} />
        <ToolContent>
          {input && <ToolInput input={input} />}
        </ToolContent>
      </Tool>
      {isChart && state === 'output-available' && (
        <ChartRenderer
          type={output.type}
          chartType={output.chartType}
          data={output.data}
          config={output.config}
          metadata={output.metadata}
        />
      )}
    </>
  );
}
