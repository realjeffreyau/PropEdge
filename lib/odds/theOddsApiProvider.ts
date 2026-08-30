import type {
  OddsApiEvent,
  NormalizedEvent,
  NormalizedPropGroup,
  OddsApiUsage,
} from "./types";
import { normalizeSide, extractPlayerName, buildPropGroupKey } from "@/lib/utils/propNormalizer";

const BASE_URL = "https://api.the-odds-api.com/v4";

// Configurable prop market keys — matches The Odds API keys
export const PROP_MARKET_KEYS = [
  "player_points",
  "player_rebounds",
  "player_assists",
  "player_threes",
  "player_blocks",
  "player_steals",
  "player_turnovers",
  "player_points_rebounds_assists",
  "player_points_rebounds",
  "player_points_assists",
  "player_rebounds_assists",
  "player_double_double",
] as const;

export const MAIN_MARKET_KEYS = ["h2h", "spreads", "totals"] as const;

export class TheOddsApiProvider {
  private apiKey: string;
  private region: string;
  private bookmakers: string[];
  private dfsBookmakers: string[];
  private lastUsage: OddsApiUsage = { requestsRemaining: null, requestsUsed: null, requestsLast: null };

  constructor() {
    this.apiKey = process.env.THE_ODDS_API_KEY ?? "";
    this.region = process.env.ODDS_API_REGION ?? "us";
    this.bookmakers = (process.env.ODDS_API_BOOKMAKERS ?? "draftkings,fanduel,betmgm,williamhill_us,espnbet,fanatics").split(",");
    this.dfsBookmakers = (process.env.ODDS_API_DFS_BOOKMAKERS ?? "underdog,prizepicks,pick6,betr_us_dfs").split(",");
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  get usage(): OddsApiUsage {
    return this.lastUsage;
  }

  // ── Core fetch wrapper ─────────────────────────────────────────────────

  private async fetch<T>(path: string, params: Record<string, string> = {}): Promise<{ data: T; usage: OddsApiUsage }> {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("apiKey", this.apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      next: { revalidate: 0 },  // always fresh
    });

    const usage: OddsApiUsage = {
      requestsRemaining: Number(res.headers.get("x-requests-remaining")) || null,
      requestsUsed: Number(res.headers.get("x-requests-used")) || null,
      requestsLast: Number(res.headers.get("x-requests-last")) || null,
    };
    this.lastUsage = usage;

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OddsAPI ${res.status}: ${body}`);
    }

    const data = await res.json() as T;
    return { data, usage };
  }

  // ── Events ────────────────────────────────────────────────────────────

  async getEvents(sportKey: string): Promise<NormalizedEvent[]> {
    const { data } = await this.fetch<OddsApiEvent[]>(`/sports/${sportKey}/events`);
    return data.map((e) => this.normalizeEvent(e));
  }

  // ── Main market odds (h2h, spreads, totals) ───────────────────────────

  async getMainOdds(sportKey: string): Promise<OddsApiEvent[]> {
    const allBooks = [...this.bookmakers, ...this.dfsBookmakers].join(",");
    const { data } = await this.fetch<OddsApiEvent[]>(`/sports/${sportKey}/odds`, {
      markets: MAIN_MARKET_KEYS.join(","),
      regions: this.region,
      bookmakers: allBooks,
      oddsFormat: "decimal",
    });
    return data;
  }

  // ── Player props for a single event ──────────────────────────────────

  async getEventProps(sportKey: string, eventId: string): Promise<NormalizedPropGroup[]> {
    const allBooks = [...this.bookmakers, ...this.dfsBookmakers].join(",");

    // Batch prop markets into groups of 4 to stay within URL limits
    const groups = chunkArray([...PROP_MARKET_KEYS], 4);
    const allGroups: NormalizedPropGroup[] = [];

    for (const group of groups) {
      try {
        const { data } = await this.fetch<OddsApiEvent>(`/sports/${sportKey}/events/${eventId}/odds`, {
          markets: group.join(","),
          regions: this.region,
          bookmakers: allBooks,
          oddsFormat: "decimal",
        });
        const groups = this.extractPropGroups(data, sportKey);
        allGroups.push(...groups);
      } catch (err) {
        // Some prop markets may not be available for a given event — continue
        console.warn(`Props unavailable for event ${eventId}, markets ${group.join(",")}:`, err);
      }
    }

    return allGroups;
  }

  // ── Normalize event ────────────────────────────────────────────────────

  private normalizeEvent(e: OddsApiEvent): NormalizedEvent {
    return {
      id: e.id,
      sportKey: e.sport_key,
      homeTeam: e.home_team,
      awayTeam: e.away_team,
      commenceTime: e.commence_time,
      gameLabel: `${abbreviate(e.away_team)} @ ${abbreviate(e.home_team)}`,
    };
  }

  // ── Extract prop groups from event odds response ───────────────────────

  private extractPropGroups(event: OddsApiEvent, sportKey: string): NormalizedPropGroup[] {
    const gameLabel = `${abbreviate(event.away_team)} @ ${abbreviate(event.home_team)}`;
    const groupMap = new Map<string, NormalizedPropGroup>();

    for (const bm of event.bookmakers ?? []) {
      for (const market of bm.markets) {
        if (!PROP_MARKET_KEYS.includes(market.key as typeof PROP_MARKET_KEYS[number])) continue;

        for (const outcome of market.outcomes) {
          const playerName = extractPlayerName(outcome);
          const side = normalizeSide(outcome.name);
          const line = outcome.point ?? 0;
          const groupKey = buildPropGroupKey(playerName, market.key, side, line);

          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              eventId: event.id,
              sportKey,
              gameLabel,
              commenceTime: event.commence_time,
              playerName,
              marketKey: market.key,
              side,
              line,
              outcomes: [],
            });
          }

          groupMap.get(groupKey)!.outcomes.push({
            bookmakerKey: bm.key,
            bookmakerTitle: bm.title,
            marketKey: market.key,
            outcomeName: outcome.name,
            description: outcome.description,
            price: outcome.price,
            point: outcome.point,
            lastUpdate: bm.last_update,
          });
        }
      }
    }

    return Array.from(groupMap.values());
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Common NBA/WNBA team name → abbreviation mapping
const TEAM_ABBR: Record<string, string> = {
  "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
  "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
  "LA Clippers": "LAC", "Los Angeles Clippers": "LAC", "Los Angeles Lakers": "LAL",
  "Memphis Grizzlies": "MEM", "Miami Heat": "MIA", "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN", "New Orleans Pelicans": "NOP",
  "New York Knicks": "NYK", "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL",
  "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX", "Portland Trail Blazers": "POR",
  "Sacramento Kings": "SAC", "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR",
  "Utah Jazz": "UTA", "Washington Wizards": "WAS",
  // WNBA
  "Atlanta Dream": "ATL", "Chicago Sky": "CHI", "Connecticut Sun": "CON",
  "Dallas Wings": "DAL", "Indiana Fever": "IND", "Las Vegas Aces": "LV",
  "Los Angeles Sparks": "LA", "Minnesota Lynx": "MIN", "New York Liberty": "NY",
  "Phoenix Mercury": "PHX", "Seattle Storm": "SEA", "Washington Mystics": "WAS",
};

export function abbreviate(teamName: string): string {
  return TEAM_ABBR[teamName] ?? teamName.split(" ").pop()?.slice(0, 3).toUpperCase() ?? teamName;
}

// Singleton
let _provider: TheOddsApiProvider | null = null;
export function getOddsApiProvider(): TheOddsApiProvider {
  if (!_provider) _provider = new TheOddsApiProvider();
  return _provider;
}
