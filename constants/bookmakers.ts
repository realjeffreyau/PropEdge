export type BookmakerType = "SPORTSBOOK" | "DFS" | "EXCHANGE" | "OTHER";

export interface BookmakerConfig {
  key: string;
  label: string;
  shortLabel: string;
  type: BookmakerType;
  isSharp: boolean;
  supportsProps: boolean;
  active: boolean;
  displayOrder: number;
}

export const BOOKMAKERS: BookmakerConfig[] = [
  // Sportsbooks
  { key: "draftkings",        label: "DraftKings",    shortLabel: "DK",       type: "SPORTSBOOK", isSharp: false, supportsProps: true,  active: true,  displayOrder: 1 },
  { key: "fanduel",           label: "FanDuel",       shortLabel: "FD",       type: "SPORTSBOOK", isSharp: false, supportsProps: true,  active: true,  displayOrder: 2 },
  { key: "betmgm",            label: "BetMGM",        shortLabel: "MGM",      type: "SPORTSBOOK", isSharp: false, supportsProps: true,  active: true,  displayOrder: 3 },
  { key: "williamhill_us",    label: "Caesars",        shortLabel: "CZR",     type: "SPORTSBOOK", isSharp: false, supportsProps: true,  active: true,  displayOrder: 4 },
  { key: "espnbet",           label: "ESPN Bet",      shortLabel: "ESPN",     type: "SPORTSBOOK", isSharp: false, supportsProps: true,  active: true,  displayOrder: 5 },
  { key: "fanatics",          label: "Fanatics",      shortLabel: "FAN",      type: "SPORTSBOOK", isSharp: false, supportsProps: true,  active: true,  displayOrder: 6 },
  { key: "pinnacle",          label: "Pinnacle",      shortLabel: "PIN",      type: "SPORTSBOOK", isSharp: true,  supportsProps: false, active: true,  displayOrder: 7 },
  // DFS / Pick'em
  { key: "underdog",          label: "Underdog",      shortLabel: "UD",       type: "DFS",        isSharp: false, supportsProps: true,  active: true,  displayOrder: 8 },
  { key: "prizepicks",        label: "PrizePicks",    shortLabel: "PP",       type: "DFS",        isSharp: false, supportsProps: true,  active: true,  displayOrder: 9 },
  { key: "pick6",             label: "DK Pick6",      shortLabel: "PK6",      type: "DFS",        isSharp: false, supportsProps: true,  active: true,  displayOrder: 10 },
  { key: "betr_us_dfs",       label: "Betr Picks",    shortLabel: "BETR",     type: "DFS",        isSharp: false, supportsProps: true,  active: true,  displayOrder: 11 },
];

export const ALL_BOOKS_KEY = "all";

export const SPORTSBOOKS = BOOKMAKERS.filter((b) => b.type === "SPORTSBOOK" && b.active);
export const DFS_PLATFORMS = BOOKMAKERS.filter((b) => b.type === "DFS" && b.active);
export const SHARP_BOOKS = BOOKMAKERS.filter((b) => b.isSharp && b.active);

export function getBookmakerByKey(key: string): BookmakerConfig | undefined {
  return BOOKMAKERS.find((b) => b.key === key);
}

export function getBookLabel(key: string): string {
  return getBookmakerByKey(key)?.label ?? key;
}
