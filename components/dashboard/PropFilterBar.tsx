"use client";

import { useEffect, useState } from "react";
import { FilterIcon, SearchIcon, XIcon } from "lucide-react";
import { ACTIVE_PROP_MARKETS } from "@/constants/propMarkets";
import {
  ALL_MARKETS_KEY,
  type PropFilterState,
} from "@/lib/hooks/usePropFilters";

interface PropFilterBarProps {
  filters: PropFilterState;
  activeFilterCount: number;
  onChange: (patch: Partial<PropFilterState>) => void;
  onClear: () => void;
}

const inputClassName =
  "h-9 w-full rounded-lg border border-border bg-muted/50 px-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-amber-500/60 focus-visible:ring-2 focus-visible:ring-amber-500/30";

export function PropFilterBar({
  filters,
  activeFilterCount,
  onChange,
  onClear,
}: PropFilterBarProps) {
  const [searchValue, setSearchValue] = useState(filters.playerSearch ?? "");

  useEffect(() => {
    // Keep the local draft in sync when the parent clears filters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchValue(filters.playerSearch ?? "");
  }, [filters.playerSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onChange({ playerSearch: searchValue });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [onChange, searchValue]);

  return (
    <section
      aria-label="Filter props"
      className="glass-card mb-5 p-3"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilterIcon className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Filter props
          </h2>
          <span
            className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400"
            aria-live="polite"
          >
            {activeFilterCount} active
          </span>
        </div>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="h-3 w-3" aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Player name</span>
          <span className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search players"
              aria-label="Search by player name"
              className={`${inputClassName} pl-8`}
            />
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Minimum EV%</span>
          <select
            value={filters.minEv ?? ""}
            onChange={(event) =>
              onChange({
                minEv: event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
            aria-label="Minimum EV percentage"
            className={inputClassName}
          >
            <option value="">Any EV%</option>
            <option value="0">0% or higher</option>
            <option value="3">3% or higher</option>
            <option value="5">5% or higher</option>
            <option value="10">10% or higher</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Minimum confidence</span>
          <select
            value={filters.minConfidence ?? ""}
            onChange={(event) =>
              onChange({
                minConfidence:
                  event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
            aria-label="Minimum confidence score"
            className={inputClassName}
          >
            <option value="">Any confidence</option>
            <option value="55">55 or higher</option>
            <option value="75">75 or higher</option>
            <option value="85">85 or higher</option>
            <option value="90">90 or higher</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Market</span>
          <select
            value={filters.marketKey}
            onChange={(event) => onChange({ marketKey: event.target.value })}
            aria-label="Filter by market"
            className={inputClassName}
          >
            <option value={ALL_MARKETS_KEY}>All markets</option>
            {ACTIVE_PROP_MARKETS.map((market) => (
              <option key={market.key} value={market.key}>
                {market.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
