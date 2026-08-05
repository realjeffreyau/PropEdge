"use client";

import { BookmarkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavePropButtonProps {
  isSaved: boolean;
  isSaving?: boolean;
  onClick: () => void;
  playerName?: string;
}

export function SavePropButton({
  isSaved,
  isSaving = false,
  onClick,
  playerName = "prop",
}: SavePropButtonProps) {
  const action = isSaved ? "Remove from watchlist" : "Save to watchlist";

  return (
    <button
      type="button"
      aria-label={`${action}: ${playerName}`}
      aria-pressed={isSaved}
      title={action}
      disabled={isSaving}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70",
        isSaved
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          : "border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-400",
        isSaving && "cursor-wait opacity-50"
      )}
    >
      <BookmarkIcon className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
      <span className="sr-only">{action}</span>
    </button>
  );
}
