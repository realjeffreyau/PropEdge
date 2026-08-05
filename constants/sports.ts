export const SPORTS = [
  { key: "basketball_nba", label: "NBA", shortLabel: "NBA", active: true },
  { key: "basketball_wnba", label: "WNBA", shortLabel: "WNBA", active: true },
  // Future
  { key: "baseball_mlb", label: "MLB", shortLabel: "MLB", active: false },
] as const;

export type SportKey = (typeof SPORTS)[number]["key"];
export const ACTIVE_SPORTS = SPORTS.filter((s) => s.active);

export const SPORT_LABELS: Record<string, string> = {
  basketball_nba: "NBA",
  basketball_wnba: "WNBA",
  baseball_mlb: "MLB",
};
