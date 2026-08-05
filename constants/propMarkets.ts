export interface PropMarketConfig {
  key: string;
  label: string;
  shortLabel: string;
  stat: string;
  active: boolean;
  displayOrder: number;
}

// These keys match The Odds API player prop market keys.
// Edit from admin settings or update this file to add/remove markets.
export const PROP_MARKETS: PropMarketConfig[] = [
  { key: "player_points",                   label: "Points",                    shortLabel: "PTS",   stat: "points",   active: true,  displayOrder: 1 },
  { key: "player_rebounds",                 label: "Rebounds",                  shortLabel: "REB",   stat: "rebounds", active: true,  displayOrder: 2 },
  { key: "player_assists",                  label: "Assists",                   shortLabel: "AST",   stat: "assists",  active: true,  displayOrder: 3 },
  { key: "player_threes",                   label: "3-Pointers Made",           shortLabel: "3PM",   stat: "threes",   active: true,  displayOrder: 4 },
  { key: "player_blocks",                   label: "Blocks",                    shortLabel: "BLK",   stat: "blocks",   active: true,  displayOrder: 5 },
  { key: "player_steals",                   label: "Steals",                    shortLabel: "STL",   stat: "steals",   active: true,  displayOrder: 6 },
  { key: "player_turnovers",                label: "Turnovers",                 shortLabel: "TO",    stat: "turnovers",active: true,  displayOrder: 7 },
  { key: "player_points_rebounds_assists",  label: "Pts+Reb+Ast",              shortLabel: "PRA",   stat: "pra",      active: true,  displayOrder: 8 },
  { key: "player_points_rebounds",          label: "Pts+Reb",                  shortLabel: "PR",    stat: "pr",       active: true,  displayOrder: 9 },
  { key: "player_points_assists",           label: "Pts+Ast",                  shortLabel: "PA",    stat: "pa",       active: true,  displayOrder: 10 },
  { key: "player_rebounds_assists",         label: "Reb+Ast",                  shortLabel: "RA",    stat: "ra",       active: true,  displayOrder: 11 },
  { key: "player_double_double",            label: "Double-Double",             shortLabel: "DD",    stat: "dd",       active: true,  displayOrder: 12 },
];

export const MAIN_MARKETS = ["h2h", "spreads", "totals"] as const;
export type MainMarketKey = (typeof MAIN_MARKETS)[number];

export const MAIN_MARKET_LABELS: Record<MainMarketKey, string> = {
  h2h: "Moneyline",
  spreads: "Spread",
  totals: "Total",
};

export const ACTIVE_PROP_MARKETS = PROP_MARKETS.filter((m) => m.active);

export function getPropMarketLabel(key: string): string {
  return PROP_MARKETS.find((m) => m.key === key)?.label ?? key;
}
