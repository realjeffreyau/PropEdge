"use client";

import { cn } from "@/lib/utils";
import { ACTIVE_SPORTS } from "@/constants/sports";

interface SportTabsProps {
  value: string;
  onChange: (key: string) => void;
}

export function SportTabs({ value, onChange }: SportTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border w-fit">
      {ACTIVE_SPORTS.map((sport) => (
        <button
          key={sport.key}
          onClick={() => onChange(sport.key)}
          className={cn(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
            value === sport.key
              ? "bg-amber-500 text-black shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          {sport.shortLabel}
        </button>
      ))}
    </div>
  );
}
