import { describe, expect, it } from "vitest";
import type { Prop } from "@/types";
import { groupPicksByGame, selectHighestConvictionPicks } from "@/lib/hooks/pickSelectors";

function makeProp(
  id: string,
  eventId: string,
  confidence: number,
  evPercent: number,
  playerName = id
): Prop {
  return {
    id,
    eventId,
    gameLabel: eventId,
    playerName,
    sportKey: "basketball_nba",
    commenceTime: "2026-08-05T18:00:00.000Z",
    marketKey: "player_points",
    marketLabel: "Points",
    side: "Over",
    line: 20.5,
    isAltLine: false,
    bookOdds: [],
    marketConsensusLine: 20.5,
    marketConsensusProbability: 0.5,
    bestAvailableOdds: -110,
    bestAvailableBookKey: "draftkings",
    bestAvailableBookLabel: "DraftKings",
    scores: {
      evScore: { value: 60, label: "", explanation: "", factors: [] },
      liquidityScore: { value: 60, label: "", explanation: "", factors: [] },
      probabilityEdgeScore: { value: 60, label: "", explanation: "", factors: [] },
      dataQualityScore: { value: 60, label: "", explanation: "", factors: [] },
      whaleScore: null,
      confidenceScore: { value: confidence, label: "", explanation: "", factors: [] },
    },
    estimatedHitProbability: 0.5,
    noVigProbability: 0.5,
    edgePercent: evPercent,
    evPercent,
    fairOddsAmerican: -110,
    riskLevel: "MEDIUM",
    explanation: "",
    isMock: true,
    lastRefreshed: "2026-08-05T17:00:00.000Z",
  };
}

describe("pick selectors", () => {
  it("keeps positive-EV props at or above the confidence threshold in confidence order", () => {
    const props = [
      makeProp("low", "game-1", 69, 8),
      makeProp("negative", "game-1", 95, -1),
      makeProp("medium", "game-1", 75, 2),
      makeProp("high", "game-2", 90, 1),
    ];

    expect(selectHighestConvictionPicks(props, 70).map((prop) => prop.id)).toEqual([
      "high",
      "medium",
    ]);
  });

  it("groups a ranked list by game while preserving each game's rank order", () => {
    const props = [
      makeProp("a", "game-1", 90, 4),
      makeProp("b", "game-1", 80, 3),
      makeProp("c", "game-2", 85, 2),
    ];

    expect(groupPicksByGame(props).map((group) => [group.gameLabel, group.props.map((prop) => prop.id)])).toEqual([
      ["game-1", ["a", "b"]],
      ["game-2", ["c"]],
    ]);
  });
});
