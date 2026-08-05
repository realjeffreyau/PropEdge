// ─── American ↔ Decimal ↔ Implied Probability ─────────────────────────────

const MAX_FINITE = Number.MAX_VALUE;

function finiteOrFallback(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) return 1;
  const decimal = american > 0
    ? american / 100 + 1
    : 100 / Math.abs(american) + 1;
  return Math.max(1, finiteOrFallback(decimal, MAX_FINITE));
}

export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) return 0;
  const american = decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
  return finiteOrFallback(american, decimal >= 2 ? MAX_FINITE : -MAX_FINITE);
}

export function americanToImplied(american: number): number {
  if (!Number.isFinite(american)) return 0;
  const implied = american > 0
    ? 100 / (american + 100)
    : Math.abs(american) / (Math.abs(american) + 100);
  return finiteOrFallback(implied, 0);
}

export function impliedToAmerican(prob: number): number {
  if (!Number.isFinite(prob) || prob <= 0 || prob >= 1) return 0;
  const american = prob < 0.5
    ? Math.round(100 / prob - 100)
    : Math.round(-(prob * 100) / (1 - prob));
  return finiteOrFallback(american, prob < 0.5 ? MAX_FINITE : -MAX_FINITE);
}

export function decimalToImplied(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 0) return 0;
  return finiteOrFallback(1 / decimal, MAX_FINITE);
}

// ─── Vig removal (two-sided markets) ──────────────────────────────────────

export interface NoVigResult {
  probA: number;
  probB: number;
  hold: number; // bookmaker margin as a fraction
}

export function removeVig(impliedA: number, impliedB: number): NoVigResult {
  const total = impliedA + impliedB;
  if (!Number.isFinite(total) || total === 0) {
    return { probA: 0.5, probB: 0.5, hold: 0 };
  }

  const probA = impliedA / total;
  const probB = impliedB / total;
  const hold = total - 1;
  if (!Number.isFinite(probA) || !Number.isFinite(probB) || !Number.isFinite(hold)) {
    return { probA: 0.5, probB: 0.5, hold: 0 };
  }

  return {
    probA,
    probB,
    hold,
  };
}

// Remove vig from a single side given both sides' American odds
export function noVigProbFromAmerican(oddsA: number, oddsB: number): { probA: number; probB: number } {
  const implA = americanToImplied(oddsA);
  const implB = americanToImplied(oddsB);
  const result = removeVig(implA, implB);
  return { probA: result.probA, probB: result.probB };
}

// For a prop with only one side priced (over/under same line), estimate no-vig
// by assuming the other side is the complement
export function noVigProbSingleSide(oddsAmerican: number): number {
  const implied = americanToImplied(oddsAmerican);
  // Simple shrinkage toward 0.5 based on typical vig
  // For standard -110/-110 markets, hold is ~4.5%
  // Assume ~4% hold and split it evenly
  const estimatedHold = 0.04;
  const adjustedImplied = implied - estimatedHold / 2;
  return Math.max(0.01, Math.min(0.99, clampProbability(adjustedImplied)));
}

// ─── EV calculations ───────────────────────────────────────────────────────

export function calcEV(probability: number, oddsAmerican: number): number {
  if (!Number.isFinite(probability) || !Number.isFinite(oddsAmerican)) return 0;
  const decimal = americanToDecimal(oddsAmerican);
  // EV = (prob * profit) - (1 - prob) * stake
  // Normalized to stake = 1: EV = prob * (decimal - 1) - (1 - prob)
  return finiteOrFallback(
    probability * (decimal - 1) - (1 - probability),
    0,
  );
}

export function calcEdgePercent(estimatedProb: number, impliedProb: number): number {
  if (!Number.isFinite(estimatedProb) || !Number.isFinite(impliedProb)) return 0;
  return finiteOrFallback((estimatedProb - impliedProb) * 100, 0);
}

export function calcEVPercent(estimatedProb: number, oddsAmerican: number): number {
  return finiteOrFallback(calcEV(estimatedProb, oddsAmerican) * 100, 0);
}

// Full Kelly stake fraction for a decimal-odds bet. The caller can divide
// this by two for a half-Kelly stake.
export function calcKellyFraction(prob: number, decimalOdds: number): number {
  if (!Number.isFinite(prob) || !Number.isFinite(decimalOdds) || prob <= 0 || prob >= 1 || decimalOdds <= 1) {
    return 0;
  }

  const edge = prob * decimalOdds - 1;
  if (!Number.isFinite(edge) || edge <= 0) return 0;

  const fraction = edge / (decimalOdds - 1);
  return Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
}

export function calcFairOdds(probability: number): number {
  return impliedToAmerican(probability);
}

export function calcBreakEvenProb(oddsAmerican: number): number {
  return americanToImplied(oddsAmerican);
}

// ─── Consensus helpers ────────────────────────────────────────────────────

export function calcMedian(values: number[]): number {
  return calcMedianOrNull(values) ?? 0;
}

export function calcMedianOrNull(values: number[]): number | null {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return null;

  const sorted = [...finiteValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0
    ? sorted[mid]
    : sorted[mid - 1] / 2 + sorted[mid] / 2;
  return finiteOrFallback(median, 0);
}

export function calcMean(values: number[]): number {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length === 0) return 0;
  const mean = finiteValues.reduce(
    (sum, value) => sum + value / finiteValues.length,
    0,
  );
  return finiteOrFallback(mean, 0);
}

export function clampProbability(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.max(0.0001, Math.min(0.9999, p));
}

// No-vig consensus probability from multiple books' implied probabilities
export function calcNoVigConsensus(impliedProbs: number[]): number {
  if (impliedProbs.length === 0) return 0.5;
  // Each book's implied prob is slightly above fair value due to vig.
  // Estimate each book's hold and back out. Simple approach: take median
  // implied and shrink it by a standard vig estimate.
  const median = calcMedian(impliedProbs);
  // Standard vig on props is ~5-8%. Assume 6% hold split evenly = 3% per side.
  const vigAdjust = 0.03;
  return Math.max(0.01, Math.min(0.99, clampProbability(median - vigAdjust)));
}

// Consensus line (median line across books)
export function calcConsensusLine(lines: number[]): number {
  return calcMedian(lines);
}
