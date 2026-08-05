import { describe, expect, it } from "vitest";

import {
  americanToDecimal,
  americanToImplied,
  calcEdgePercent,
  calcEV,
  calcEVPercent,
  calcMean,
  calcMedian,
  calcMedianOrNull,
  clampProbability,
  decimalToAmerican,
  decimalToImplied,
  impliedToAmerican,
  noVigProbSingleSide,
  removeVig,
} from "@/lib/utils/oddsConversions";

describe("odds conversions", () => {
  it("round-trips American and decimal odds", () => {
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 4);
    expect(decimalToAmerican(1.9091)).toBe(-110);
    expect(americanToDecimal(150)).toBe(2.5);
    expect(decimalToAmerican(2.5)).toBe(150);
  });

  it("converts American odds to and from implied probability", () => {
    expect(americanToImplied(-110)).toBeCloseTo(0.5238, 4);
    expect(americanToImplied(100)).toBe(0.5);
    expect(impliedToAmerican(0.5)).toBe(-100);
  });

  it("removes two-sided vig and handles a degenerate market", () => {
    const result = removeVig(0.5238, 0.5238);
    expect(result.probA).toBeCloseTo(0.5, 10);
    expect(result.probB).toBeCloseTo(0.5, 10);
    expect(result.hold).toBeCloseTo(0.0476, 4);
    expect(removeVig(0, 0)).toEqual({ probA: 0.5, probB: 0.5, hold: 0 });
  });

  it("calculates expected value with the expected signs", () => {
    expect(calcEV(0.5, 100)).toBeCloseTo(0, 10);
    expect(calcEV(0.6, 100)).toBeCloseTo(0.2, 10);
    expect(calcEV(0.5, -110)).toBeLessThan(0);
    expect(calcEVPercent(0.6, 100)).toBeCloseTo(20, 10);
    expect(calcEVPercent(0.4, 100)).toBeCloseTo(-20, 10);
    expect(calcEdgePercent(0.6, 0.5)).toBeCloseTo(10, 10);
    expect(calcEdgePercent(0.4, 0.5)).toBeCloseTo(-10, 10);
  });

  it("returns finite documented guard values", () => {
    expect(decimalToAmerican(1)).toBe(0);
    expect(decimalToAmerican(0.5)).toBe(0);
    expect(americanToDecimal(0)).toBe(1);
    expect(americanToImplied(0)).toBe(0);
    expect(decimalToImplied(0)).toBe(0);
    expect(impliedToAmerican(0)).toBe(0);

    expect(decimalToAmerican(Number.NaN)).toBe(0);
    expect(americanToDecimal(Number.NaN)).toBe(1);
    expect(decimalToImplied(Number.NaN)).toBe(0);
    expect(impliedToAmerican(Number.NaN)).toBe(0);
    expect(Number.isFinite(americanToDecimal(Number.MIN_VALUE))).toBe(true);
    expect(Number.isFinite(decimalToAmerican(Number.MAX_VALUE))).toBe(true);
    expect(Number.isFinite(impliedToAmerican(Number.MIN_VALUE))).toBe(true);
  });

  it("keeps all math helpers finite for invalid and overflow inputs", () => {
    const scalarResults = [
      americanToDecimal(Number.POSITIVE_INFINITY),
      americanToImplied(Number.NEGATIVE_INFINITY),
      decimalToAmerican(Number.NEGATIVE_INFINITY),
      decimalToImplied(Number.POSITIVE_INFINITY),
      impliedToAmerican(Number.NaN),
      calcEV(Number.NaN, Number.NaN),
      calcEVPercent(Number.POSITIVE_INFINITY, Number.MAX_VALUE),
      calcEdgePercent(Number.MAX_VALUE, -Number.MAX_VALUE),
      calcMean([Number.MAX_VALUE, Number.MAX_VALUE]),
      calcMedian([Number.MAX_VALUE, Number.MAX_VALUE]),
      noVigProbSingleSide(Number.NaN),
    ];

    expect(scalarResults.every((value) => Number.isFinite(value))).toBe(true);
    expect(calcMedianOrNull([Number.NaN, Number.POSITIVE_INFINITY])).toBeNull();
    expect(removeVig(Number.MAX_VALUE, Number.MAX_VALUE)).toEqual({
      probA: 0.5,
      probB: 0.5,
      hold: 0,
    });
  });
});

describe("median helpers", () => {
  it("distinguish no data from a zero median", () => {
    expect(calcMedian([])).toBe(0);
    expect(calcMedianOrNull([])).toBeNull();
    expect(calcMedian([3, 1, 2])).toBe(2);
    expect(calcMedianOrNull([3, 1, 2])).toBe(2);
    expect(calcMedian([4, 1, 3, 2])).toBe(2.5);
    expect(calcMedianOrNull([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("probability clamping", () => {
  it("maps invalid and out-of-range values to safe probabilities", () => {
    expect(clampProbability(Number.NaN)).toBe(0.5);
    expect(clampProbability(0)).toBe(0.0001);
    expect(clampProbability(1)).toBe(0.9999);
    expect(clampProbability(0.62)).toBe(0.62);
    expect(clampProbability(Number.POSITIVE_INFINITY)).toBe(0.5);
  });
});
