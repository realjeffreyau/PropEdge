"use client";

import { useCallback, useMemo, useState } from "react";
import { ALL_BOOKS_KEY } from "@/constants/bookmakers";
import type { DashboardFilters, Prop } from "@/types";

export const ALL_MARKETS_KEY = "all";

export type PropFilterState = Pick<
  DashboardFilters,
  "playerSearch" | "minEv" | "minConfidence"
> & {
  marketKey: string;
};

export const DEFAULT_PROP_FILTERS: PropFilterState = {
  playerSearch: "",
  minEv: undefined,
  minConfidence: undefined,
  marketKey: ALL_MARKETS_KEY,
};

export function getActivePropFilterCount(filters: PropFilterState): number {
  return [
    Boolean(filters.playerSearch?.trim()),
    filters.minEv !== undefined,
    filters.minConfidence !== undefined,
    filters.marketKey !== ALL_MARKETS_KEY,
  ].filter(Boolean).length;
}

export function usePropFilters(props: Prop[], bookKey: string) {
  const [filters, setFilters] = useState<PropFilterState>(DEFAULT_PROP_FILTERS);

  const bookProps = useMemo(
    () =>
      bookKey === ALL_BOOKS_KEY
        ? props
        : props.filter((prop) => prop.bookOdds.some((book) => book.bookmakerKey === bookKey)),
    [bookKey, props]
  );

  const filteredProps = useMemo(() => {
    const search = filters.playerSearch?.trim().toLowerCase() ?? "";

    return bookProps.filter((prop) => {
      if (search && !prop.playerName.toLowerCase().includes(search)) return false;
      if (filters.minEv !== undefined && prop.evPercent < filters.minEv) return false;
      if (
        filters.minConfidence !== undefined &&
        prop.scores.confidenceScore.value < filters.minConfidence
      ) {
        return false;
      }
      if (filters.marketKey !== ALL_MARKETS_KEY && prop.marketKey !== filters.marketKey) {
        return false;
      }
      return true;
    });
  }, [bookProps, filters]);

  const updateFilters = useCallback((patch: Partial<PropFilterState>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_PROP_FILTERS);
  }, []);

  const activeFilterCount = getActivePropFilterCount(filters);

  return {
    filters,
    updateFilters,
    clearFilters,
    bookProps,
    filteredProps,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}
