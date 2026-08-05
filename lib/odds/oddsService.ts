/**
 * OddsService
 *
 * The Odds API is NEVER called automatically. Data is only fetched when
 * forceRefresh: true (i.e. the user presses Refresh). On page load, this
 * module serves the persistent or in-memory prop cache.
 *
 * Falls back to mock data when THE_ODDS_API_KEY is not set.
 */

import { getOddsApiProvider } from "./theOddsApiProvider";
import { scoreAllPropGroups, DEFAULT_WEIGHTS } from "@/lib/scoring/scoringEngine";
import { getMockProps, MOCK_DATA_STATUS } from "@/lib/mock/mockData";
import { clearPropCache, readPropCache, writePropCache } from "@/lib/propCache";
import type { Prop, DataSourceStatus } from "@/types";
import type { NormalizedPropGroup } from "./types";

export interface FetchPropsOptions {
  sportKey: string;
  forceRefresh?: boolean;
}

export interface FetchPropsResult {
  props: Prop[];
  status: DataSourceStatus;
  needsRefresh: boolean;
}

export async function fetchScoredProps(opts: FetchPropsOptions): Promise<FetchPropsResult> {
  const { sportKey, forceRefresh = false } = opts;
  const provider = getOddsApiProvider();

  // ── Mock mode ──────────────────────────────────────────────────────────
  if (!provider.isConfigured) {
    return {
      props: getMockProps(sportKey),
      status: MOCK_DATA_STATUS,
      needsRefresh: false,
    };
  }

  // ── Serve from cache (page load, tab switch, etc.) ─────────────────────
  if (!forceRefresh) {
    const cached = await readPropCache(sportKey);
    return {
      props: cached.props,
      status: {
        isMockMode: false,
        lastRefreshed: cached.fetchedAt?.toISOString() ?? null,
        oddsApiCreditsRemaining: provider.usage.requestsRemaining ?? undefined,
      },
      needsRefresh: cached.needsRefresh,
    };
  }

  // ── Live fetch (only when Refresh button is pressed) ──────────────────
  const startedAt = new Date();
  let creditsUsed = 0;

  try {
    const events = await provider.getEvents(sportKey);
    creditsUsed += 1;

    const upcomingEvents = events
      .filter((e) => new Date(e.commenceTime) > new Date())
      .slice(0, 8);

    const allPropGroups: NormalizedPropGroup[] = [];
    for (const event of upcomingEvents) {
      const groups = await provider.getEventProps(sportKey, event.id);
      allPropGroups.push(...groups);
      creditsUsed += 1;
    }

    const scoredProps = scoreAllPropGroups(allPropGroups, DEFAULT_WEIGHTS)
      .filter((p) => p.bookOdds.length > 0)
      .sort((a, b) => b.scores.confidenceScore.value - a.scores.confidenceScore.value);
    const fetchedAt = new Date();

    await writePropCache(sportKey, scoredProps, fetchedAt);
    void storeRefreshLog(sportKey, creditsUsed, startedAt, "success");

    return {
      props: scoredProps,
      status: {
        isMockMode: false,
        lastRefreshed: fetchedAt.toISOString(),
        oddsApiCreditsUsed: creditsUsed,
        oddsApiCreditsRemaining: provider.usage.requestsRemaining ?? undefined,
      },
      needsRefresh: false,
    };
  } catch (error) {
    const errorMessage = toHumanReadableError(error);
    console.error(`OddsService refresh error for ${sportKey}:`, error);
    void storeRefreshLog(sportKey, creditsUsed, startedAt, "error", errorMessage);
    throw new Error(errorMessage);
  }
}

async function storeRefreshLog(
  sportKey: string,
  creditsUsed: number,
  startedAt: Date,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.refreshLog.create({
      data: {
        provider: "the_odds_api",
        sportKey,
        marketType: "player_props",
        status,
        creditsUsed,
        startedAt,
        finishedAt: new Date(),
        errorMessage,
      },
    });
  } catch (error) {
    console.warn("Failed to write refresh log; continuing without database logging:", error);
  }
}

function toHumanReadableError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Unable to refresh odds right now. Please try again.";
}

export { clearPropCache };
