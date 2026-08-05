// Normalize player names for grouping across books
export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")   // strip punctuation
    .replace(/\s+/g, " ")
    .replace(/\bjr\b|\bsr\b|\bii\b|\biii\b/g, "")
    .trim();
}

// Normalize market keys for consistent internal representation
export function normalizeMarketKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

// Human-readable label from market key
export function marketKeyToLabel(key: string): string {
  const labels: Record<string, string> = {
    player_points:                  "Points",
    player_rebounds:                "Rebounds",
    player_assists:                 "Assists",
    player_threes:                  "3-Pointers Made",
    player_blocks:                  "Blocks",
    player_steals:                  "Steals",
    player_turnovers:               "Turnovers",
    player_points_rebounds_assists: "Pts+Reb+Ast",
    player_points_rebounds:         "Pts+Reb",
    player_points_assists:          "Pts+Ast",
    player_rebounds_assists:        "Reb+Ast",
    player_double_double:           "Double-Double",
    h2h:                            "Moneyline",
    spreads:                        "Spread",
    totals:                         "Total",
  };
  return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Build a stable group key for matching the same prop across books
// e.g. "lebron james|player_points|over|24.5"
export function buildPropGroupKey(
  playerName: string,
  marketKey: string,
  side: string,
  line: number
): string {
  return [normalizePlayerName(playerName), normalizeMarketKey(marketKey), side.toLowerCase(), line.toFixed(1)].join("|");
}

// Normalize side labels from raw API responses
export function normalizeSide(outcomeName: string, description?: string): string {
  const lower = outcomeName.toLowerCase();
  if (lower === "over") return "Over";
  if (lower === "under") return "Under";
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  // For h2h/spreads, outcome name is typically the team name
  return outcomeName;
}

// Extract player name from outcome description field
// The Odds API uses description for player name in prop markets
export function extractPlayerName(outcome: { name: string; description?: string }): string {
  // For player props, description holds the player name
  if (outcome.description) return outcome.description.trim();
  return outcome.name.trim();
}
