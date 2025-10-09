"use client";

import { Chart } from "@/components/ui/chart";
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
  const isChart = output?.type === 'chart' && output?.chartType === 'bar';

  return (
    <>
      <Tool defaultOpen={false}>
        <ToolHeader type="tool-barChart" state={state} />
        <ToolContent>
          {input && <ToolInput input={input} />}
        </ToolContent>
      </Tool>
      {isChart && state === 'output-available' && (
        <div className="my-1 w-full max-w-full overflow-hidden">
          <Chart
            data={output.data}
            series={output.series}
            xAxis={output.xAxis}
            yAxisLabel={output.yAxisLabel}
            title={output.config?.title}
            height={output.config?.height}
            showYAxis={output.config?.showYAxis}
            barGap={output.config?.barGap}
            barCategoryGap={output.config?.barCategoryGap}
            className="w-full"
          />
          <details className="mt-1">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              View Chart Data
            </summary>
            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
              <div className="font-mono">
                <div className="mb-1">
                  <strong>Data Points:</strong> {output.data?.length || 0}
                </div>
                <details>
                  <summary className="cursor-pointer">Raw Data</summary>
                  <pre className="mt-1 overflow-x-auto">
                    {JSON.stringify(output, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </details>
        </div>
      )}
    </>
  );
}
