"use client";

import { useCallback, useEffect, useState } from "react";
import type { DataSourceStatus, Prop, SportKey } from "@/types";

const DEFAULT_SPORT: SportKey = "basketball_nba";
const DEFAULT_STATUS: DataSourceStatus = { isMockMode: false, lastRefreshed: null };

interface PropsResponse {
  props?: unknown;
  status?: DataSourceStatus;
  needsRefresh?: boolean;
  error?: string;
}

export function usePropsFeed() {
  const [sportKey, setSportKey] = useState<SportKey>(DEFAULT_SPORT);
  const [props, setProps] = useState<Prop[]>([]);
  const [status, setStatus] = useState<DataSourceStatus>(DEFAULT_STATUS);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback(async (sport: SportKey): Promise<boolean> => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/props?sport=${encodeURIComponent(sport)}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as PropsResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load props.");
      }

      setProps(Array.isArray(data.props) ? (data.props as Prop[]) : []);
      setStatus(data.status ?? DEFAULT_STATUS);
      setNeedsRefresh(Boolean(data.needsRefresh));
      return true;
    } catch {
      setProps([]);
      setNeedsRefresh(true);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading the cache is the hook's external data synchronization boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFromCache(sportKey);
  }, [loadFromCache, sportKey]);

  const refresh = useCallback(async (): Promise<boolean> => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/odds/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport: sportKey }),
      });
      const data = (await response.json().catch(() => ({}))) as PropsResponse;

      if (!response.ok) {
        const serverError = data.error ?? "Unable to refresh odds right now. Please try again.";
        setError(
          response.status === 403
            ? `Your account can't refresh odds. ${serverError}`
            : serverError
        );
        return false;
      }

      const loaded = await loadFromCache(sportKey);
      if (!loaded) {
        setError("Odds refreshed, but the updated props could not be loaded.");
      }
      return loaded;
    } catch {
      setError("Unable to refresh odds right now. Please try again.");
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [loadFromCache, sportKey]);

  const dismissError = useCallback(() => setError(null), []);

  return {
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
  };
}
