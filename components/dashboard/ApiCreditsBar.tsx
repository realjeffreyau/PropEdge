"use client";

import { useEffect, useState } from "react";
import { ZapIcon, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OddsStatus {
  creditsUsedToday: number;
  creditsRemainingLive: number | null;
  recentLogs: {
    id: string;
    sportKey: string;
    status: string;
    creditsUsed: number | null;
    startedAt: string;
    finishedAt: string | null;
  }[];
}

export function ApiCreditsBar() {
  const [status, setStatus] = useState<OddsStatus | null>(null);

  useEffect(() => {
    fetch("/api/odds/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
  }, []);

  if (!status) return null;

  const remaining = status.creditsRemainingLive;
  const usedToday = status.creditsUsedToday;
  const lastLog = status.recentLogs[0];

  const isLow = remaining !== null && remaining < 100;
  const isCritical = remaining !== null && remaining < 25;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
      {/* Credits remaining */}
      <div className="flex items-center gap-1.5">
        <ZapIcon className={cn("w-3 h-3", isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-emerald-400")} />
        <span>API Credits</span>
        {remaining !== null ? (
          <span className={cn("font-data font-semibold", isCritical ? "text-red-400" : isLow ? "text-amber-400" : "text-foreground")}>
            {remaining.toLocaleString()} remaining
          </span>
        ) : (
          <span className="text-muted-foreground/50">unknown</span>
        )}
        {isCritical && (
          <AlertTriangleIcon className="w-3 h-3 text-red-400" />
        )}
      </div>

      {/* Used today */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground/60">Used today:</span>
        <span className="font-data font-medium text-foreground">{usedToday}</span>
      </div>

      {/* Last refresh */}
      {lastLog && (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground/60">Last refresh:</span>
          <span className="font-data text-foreground">
            {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(lastLog.startedAt))}
          </span>
          <span className={cn("px-1.5 py-0.5 rounded border text-[10px] font-medium",
            lastLog.status === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          )}>
            {lastLog.status}
          </span>
          {lastLog.creditsUsed != null && (
            <span className="text-muted-foreground/50">({lastLog.creditsUsed} credits)</span>
          )}
        </div>
      )}

      {/* No refreshes yet */}
      {status.recentLogs.length === 0 && (
        <span className="text-muted-foreground/50 italic">No refreshes yet — press Refresh to load live data</span>
      )}
    </div>
  );
}
