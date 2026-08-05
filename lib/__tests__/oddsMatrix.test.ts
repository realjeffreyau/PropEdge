import { describe, expect, it } from "vitest";
import type { Prop } from "@/types";
import { buildOddsMatrix } from "@/lib/hooks/oddsMatrix";

function makeProp(id: string, line = 20.5): Prop {
  return {
    id,
    sportKey: "basketball_nba",
    eventId: "game-1",
    gameLabel: "LAL @ BOS",
    commenceTime: "2026-08-05T18:00:00.000Z",
    playerName: id,
    marketKey: "player_points",
    marketLabel: "Points",
    side: "Over",
    line,
    isAltLine: line !== 20.5,
    bookOdds: [],
    marketConsensusLine: 20.5,
    marketConsensusProbability: 0.5,
    bestAvailableOdds: -110,
    bestAvailableBookKey: "draftkings",
    bestAvailableBookLabel: "DraftKings",
    scores: {} as Prop["scores"],
    estimatedHitProbability: 0.5,
    noVigProbability: 0.5,
    edgePercent: 1,
    evPercent: 1,
    fairOddsAmerican: -110,
    riskLevel: "MEDIUM",
    explanation: "",
    isMock: true,
    lastRefreshed: "2026-08-05T17:00:00.000Z",
  };
}

describe("odds matrix", () => {
  it("maps books to columns, marks missing prices, best prices, and line mismatches", () => {
    const first = makeProp("first");
    first.bookOdds = [
      { bookmakerKey: "draftkings", bookmakerLabel: "DraftKings", bookmakerType: "SPORTSBOOK", line: 20.5, oddsAmerican: -110, oddsDecimal: 1.91, impliedProbability: 0.52, lastUpdated: "" },
      { bookmakerKey: "fanduel", bookmakerLabel: "FanDuel", bookmakerType: "SPORTSBOOK", line: 20.5, oddsAmerican: 105, oddsDecimal: 2.05, impliedProbability: 0.49, lastUpdated: "" },
      { bookmakerKey: "betmgm", bookmakerLabel: "BetMGM", bookmakerType: "SPORTSBOOK", line: 21.5, oddsAmerican: 120, oddsDecimal: 2.2, impliedProbability: 0.45, lastUpdated: "" },
    ];
    const second = makeProp("second", 21.5);
    second.bookOdds = [first.bookOdds[0]];

    const matrix = buildOddsMatrix([first, second]);

    expect(matrix.books.map((book) => book.bookmakerKey)).toEqual(["draftkings", "fanduel", "betmgm"]);
    expect(matrix.rows[0].cells.fanduel.isBest).toBe(false);
    expect(matrix.rows[0].cells.betmgm).toMatchObject({ oddsAmerican: 120, isBest: true, lineDiffers: true });
    expect(matrix.rows[1].cells.fanduel.oddsAmerican).toBeNull();
    expect(matrix.rows[1].prop.isAltLine).toBe(true);
  });
});
