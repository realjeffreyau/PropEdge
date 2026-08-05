"use client";

import { useState } from "react";
import { RefreshCwIcon, XIcon, ZapIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SportTabs } from "@/components/dashboard/SportTabs";
import { BookTabs } from "@/components/dashboard/BookTabs";
import { PropFilterBar } from "@/components/dashboard/PropFilterBar";
import { PropRankTable } from "@/components/dashboard/PropRankTable";
import { ApiCreditsBar } from "@/components/dashboard/ApiCreditsBar";
import { ALL_BOOKS_KEY } from "@/constants/bookmakers";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { usePropFilters } from "@/lib/hooks/usePropFilters";
import { usePropsFeed } from "@/lib/hooks/usePropsFeed";

export default function DashboardPage() {
  usePageTitle("Dashboard · PropEdge");

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
  const [creditsKey, setCreditsKey] = useState(0);
  const {
    filters,
    updateFilters,
    clearFilters,
    bookProps,
    filteredProps,
    activeFilterCount,
    hasActiveFilters,
  } = usePropFilters(props, bookKey);

  const totalBooks = new Set(props.flatMap((prop) => prop.bookOdds.map((book) => book.bookmakerKey))).size;
  const sportLabel = sportKey === "basketball_nba" ? "NBA" : "WNBA";

  async function handleRefresh() {
    if (await refresh()) setCreditsKey((key) => key + 1);
  }

  function handleSportChange(nextSport: string) {
    setSportKey(nextSport as typeof sportKey);
    setBookKey(ALL_BOOKS_KEY);
    clearFilters();
  }

  return (
    <AppShell isMockMode={status.isMockMode} lastRefreshed={status.lastRefreshed}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Top-ranked player props by confidence score
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Refresh odds"
          className="btn-amber-glow flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

      {!status.isMockMode && (
        <div className="mb-5">
          <ApiCreditsBar key={creditsKey} />
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3">
        <SportTabs value={sportKey} onChange={handleSportChange} />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Book / Platform
          </p>
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

      {!isLoading && !needsRefresh && props.length > 0 && (
        <div className="mb-4 flex items-center gap-5 text-xs text-muted-foreground">
          <span>
            <span className="font-data font-medium text-foreground">{filteredProps.length}</span>{" "}
            props{bookKey !== ALL_BOOKS_KEY && " at this book"}
          </span>
          {totalBooks > 0 && (
            <span>
              <span className="font-data font-medium text-foreground">{totalBooks}</span> books tracked
            </span>
          )}
          <span className="font-medium text-amber-400">
            {sportLabel} · {bookKey === ALL_BOOKS_KEY ? "All Books" : bookKey}
          </span>
        </div>
      )}

      {!isLoading && needsRefresh && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
            <ZapIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">No data loaded yet</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Press <span className="font-medium text-amber-400">Refresh Odds</span> to pull live{" "}
              {sportLabel} props from The Odds API. This uses API credits.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-amber-glow flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-medium text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            {isRefreshing ? "Fetching live odds…" : `Load ${sportLabel} Props`}
          </button>
        </div>
      )}

      {!needsRefresh && (
        <PropRankTable
          props={filteredProps}
          selectedBookKey={bookKey}
          isLoading={isLoading}
          emptyState={hasActiveFilters && bookProps.length > 0 ? "filtered" : "selection"}
        />
      )}

      {!needsRefresh && !isLoading && filteredProps.length > 0 && (
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground/50">
          All probabilities are market-derived estimates, not guaranteed outcomes. EV and edge
          calculations are based on no-vig consensus and selected book odds. This is an analytics
          tool — not financial or betting advice.
        </p>
      )}
    </AppShell>
  );
}
