"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCallback, useMemo, memo } from "react";

interface DistanceSliderProps {
  searchDistance: number[];
  onDistanceChange: (distance: number[]) => void;
}

const DistanceSliderImpl = ({
  searchDistance,
  onDistanceChange,
}: DistanceSliderProps) => {
  const formatDistance = useCallback((distance: number) => {
    if (distance >= 1000000) {
      return `${(distance / 1000000).toFixed(1)}Mb`;
    }
    if (distance >= 1000) {
      return `${(distance / 1000).toFixed(0)}kb`;
    }
    return `${distance}bp`;
  }, []);

  const distanceOptions = useMemo(() => [0, 1000, 5000, 10000], []);

  const handleQuickSelect = useCallback((distance: number) => {
    onDistanceChange([distance]);
  }, [onDistanceChange]);

  const formattedCurrentDistance = useMemo(() => 
    formatDistance(searchDistance[0]),
    [searchDistance, formatDistance]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Search Distance
          <Badge variant="secondary" className="ml-2 font-mono">
            {formattedCurrentDistance}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="relative">
            <Slider
              value={searchDistance}
              onValueChange={onDistanceChange}
              min={0}
              max={20000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>0bp</span>
              <span>5kb</span>
              <span>10kb</span>
              <span>20kb</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {distanceOptions.map((distance) => (
              <Button
                key={distance}
                onClick={() => handleQuickSelect(distance)}
                variant={searchDistance[0] === distance ? "default" : "outline"}
                size="sm"
                className="text-xs h-8"
              >
                {formatDistance(distance)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const DistanceSlider = memo(DistanceSliderImpl);
