"use client";

import { EyeIcon } from "lucide-react";

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
      <EyeIcon className="w-3.5 h-3.5 shrink-0" />
      Read-only view
    </div>
  );
}
