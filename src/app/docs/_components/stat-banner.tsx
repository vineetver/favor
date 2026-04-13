"use client";

import { cn } from "@infra/utils";
import { motion } from "motion/react";

interface Stat {
  value: string;
  label: string;
  detail?: string;
}

export function StatBanner({ stats }: { stats: Stat[] }) {
  return (
    <div className="bg-muted rounded-2xl p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 sm:gap-0">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className={cn(
              "flex-1 text-center px-2 sm:px-4",
              i > 0 && "sm:border-l sm:border-border",
            )}
          >
            <p className="text-stat-value !text-3xl sm:!text-4xl md:!text-5xl">
              {stat.value}
            </p>
            <p className="text-stat-label mt-1">{stat.label}</p>
            {stat.detail && (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {stat.detail}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
