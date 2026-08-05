"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { RefreshCwIcon, XIcon, ZapIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SavePropButton } from "@/components/dashboard/SavePropButton";
import { SportTabs } from "@/components/dashboard/SportTabs";
import { formatOdds } from "@/components/dashboard/PropRankTable";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { usePropsFeed } from "@/lib/hooks/usePropsFeed";
import { useSavedProps } from "@/lib/hooks/useSavedProps";
import { SPORT_LABELS } from "@/constants/sports";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function savedAtLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved time unavailable" : format(date, "MMM d, yyyy · h:mm a");
}

export default function WatchlistPage() {
  usePageTitle("Watchlist · PropEdge");

  const {
    props,
    status,
    needsRefresh,
    isLoading: isFeedLoading,
    isRefreshing,
    error: feedError,
    dismissError,
    refresh,
    sportKey,
    setSportKey,
  } = usePropsFeed();
  const {
    items,
    isLoading: isWatchlistLoading,
    savingPropId,
    error: watchlistError,
    remove,
  } = useSavedProps();
  const currentProps = useMemo(() => new Map(props.map((prop) => [prop.id, prop])), [props]);
  const sportLabel = SPORT_LABELS[sportKey] ?? sportKey;

  function handleSportChange(nextSport: string) {
    setSportKey(nextSport as typeof sportKey);
  }

  return (
    <AppShell isMockMode={status.isMockMode} lastRefreshed={status.lastRefreshed}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Watchlist</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Saved props are private to your account. Current values come from the selected loaded feed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          aria-label="Refresh odds"
          className="btn-amber-glow flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCwIcon className={isRefreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden="true" />
          {isRefreshing ? "Fetching…" : "Refresh Odds"}
        </button>
      </div>

      {feedError && (
        <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span>{feedError}</span>
          <button type="button" aria-label="Dismiss refresh error" onClick={dismissError} className="shrink-0">
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mb-5">
        <SportTabs value={sportKey} onChange={handleSportChange} />
      </div>

      {watchlistError && (
        <div className="mb-5 glass-card border-orange-500/20 p-4" role="status">
          <p className="text-sm font-medium text-orange-300">Watchlist storage is unavailable</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{watchlistError}</p>
        </div>
      )}

      {!isWatchlistLoading && !watchlistError && items.length === 0 && (
        <div className="glass-card flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
            <ZapIcon className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-foreground">No saved props yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Use the bookmark control on a prop row or its detail page to save a snapshot here.
          </p>
        </div>
      )}

      {(isWatchlistLoading || isFeedLoading) && (
        <div className="glass-card flex min-h-48 items-center justify-center p-6 text-sm text-muted-foreground" role="status" aria-busy="true">
          Loading your watchlist…
        </div>
      )}

      {!isWatchlistLoading && !watchlistError && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const current = currentProps.get(item.propId);
            const snapshot = isObject(item.snapshot) ? item.snapshot : {};
            const playerName = current?.playerName ?? stringValue(snapshot.playerName, item.propId);
            const marketLabel = current?.marketLabel ?? stringValue(snapshot.marketLabel, "Market unavailable");
            const side = current?.side ?? stringValue(snapshot.side, "Side unavailable");
            const line = current?.line ?? numberValue(snapshot.line);
            const odds = current?.bestAvailableOdds ?? numberValue(snapshot.bestAvailableOdds);
            const book = current?.bestAvailableBookLabel ?? stringValue(snapshot.bestAvailableBookLabel, "Book unavailable");
            const ev = current?.evPercent ?? numberValue(snapshot.evPercent);
            const confidence = current?.scores.confidenceScore.value ?? numberValue(
              isObject(snapshot.scores) && isObject(snapshot.scores.confidenceScore)
                ? snapshot.scores.confidenceScore.value
                : null
            );

            return (
              <article key={item.id} className="glass-card p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {current ? (
                        <Link href={`/props/${current.id}`} className="text-sm font-semibold text-foreground hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70">
                          {playerName}
                        </Link>
                      ) : (
                        <h2 className="text-sm font-semibold text-foreground">{playerName}</h2>
                      )}
                      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.sportKey}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {marketLabel} · {side} {line ?? "—"}
                      {current?.gameLabel ? ` · ${current.gameLabel}` : ""}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground/70">Saved {savedAtLabel(item.createdAt)}</p>
                  </div>
                  <div className="flex items-start justify-between gap-4 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current best odds</p>
                      <p className="font-data text-sm text-amber-400">{formatOdds(odds)}</p>
                      <p className="max-w-[9rem] truncate text-[10px] text-muted-foreground">{book}</p>
                    </div>
                    <SavePropButton
                      isSaved
                      isSaving={savingPropId === item.propId}
                      onClick={() => void remove(item.propId)}
                      playerName={playerName}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">EV%</p>
                    <p className="font-data text-sm text-foreground">{ev === null ? "—" : `${ev >= 0 ? "+" : ""}${ev.toFixed(1)}%`}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</p>
                    <p className="font-data text-sm text-foreground">{confidence === null ? "—" : `${confidence.toFixed(0)}/100`}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    {current ? (
                      <p className="text-xs text-emerald-300">Current values available in the loaded feed.</p>
                    ) : (
                      <p className="text-xs text-orange-300">No longer in the current loaded feed. Showing the saved snapshot.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isFeedLoading && needsRefresh && !watchlistError && (
        <p className="mt-5 text-xs text-muted-foreground">
          No {sportLabel} feed is loaded, so saved entries for this sport are marked against the saved snapshot until you refresh.
        </p>
      )}
    </AppShell>
  );
}
