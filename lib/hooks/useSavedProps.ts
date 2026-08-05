"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Prop } from "@/types";

export interface SavedPropRecord {
  id: string;
  propId: string;
  sportKey: string;
  note: string | null;
  snapshot: unknown;
  createdAt: string;
}

interface WatchlistResponse {
  items?: unknown;
  item?: unknown;
  error?: string;
}

function normalizeItem(value: unknown): SavedPropRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.id !== "string" ||
    typeof item.propId !== "string" ||
    typeof item.sportKey !== "string" ||
    typeof item.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: item.id,
    propId: item.propId,
    sportKey: item.sportKey,
    note: typeof item.note === "string" ? item.note : null,
    snapshot: item.snapshot,
    createdAt: item.createdAt,
  };
}

export function useSavedProps() {
  const [items, setItems] = useState<SavedPropRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingPropId, setSavingPropId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/watchlist", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as WatchlistResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            (response.status === 401
              ? "Sign in to use your watchlist."
              : "Watchlist storage is unavailable right now.")
        );
      }

      const nextItems = Array.isArray(data.items)
        ? data.items.map(normalizeItem).filter((item): item is SavedPropRecord => item !== null)
        : [];
      setItems(nextItems);
      setError(null);
    } catch (loadError) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load your watchlist.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // The hook owns a single read boundary for each mounted table/page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const savedPropIds = useMemo(() => new Set(items.map((item) => item.propId)), [items]);

  const remove = useCallback(async (propId: string) => {
    setSavingPropId(propId);
    setError(null);

    try {
      const response = await fetch(`/api/watchlist?propId=${encodeURIComponent(propId)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as WatchlistResponse;
      if (!response.ok) throw new Error(data.error ?? "Unable to update your watchlist.");
      setItems((current) => current.filter((item) => item.propId !== propId));
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to update your watchlist.");
    } finally {
      setSavingPropId(null);
    }
  }, []);

  const toggle = useCallback(
    async (prop: Prop) => {
      setSavingPropId(prop.id);
      setError(null);
      const isSaved = savedPropIds.has(prop.id);

      try {
        const response = await fetch(
          isSaved ? `/api/watchlist?propId=${encodeURIComponent(prop.id)}` : "/api/watchlist",
          {
            method: isSaved ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            ...(isSaved
              ? {}
              : {
                  body: JSON.stringify({
                    propId: prop.id,
                    sportKey: prop.sportKey,
                    snapshot: prop,
                  }),
                }),
          }
        );
        const data = (await response.json().catch(() => ({}))) as WatchlistResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to update your watchlist.");
        }

        if (isSaved) {
          setItems((current) => current.filter((item) => item.propId !== prop.id));
        } else {
          const nextItem = normalizeItem(data.item);
          if (nextItem) {
            setItems((current) => [nextItem, ...current.filter((item) => item.propId !== prop.id)]);
          } else {
            await load();
          }
        }
      } catch (toggleError) {
        setError(toggleError instanceof Error ? toggleError.message : "Unable to update your watchlist.");
      } finally {
        setSavingPropId(null);
      }
    },
    [load, savedPropIds]
  );

  return {
    items,
    savedPropIds,
    isLoading,
    savingPropId,
    error,
    load,
    remove,
    toggle,
  };
}
