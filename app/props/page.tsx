"use client";

import { useState } from "react";
import { RefreshCwIcon, XIcon, ZapIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SportTabs } from "@/components/dashboard/SportTabs";
import { BookTabs } from "@/components/dashboard/BookTabs";
import { PropFilterBar } from "@/components/dashboard/PropFilterBar";
import { PropRankTable } from "@/components/dashboard/PropRankTable";
import { ALL_BOOKS_KEY } from "@/constants/bookmakers";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { usePropFilters } from "@/lib/hooks/usePropFilters";
import { usePropsFeed } from "@/lib/hooks/usePropsFeed";

export default function PropsPage() {
  usePageTitle("Player Props · PropEdge");

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
  const [bookKey, setBookKey] = useState(ALL_BOOKS_KEY);
  const {
    filters,
    updateFilters,
    clearFilters,
    bookProps,
    filteredProps,
    activeFilterCount,
    hasActiveFilters,
  } = usePropFilters(props, bookKey);

  async function handleRefresh() {
    await refresh();
  }

  function handleSportChange(nextSport: string) {
    setSportKey(nextSport as typeof sportKey);
    setBookKey(ALL_BOOKS_KEY);
    clearFilters();
  }

  return (
    <AppShell isMockMode={status.isMockMode} lastRefreshed={status.lastRefreshed}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Player Props</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">All available props ranked by confidence</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh odds"
          className="btn-amber-glow flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCwIcon className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
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

      <div className="mb-6 flex flex-col gap-3">
        <SportTabs value={sportKey} onChange={handleSportChange} />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Book / Platform</p>
          <BookTabs value={bookKey} onChange={setBookKey} />
        </div>
      </div>

      {!needsRefresh && (
        <PropFilterBar
          filters={filters}
          activeFilterCount={activeFilterCount}
          onChange={updateFilters}
          onClear={clearFilters}
        />
      )}

      {!isLoading && needsRefresh ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
            <ZapIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">No data loaded yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Press <span className="font-medium text-amber-400">Refresh Odds</span> to load live props.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-amber-glow flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {isRefreshing ? "Fetching…" : "Load Props"}
          </button>
        </div>
      ) : (
        <PropRankTable
          props={filteredProps}
          selectedBookKey={bookKey}
          isLoading={isLoading}
          emptyState={hasActiveFilters && bookProps.length > 0 ? "filtered" : "selection"}
        />
      )}
    </AppShell>
  );
}
