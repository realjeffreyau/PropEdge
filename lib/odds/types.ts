// ─── Raw Odds API response shapes ─────────────────────────────────────────

export interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;   // ISO 8601
  home_team: string;
  away_team: string;
  bookmakers?: OddsApiBookmaker[];
}

export interface OddsApiBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiMarket[];
}

export interface OddsApiMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiOutcome[];
}

export interface OddsApiOutcome {
  name: string;
  description?: string;   // player name for prop markets
  price: number;          // decimal odds
  point?: number;         // line (spreads, totals, props)
}

export interface OddsApiUsage {
  requestsRemaining: number | null;
  requestsUsed: number | null;
  requestsLast: number | null;
}

// ─── Normalized internal shapes ───────────────────────────────────────────

export interface NormalizedEvent {
  id: string;
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  gameLabel: string;  // "LAL @ BOS"
}

export interface NormalizedOutcome {
  bookmakerKey: string;
  bookmakerTitle: string;
  marketKey: string;
  outcomeName: string;
  description?: string;
  price: number;         // decimal
  point?: number;
  lastUpdate: string;
}

export interface NormalizedPropGroup {
  eventId: string;
  sportKey: string;
  gameLabel: string;
  commenceTime: string;
  playerName: string;
  marketKey: string;
  side: string;
  line: number;
  outcomes: NormalizedOutcome[];
}

export interface RefreshResult {
  success: boolean;
  eventsCount: number;
  propsCount: number;
  creditsUsed: number;
  error?: string;
}
