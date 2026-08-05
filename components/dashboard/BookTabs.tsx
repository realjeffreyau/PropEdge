"use client";

import { cn } from "@/lib/utils";
import { BOOKMAKERS, ALL_BOOKS_KEY } from "@/constants/bookmakers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BookTabsProps {
  value: string;
  onChange: (key: string) => void;
}

const ALL_OPTION = { key: ALL_BOOKS_KEY, shortLabel: "All", label: "All Books" };

export function BookTabs({ value, onChange }: BookTabsProps) {
  const activeBooks = BOOKMAKERS.filter((b) => b.active);

  return (
    <div className="w-full">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-1 pb-1">
          {[ALL_OPTION, ...activeBooks].map((book) => (
            <button
              key={book.key}
              onClick={() => onChange(book.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all border shrink-0",
                value === book.key
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-border"
              )}
            >
              {book.shortLabel}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
