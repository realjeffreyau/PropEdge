import { describe, expect, it } from "vitest";

import {
  DEFAULT_WEIGHTS,
  scoreAllPropGroups,
  scorePropGroup,
} from "@/lib/scoring/scoringEngine";
import {
  americanToDecimal,
  calcEVPercent,
  calcKellyFraction,
  removeVig,
} from "@/lib/utils/oddsConversions";
import type { NormalizedOutcome, NormalizedPropGroup } from "@/lib/odds/types";

const NOW = new Date().toISOString();

function outcome(
  bookmakerKey: string,
  price: number,
  line: number,
  bookmakerTitle = bookmakerKey
): NormalizedOutcome {
  return {
    bookmakerKey,
    bookmakerTitle,
    marketKey: "player_points",
    outcomeName: "Over",
    price,
    point: line,
    lastUpdate: NOW,
  };
}

function americanOutcome(
  bookmakerKey: string,
  oddsAmerican: number,
  line: number,
  bookmakerTitle = bookmakerKey
): NormalizedOutcome {
  return outcome(bookmakerKey, americanToDecimal(oddsAmerican), line, bookmakerTitle);
}

function group(
  side: "Over" | "Under" | "Yes" | "No",
  line: number,
  outcomes: NormalizedOutcome[],
  playerName = "Test Player"
): NormalizedPropGroup {
  return {
    eventId: "event-1",
    sportKey: "basketball_nba",
    gameLabel: "AAA @ BBB",
    commenceTime: NOW,
    playerName,
    marketKey: "player_points",
    side,
    line,
    outcomes,
  };
}

function pair(
  bookmakerKey: string,
  overPrice: number,
  underPrice: number,
  line = 10.5
): [NormalizedOutcome, NormalizedOutcome] {
  return [
    outcome(bookmakerKey, overPrice, line),
    outcome(bookmakerKey, underPrice, line),
  ];
}

function numericValues(value: unknown): number[] {
  if (typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap(numericValues);
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(numericValues);
  }
  return [];
}

