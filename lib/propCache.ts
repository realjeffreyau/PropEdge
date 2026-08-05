import { SPORTS } from "@/constants/sports";
import type { Prop } from "@/types";

export interface PropCacheReadResult {
  props: Prop[];
  fetchedAt: Date | null;
  needsRefresh: boolean;
}

interface MemorySnapshot {
  props: Prop[];
  fetchedAt: Date;
}

interface DatabaseSnapshot {
  fetchedAt: Date | string;
  payload: unknown;
}

interface SnapshotDelegate {
  findFirst(args: {
    where: { sportKey: string };
    orderBy: { fetchedAt: "desc" };
  }): Promise<DatabaseSnapshot | null>;
  create(args: {
    data: {
      sportKey: string;
      fetchedAt: Date;
      propCount: number;
      payload: unknown;
    };
  }): Promise<unknown>;
}

const memoryCache = new Map<string, MemorySnapshot>();

/**
 * Read the newest feed snapshot, using the process-local cache first.
 * Prisma is loaded lazily so a missing or unavailable database cannot prevent
 * the odds feed from serving data already held in memory.
 */
export async function readPropCache(sportKey: string): Promise<PropCacheReadResult> {
  const memorySnapshot = memoryCache.get(sportKey);
  if (memorySnapshot) {
    return {
      props: memorySnapshot.props,
      fetchedAt: memorySnapshot.fetchedAt,
      needsRefresh: false,
    };
  }

  const delegate = await getSnapshotDelegate();
  if (!delegate) return emptyCacheResult();

  try {
    const snapshot = await delegate.findFirst({
      where: { sportKey },
      orderBy: { fetchedAt: "desc" },
    });

    if (!snapshot || !Array.isArray(snapshot.payload)) {
      return emptyCacheResult();
    }

    const fetchedAt = toDate(snapshot.fetchedAt);
    if (!fetchedAt) {
      console.warn(`[propCache] Ignoring invalid fetchedAt for ${sportKey}.`);
      return emptyCacheResult();
    }

    const props = snapshot.payload as Prop[];
    memoryCache.set(sportKey, { props, fetchedAt });
    return { props, fetchedAt, needsRefresh: false };
  } catch (error) {
    console.warn(`[propCache] Could not read the persistent snapshot for ${sportKey}; using memory only.`, error);
    return emptyCacheResult();
  }
}

/**
 * Write a feed snapshot to memory immediately and best-effort to Prisma.
 * A database failure never rejects the refresh because memory remains usable.
 */
export async function writePropCache(
  sportKey: string,
  props: Prop[],
  fetchedAt = new Date()
): Promise<void> {
  memoryCache.set(sportKey, { props, fetchedAt });

  const delegate = await getSnapshotDelegate();
  if (!delegate) return;

  try {
    await delegate.create({
      data: {
        sportKey,
        fetchedAt,
        propCount: props.length,
        payload: props,
      },
    });
  } catch (error) {
    console.warn(`[propCache] Could not persist the snapshot for ${sportKey}; keeping memory cache.`, error);
  }
}

export function clearPropCache(sportKey?: string): void {
  if (sportKey) {
    memoryCache.delete(sportKey);
  } else {
    memoryCache.clear();
  }
}

/** Find a prop across every known sport without making a provider request. */
export async function findPropInCache(propId: string): Promise<Prop | null> {
  for (const sport of SPORTS) {
    const result = await readPropCache(sport.key);
    const prop = result.props.find((candidate) => candidate.id === propId);
    if (prop) return prop;
  }

  return null;
}

function emptyCacheResult(): PropCacheReadResult {
  return { props: [], fetchedAt: null, needsRefresh: true };
}

function toDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getSnapshotDelegate(): Promise<SnapshotDelegate | null> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const delegate = (prisma as unknown as { propFeedSnapshot?: SnapshotDelegate }).propFeedSnapshot;
    if (!delegate) {
      console.warn("[propCache] PropFeedSnapshot is unavailable; using memory cache only.");
      return null;
    }

    return delegate;
  } catch (error) {
    console.warn("[propCache] Persistent prop cache is unavailable; using memory cache only.", error);
    return null;
  }
}
