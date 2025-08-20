"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/general";

interface StatCardProps {
  label: string;
  value: number;
  status: "high" | "medium" | "low" | "none";
  subtitle?: string;
}

export function StatCard({ label, value, status, subtitle }: StatCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getValueColor = (status: string) => {
    switch (status) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-400";
    }
  };

  return (
    <Card className="border-l-4 border-l-current">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          <Badge
            className={cn("text-xs", getStatusColor(status))}
            variant="outline"
          >
            {status}
          </Badge>
        </div>
        <div className={cn("text-2xl font-bold", getValueColor(status))}>
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardsGridProps {
  cards: StatCardProps[];
}

export function StatCardsGrid({ cards }: StatCardsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
}