describe("scoring engine", () => {
  it("uses two-sided de-vig for a textbook -110/-110 market", () => {
    const [over, under] = [
      group("Over", 10.5, [americanOutcome("draftkings", -110, 10.5)]),
      group("Under", 10.5, [americanOutcome("draftkings", -110, 10.5)]),
    ];

    const prop = scoreAllPropGroups([over, under])[0];

    expect(prop.marketConsensusProbability).toBeCloseTo(0.5, 10);
    expect(prop.noVigProbability).toBeCloseTo(0.5, 10);
    expect(prop.scores.dataQualityScore.explanation).toContain("4.76%");
    expect(removeVig(1 / americanToDecimal(-110), 1 / americanToDecimal(-110)).hold).toBeCloseTo(0.0476, 4);
  });

  it("de-vigs an asymmetric -130/+110 market to the hand-computed probability", () => {
    const [over, under] = [
      group("Over", 10.5, [americanOutcome("fanduel", -130, 10.5)]),
      group("Under", 10.5, [americanOutcome("fanduel", 110, 10.5)]),
    ];
    const prop = scoreAllPropGroups([over, under])[0];
    const overImplied = 130 / 230;
    const underImplied = 100 / 210;
    const expected = overImplied / (overImplied + underImplied);

    expect(prop.marketConsensusProbability).toBeCloseTo(expected, 10);
  });

  it("does not let DFS prices change a sportsbook consensus", () => {
    const sportsbookPair = pair("draftkings", americanToDecimal(-110), americanToDecimal(-110));
    const sportsbookOnly = [
      group("Over", 10.5, [sportsbookPair[0]]),
      group("Under", 10.5, [sportsbookPair[1]]),
    ];
    const withDfs = [
      group("Over", 10.5, [sportsbookPair[0], americanOutcome("prizepicks", 250, 10.5)]),
      group("Under", 10.5, [sportsbookPair[1], americanOutcome("prizepicks", -200, 10.5)]),
    ];

    const sportsbookProp = scoreAllPropGroups(sportsbookOnly)[0];
    const dfsProp = scoreAllPropGroups(withDfs)[0];

    expect(dfsProp.marketConsensusProbability).toBeCloseTo(sportsbookProp.marketConsensusProbability, 10);
  });

  it("uses a leave-one-out benchmark for an outlier's EV", () => {
    const overPrices = [0.48, 0.50, 0.52, 0.40];
    const underPrices = [0.56, 0.52, 0.50, 0.7142857142857143];
    const books = ["book-a", "book-b", "book-c", "outlier"];
    const overOutcomes = books.map((book, index) => outcome(book, 1 / overPrices[index], 10.5));
    const underOutcomes = books.map((book, index) => outcome(book, 1 / underPrices[index], 10.5));
    const [prop] = scoreAllPropGroups([
      group("Over", 10.5, overOutcomes),
      group("Under", 10.5, underOutcomes),
    ]);

    const naiveAllBooksEv = calcEVPercent(prop.marketConsensusProbability, prop.bestAvailableOdds);

    expect(prop.bestAvailableBookKey).toBe("outlier");
    expect(prop.evPercent).toBeGreaterThan(naiveAllBooksEv);
    expect(prop.scores.dataQualityScore.dataWarning ?? "").not.toContain("Leave-one-out benchmark unavailable");
  });

  it("uses a lower-confidence single-side fallback when the opposite is missing", () => {
    const singleSide = scorePropGroup(
      group("Over", 10.5, [americanOutcome("draftkings", -110, 10.5)])
    );
    const [twoSided] = scoreAllPropGroups([
      group("Over", 10.5, [americanOutcome("draftkings", -110, 10.5)]),
      group("Under", 10.5, [americanOutcome("draftkings", -110, 10.5)]),
    ]);

    expect(singleSide.scores.dataQualityScore.value).toBeLessThan(twoSided.scores.dataQualityScore.value);
    expect(singleSide.scores.dataQualityScore.dataWarning).toContain("single-side fallback");
  });

  it("caps implausible EV and emits the stale-line warning", () => {
    const ordinaryPairs = [pair("book-a", americanToDecimal(-110), americanToDecimal(-110)), pair("book-b", americanToDecimal(-110), americanToDecimal(-110))];
    const [prop] = scoreAllPropGroups([
      group("Over", 10.5, [ordinaryPairs[0][0], ordinaryPairs[1][0], americanOutcome("outlier", 500, 10.5)]),
      group("Under", 10.5, [ordinaryPairs[0][1], ordinaryPairs[1][1], outcome("outlier", 1.9, 10.5)]),
    ]);

    expect(prop.evPercent).toBe(50);
    expect(prop.scores.evScore.value).toBe(65);
    expect(prop.scores.dataQualityScore.dataWarning).toContain("implausibly large and likely reflects a stale or mismatched line");
    expect(prop.explanation).toContain("implausibly large and likely reflects a stale or mismatched line");
  });

  it("marks alternate lines against the cross-line consensus", () => {
    const [consensusLine, alternateLine] = scoreAllPropGroups([
      group("Over", 10.5, [americanOutcome("book-a", -110, 10.5), americanOutcome("book-b", -110, 10.5)]),
      group("Over", 11.5, [americanOutcome("book-c", -110, 11.5)]),
    ]);

    expect(consensusLine.marketConsensusLine).toBe(10.5);
    expect(consensusLine.isAltLine).toBe(false);
    expect(alternateLine.isAltLine).toBe(true);
  });

  it("calculates zero Kelly for negative EV and a bounded positive Kelly for positive EV", () => {
    const [negative] = scoreAllPropGroups([
      group("Over", 10.5, [americanOutcome("book-a", -110, 10.5)]),
      group("Under", 10.5, [americanOutcome("book-a", -110, 10.5)]),
    ]);
    const [positive] = scoreAllPropGroups([
      group("Over", 10.5, [americanOutcome("book-a", 110, 10.5), americanOutcome("book-b", 110, 10.5), americanOutcome("book-c", 110, 10.5)]),
      group("Under", 10.5, [americanOutcome("book-a", 110, 10.5), americanOutcome("book-b", 110, 10.5), americanOutcome("book-c", 110, 10.5)]),
    ]);

    expect(negative.kellyFraction).toBe(0);
    expect(negative.halfKellyFraction).toBe(0);
    expect(positive.kellyFraction).toBeGreaterThan(0);
    expect(positive.kellyFraction).toBeLessThan(1);
    expect(positive.halfKellyFraction).toBeCloseTo((positive.kellyFraction ?? 0) / 2, 10);
    expect(calcKellyFraction(0.5, 2.1)).toBeCloseTo(0.05 / 1.1, 10);
  });

  it("keeps every numeric output finite for sparse, empty, and zero-line groups", () => {
    const props = [
      scorePropGroup(group("Over", 0, [outcome("book-a", 1.91, 0)])),
      scorePropGroup(group("Over", 0, [])),
      ...scoreAllPropGroups([
        group("Over", 0, [outcome("book-a", 1.91, 0)]),
        group("Under", 0, [outcome("book-a", 1.91, 0)]),
      ]),
    ];

    for (const prop of props) {
      expect(numericValues(prop).every((value) => Number.isFinite(value))).toBe(true);
    }
  });

  it("keeps the redesigned confidence weights normalized", () => {
    expect(DEFAULT_WEIGHTS.evWeight + DEFAULT_WEIGHTS.liquidityWeight + DEFAULT_WEIGHTS.probabilityEdgeWeight + DEFAULT_WEIGHTS.dataQualityWeight + DEFAULT_WEIGHTS.whaleWeight).toBeCloseTo(1, 10);
  });
});
