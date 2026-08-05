"use client";

import { useMemo, useState } from "react";
import { RefreshCwIcon, XIcon, ZapIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SportTabs } from "@/components/dashboard/SportTabs";
import { formatOdds } from "@/components/dashboard/PropRankTable";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { buildOddsMatrix } from "@/lib/hooks/oddsMatrix";
import { usePropsFeed } from "@/lib/hooks/usePropsFeed";
import { SPORT_LABELS } from "@/constants/sports";

export default function OddsPage() {
  usePageTitle("Odds · PropEdge");

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
  const [marketFilter, setMarketFilter] = useState("all");
  const markets = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const prop of props) byKey.set(prop.marketKey, prop.marketLabel);
    return Array.from(byKey, ([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [props]);
  const filteredProps = useMemo(
    () => (marketFilter === "all" ? props : props.filter((prop) => prop.marketKey === marketFilter)),
    [marketFilter, props]
  );
  const matrix = useMemo(() => buildOddsMatrix(filteredProps), [filteredProps]);
  const sportLabel = SPORT_LABELS[sportKey] ?? sportKey;

  function handleSportChange(nextSport: string) {
    setSportKey(nextSport as typeof sportKey);
    setMarketFilter("all");
  }

  return (
    <AppShell isMockMode={status.isMockMode} lastRefreshed={status.lastRefreshed}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Odds Comparison</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Compare the best available American price across tracked books and platforms.
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

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SportTabs value={sportKey} onChange={handleSportChange} />
        <label className="flex flex-col gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:min-w-56">
          Market
          <select
            value={marketFilter}
            onChange={(event) => setMarketFilter(event.target.value)}
            className="h-9 rounded-lg border border-border bg-muted/40 px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
          >
            <option value="all">All markets</option>
            {markets.map((market) => (
              <option key={market.key} value={market.key}>{market.label}</option>
            ))}
          </select>
        </label>
      </div>

      {!isLoading && needsRefresh && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
            <ZapIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-foreground">No data loaded yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Load {sportLabel} props to compare prices. Live refreshes use The Odds API credits.
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

      {!isLoading && !needsRefresh && matrix.rows.length === 0 && (
        <div className="glass-card flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            {props.length === 0 ? "No props are loaded" : "No props match this market"}
          </p>
          <p className="text-xs text-muted-foreground">
            {props.length === 0 ? "Refresh the feed to load a comparison matrix." : "Choose All markets or another market filter."}
          </p>
        </div>
      )}

      {!isLoading && !needsRefresh && matrix.rows.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span><span className="font-data text-foreground">{matrix.rows.length}</span> props</span>
            <span><span className="font-data text-foreground">{matrix.books.length}</span> books/platforms</span>
            <span className="text-amber-400">Best price is highlighted · muted cells use a different line</span>
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <div className="max-h-[min(70vh,48rem)] overflow-auto">
              <table className="min-w-[760px] w-full border-collapse text-sm" aria-label="Cross-book odds comparison matrix">
                <thead>
                  <tr className="border-b border-border bg-[#12121A]">
                    <th className="sticky left-0 top-0 z-30 min-w-[230px] bg-[#12121A] px-3 py-3 text-left text-xs font-medium text-muted-foreground shadow-[4px_0_8px_-8px_rgba(0,0,0,0.9)]">
                      Prop
                    </th>
                    {matrix.books.map((book) => (
                      <th key={book.bookmakerKey} className="sticky top-0 z-20 min-w-[96px] bg-[#12121A] px-3 py-3 text-right text-xs font-medium text-muted-foreground">
                        <span className="block">{book.bookmakerLabel}</span>
                        <span className="text-[10px] font-normal text-muted-foreground/60">{book.bookmakerType === "DFS" ? "Platform" : "Sportsbook"}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((row) => (
                    <tr key={row.key} className="border-b border-border/70 transition-colors last:border-0 hover:bg-white/[0.02]">
                      <th scope="row" className="sticky left-0 z-10 min-w-[230px] bg-[#12121A] px-3 py-3 text-left shadow-[4px_0_8px_-8px_rgba(0,0,0,0.9)]">
                        <a href={`/props/${row.prop.id}`} className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70">
                          <span className="block text-sm font-medium text-foreground group-hover:text-amber-400">{row.prop.playerName}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {row.prop.marketLabel} · {row.prop.side} {row.prop.line}
                            {row.prop.isAltLine && <span className="ml-1 text-amber-400">(alt)</span>}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground/70">{row.prop.gameLabel}</span>
                        </a>
                      </th>
                      {matrix.books.map((book) => {
                        const cell = row.cells[book.bookmakerKey];
                        return (
                          <td
                            key={book.bookmakerKey}
                            className={`px-3 py-3 text-right ${cell.lineDiffers ? "bg-white/[0.02] opacity-50" : ""} ${cell.isBest ? "bg-emerald-500/10" : ""}`}
                            title={cell.lineDiffers ? `Different line: ${cell.line ?? "—"} (row line ${row.prop.line})` : undefined}
                          >
                            {cell.oddsAmerican === null ? (
                              <span className="font-data text-muted-foreground/50">—</span>
                            ) : (
                              <span className={cell.isBest ? "font-data font-semibold text-emerald-300" : "font-data text-foreground"}>
                                {formatOdds(cell.oddsAmerican)}
                                {cell.lineDiffers && <span className="ml-1 text-[10px] text-orange-300">· {cell.line}</span>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {matrix.rows.map((row) => (
              <article key={row.key} className="glass-card p-4">
                <a href={`/props/${row.prop.id}`} className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground group-hover:text-amber-400">{row.prop.playerName}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">{row.prop.marketLabel} · {row.prop.side} {row.prop.line}</p>
                    </div>
                    {row.prop.isAltLine && <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">Alt line</span>}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{row.prop.gameLabel}</p>
                </a>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/70 pt-3">
                  {matrix.books.map((book) => {
                    const cell = row.cells[book.bookmakerKey];
                    return (
                      <div key={book.bookmakerKey} className={`flex items-center justify-between gap-2 rounded-md border border-border/60 px-2.5 py-2 ${cell.lineDiffers ? "opacity-50" : ""} ${cell.isBest ? "border-emerald-500/30 bg-emerald-500/10" : "bg-muted/20"}`}>
                        <span className="truncate text-[11px] text-muted-foreground">{book.bookmakerLabel}</span>
                        <span className={cell.isBest ? "font-data text-xs font-semibold text-emerald-300" : "font-data text-xs text-foreground"}>
                          {cell.oddsAmerican === null ? "—" : formatOdds(cell.oddsAmerican)}
                          {cell.lineDiffers && <span className="ml-1 text-[10px] text-orange-300">({cell.line})</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
