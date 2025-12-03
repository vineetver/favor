import React from "react";
import { cn } from "@/lib/utils";

export type CategoryItem = {
    label: string;
    pattern: RegExp | string;
    color: string;
    description: string;
};

export const renderCategoryDescription = (
    intro: React.ReactNode,
    items: CategoryItem[],
) => {
    return (
        <div className="space-y-2 text-left">
            <div>{intro}</div>
            <div className="space-y-1 text-xs">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span
                            className={cn("w-3 h-3 rounded", `bg-${item.color}-300`)}
                        ></span>
                        <strong>{item.label}:</strong> {item.description}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const getBadgeColorMap = (
    items: CategoryItem[],
): Array<[string | RegExp, string]> => {
    return items.map((item) => [item.pattern, item.color]);
};
