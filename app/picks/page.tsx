"use client";

import { useMemo, useState } from "react";
import { RefreshCwIcon, XIcon, ZapIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PropRankTable } from "@/components/dashboard/PropRankTable";
import { SportTabs } from "@/components/dashboard/SportTabs";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { selectAndGroupPicks } from "@/lib/hooks/pickSelectors";
import { usePropsFeed } from "@/lib/hooks/usePropsFeed";
import { SPORT_LABELS } from "@/constants/sports";

const DEFAULT_CONFIDENCE = 70;

export default function PicksPage() {
  usePageTitle("Picks · PropEdge");

  const {
    props,
    status,
    needsRefresh,
    isLoading,
    isRefreshing,
    error,
    dismissError,
    refresh,
    sportKey,
    setSportKey,
  } = usePropsFeed();
  const [minConfidence, setMinConfidence] = useState(DEFAULT_CONFIDENCE);
  const groups = useMemo(
    () => selectAndGroupPicks(props, minConfidence),
    [minConfidence, props]
  );
  const sportLabel = SPORT_LABELS[sportKey] ?? sportKey;

  function handleSportChange(nextSport: string) {
    setSportKey(nextSport as typeof sportKey);
  }

  return (
    <AppShell isMockMode={status.isMockMode} lastRefreshed={status.lastRefreshed}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Highest-Conviction Picks</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Positive-EV props ranked by confidence and grouped by game.
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

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss refresh error"
            onClick={dismissError}
            className="shrink-0 text-red-400/80 hover:text-red-300"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4">
        <SportTabs value={sportKey} onChange={handleSportChange} />
        <div className="glass-card flex flex-col gap-2 p-4 sm:max-w-xl">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="picks-confidence" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Minimum confidence
            </label>
            <span className="font-data text-sm text-amber-400">{minConfidence}/100</span>
          </div>
          <input
            id="picks-confidence"
            type="range"
            min="0"
            max="100"
            step="1"
            value={minConfidence}
            onChange={(event) => setMinConfidence(Number(event.target.value))}
            className="accent-amber-500"
          />
          <p className="text-xs text-muted-foreground">
            Only positive EV props at or above this confidence score are included.
          </p>
        </div>
      </div>

      {!isLoading && needsRefresh && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
            <ZapIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">No data loaded yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Load {sportLabel} props to build the picks list. Live refreshes use The Odds API credits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            className="btn-amber-glow flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-amber-400 disabled:opacity-50"
          >
            <RefreshCwIcon className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
            {isRefreshing ? "Fetching…" : "Load Props"}
          </button>
        </div>
      )}

      {!isLoading && !needsRefresh && groups.length === 0 && (
        <div className="glass-card flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm font-medium text-foreground">No picks clear the threshold</p>
          <p className="max-w-md text-xs text-muted-foreground">
            {props.length === 0
              ? `The ${sportLabel} feed is loaded but contains no props right now.`
              : `No loaded props have positive EV and at least ${minConfidence} confidence. Lower the threshold to broaden the list.`}
          </p>
        </div>
      )}

      {!isLoading && !needsRefresh && groups.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-data font-medium text-foreground">
                {groups.reduce((count, group) => count + group.props.length, 0)}
              </span>{" "}
              qualifying props
            </span>
            <span className="text-amber-400">{sportLabel} · {minConfidence}+ confidence</span>
          </div>

          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-display font-semibold text-foreground">{group.gameLabel}</h2>
                <p className="text-xs text-muted-foreground">
                  {group.props.length} pick{group.props.length === 1 ? "" : "s"}
                </p>
              </div>
              <PropRankTable
                props={group.props}
                selectedBookKey="all"
                showStake
                emptyState="filtered"
              />
            </section>
          ))}
        </div>
      )}

      {!isLoading && !needsRefresh && groups.length > 0 && (
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground/50">
          Picks are market-derived analytics, not guarantees or betting advice. Kelly fractions are sizing references only.
        </p>
      )}
    </AppShell>
  );
}
