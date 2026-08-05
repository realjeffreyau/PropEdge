// ─── Sport & Book ──────────────────────────────────────────────────────────

export type SportKey = "basketball_nba" | "basketball_wnba" | "baseball_mlb";
export type BookmakerType = "SPORTSBOOK" | "DFS" | "EXCHANGE" | "OTHER";
export type Side = "Over" | "Under" | "Yes" | "No" | "Home" | "Away" | "Draw";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type MarketCategory = "PROP" | "MAIN";

// ─── Scores ───────────────────────────────────────────────────────────────

export interface ScoreDetail {
  value: number;           // 0-100
  label: string;
  explanation: string;
  factors: string[];
  dataWarning?: string;
}

export interface PropScores {
  evScore: ScoreDetail;
  liquidityScore: ScoreDetail;
  probabilityEdgeScore: ScoreDetail;
  dataQualityScore: ScoreDetail;
  whaleScore: ScoreDetail | null;   // null = not enough data
  confidenceScore: ScoreDetail;
}

// ─── Odds snapshot for a single book ──────────────────────────────────────

export interface BookOdds {
  bookmakerKey: string;
  bookmakerLabel: string;
  bookmakerType: BookmakerType;
  line: number | null;
  oddsAmerican: number;
  oddsDecimal: number;
  impliedProbability: number;
  lastUpdated: string;   // ISO string
}

// ─── A player prop grouped across books ───────────────────────────────────

export interface Prop {
  id: string;
  sportKey: SportKey;
  eventId: string;
  gameLabel: string;         // "LAL @ BOS"
  commenceTime: string;      // ISO string
  playerName: string;
  playerId?: string;
  teamAbbr?: string;
  teamName?: string;
  marketKey: string;
  marketLabel: string;
  side: Side;
  line: number;
  isAltLine: boolean;

  // Odds across all books
  bookOdds: BookOdds[];

  // Computed consensus
  marketConsensusLine: number;
  marketConsensusProbability: number;   // no-vig
  bestAvailableOdds: number;
  bestAvailableBookKey: string;
  bestAvailableBookLabel: string;

  scores: PropScores;
  estimatedHitProbability: number;   // 0-1
  noVigProbability: number;           // 0-1
  edgePercent: number;
  evPercent: number;
  fairOddsAmerican: number;
  kellyFraction?: number;
  halfKellyFraction?: number;
  riskLevel: RiskLevel;
  explanation: string;

  isMock: boolean;
  lastRefreshed: string;
}

// ─── A ranked pick row (shown in the main table) ──────────────────────────

export interface RankedPick {
  rank: number;
  prop: Prop;
  selectedBookKey: string;
  selectedBookOdds: BookOdds | null;
  marketCategory: MarketCategory;
}

// ─── Dashboard filter state ────────────────────────────────────────────────

export interface DashboardFilters {
  sportKey: SportKey;
  bookmakerKey: string;      // "all" or specific key
  marketCategory: MarketCategory | "ALL";
  minEv?: number;
  minConfidence?: number;
  minLiquidity?: number;
  playerSearch?: string;
  sortBy: SortField;
  sortDir: "asc" | "desc";
}

export type SortField =
  | "rank"
  | "confidenceScore"
  | "evScore"
  | "liquidityScore"
  | "estimatedHitProbability"
  | "edgePercent"
  | "evPercent"
  | "commenceTime";

// ─── User / Auth ───────────────────────────────────────────────────────────

export type UserRole = "ADMIN" | "MEMBER_READONLY" | "MEMBER_FULL";

export interface AppUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

// ─── Mock mode indicator ───────────────────────────────────────────────────

export interface DataSourceStatus {
  isMockMode: boolean;
  lastRefreshed: string | null;
  oddsApiCreditsUsed?: number;
  oddsApiCreditsRemaining?: number;
}
