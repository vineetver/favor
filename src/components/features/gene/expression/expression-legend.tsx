interface ExpressionLegendProps {
  scaleMode: "linear" | "log";
}

export function ExpressionLegend({ scaleMode }: ExpressionLegendProps) {
  const getHeatmapColor = (intensity: number): string => {
    if (intensity === 0) return "#f9fafb";

    let hue: number;
    let saturation: number;
    let lightness: number;

    if (intensity < 0.3) {
      hue = 200;
      saturation = Math.floor(30 + intensity * 20);
      lightness = Math.floor(92 - intensity * 30);
    } else if (intensity < 0.6) {
      hue = 220 - (intensity - 0.3) * 50;
      saturation = Math.floor(50 + intensity * 25);
      lightness = Math.floor(85 - intensity * 40);
    } else {
      hue = 280 - (intensity - 0.6) * 30;
      saturation = Math.floor(70 + intensity * 20);
      lightness = Math.floor(70 - intensity * 45);
    }

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-medium text-muted-foreground">Low</div>
      <div className="flex gap-0.5 p-1.5 bg-background rounded-md border border-border/50">
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
          <div
            key={intensity}
            className="w-4 h-4 rounded border border-border/30"
            style={{
              backgroundColor: getHeatmapColor(intensity),
            }}
          />
        ))}
      </div>
      <div className="text-xs font-medium text-muted-foreground">High</div>
    </div>
  );
}
