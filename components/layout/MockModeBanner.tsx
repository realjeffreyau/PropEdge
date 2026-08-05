"use client";

import { FlaskConicalIcon } from "lucide-react";

export function MockModeBanner() {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2 rounded-md border border-zinc-700/50 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-400">
      <FlaskConicalIcon className="w-3.5 h-3.5 shrink-0" />
      <span className="min-w-0">
        Mock Mode — add <code className="break-all font-mono text-amber-400">THE_ODDS_API_KEY</code> to .env to use live data
      </span>
    </div>
  );
}
