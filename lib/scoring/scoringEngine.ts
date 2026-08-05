import type { NormalizedOutcome, NormalizedPropGroup } from "@/lib/odds/types";
import type { BookOdds, Prop, PropScores, ScoreDetail } from "@/types";
import {
  calcEdgePercent,
  calcEVPercent,
  calcFairOdds,
  calcKellyFraction,
  calcMedianOrNull,
  clampProbability,
  decimalToAmerican,
  decimalToImplied,
  impliedToAmerican,
  noVigProbSingleSide,
  removeVig,
} from "@/lib/utils/oddsConversions";
import { marketKeyToLabel, normalizeMarketKey, normalizePlayerName } from "@/lib/utils/propNormalizer";

// ─── Scoring weights (defaults, overridable via ModelSettings) ────────────

export interface ScoringWeights {
  evWeight: number;
  liquidityWeight: number;
  probabilityEdgeWeight: number;
  whaleWeight: number;
  dataQualityWeight: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  evWeight: 0.40,
  liquidityWeight: 0.20,
  probabilityEdgeWeight: 0.15,
  whaleWeight: 0.0,
  dataQualityWeight: 0.25,
};

const DFS_BOOKMAKER_KEYS = new Set(["underdog", "prizepicks", "pick6", "betr_us_dfs"]);
const MAX_REPORTED_VALUE_PERCENT = 50;
const IMPLAUSIBLE_EV_PERCENT = 15;
const IMPLAUSIBLE_EDGE_WARNING = "Edge is implausibly large and likely reflects a stale or mismatched line.";

interface ScoringContext {
  groups: NormalizedPropGroup[];
  groupsByLine: Map<string, NormalizedPropGroup[]>;
}

interface PairedBook {
  bookmakerKey: string;
  probability: number;
  hold: number;
}

interface SideCoverage {
  lineOffers: number[];
  currentBookCount: number;
  allLineBookCount: number;
  lineCoverageRatio: number;
  consensusLine: number;
}

interface MarketStats {
  bookOdds: BookOdds[];
  pairedBooks: PairedBook[];
  fairProbability: number;
  usedSingleSideFallback: boolean;
  medianHold: number | null;
  coverage: SideCoverage;
}

interface LeaveOneOutResult {
  probability: number;
  usedAllBooksFallback: boolean;
  remainingBookCount: number;
}

// ─── Batch and single-group entry points ──────────────────────────────────

/**
 * Score all groups from one provider fetch so Over/Under (or Yes/No) groups
 * can share the same two-sided market data.
 */
export function scoreAllPropGroups(
  groups: NormalizedPropGroup[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Prop[] {
  const context = createScoringContext(groups);
  return groups.map((group) => scoreGroup(group, weights, context));
}

/**
 * Preserve the existing single-group API. With no batch context this follows
 * the same scorer, but correctly uses the single-side fallback.
 */
export function scorePropGroup(
  group: NormalizedPropGroup,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): Prop {
  return scoreAllPropGroups([group], weights)[0];
}

function scoreGroup(
  group: NormalizedPropGroup,
  weights: ScoringWeights,
  context: ScoringContext
): Prop {
  const line = safeLine(group.line);
  const bookOdds = buildBookOdds(group.outcomes, line);

  if (bookOdds.length === 0) {
    return buildEmptyProp(group, context);
  }

  const marketStats = buildMarketStats(group, bookOdds, context);
  const bestBookOdds = bookOdds.reduce((best, book) =>
    book.oddsDecimal > best.oddsDecimal ? book : best
  );
  const bestAmerican = finiteNumber(bestBookOdds.oddsAmerican, 0);
  const bestDecimal = finiteNumber(bestBookOdds.oddsDecimal, 1);
  const allBooksProbability = clampProbability(marketStats.fairProbability);
  const leaveOneOut = calcLeaveOneOutFairProbability(
    marketStats.pairedBooks,
    bestBookOdds.bookmakerKey,
    allBooksProbability
  );
  const leaveOneOutProbability = leaveOneOut.probability;
  const estimatedProbability = allBooksProbability;

  const rawEdgePercent = calcEdgePercent(
    leaveOneOutProbability,
    bestBookOdds.impliedProbability
  );
  const rawEvPercent = calcEVPercent(leaveOneOutProbability, bestAmerican);
  const edgePercent = clampPercent(rawEdgePercent);
  const evPercent = clampPercent(rawEvPercent);
  const hasImplausibleEv = rawEvPercent > IMPLAUSIBLE_EV_PERCENT;

  const evScore = scoreEV(
    leaveOneOutProbability,
    bestAmerican,
    edgePercent,
    evPercent,
    rawEvPercent,
    bookOdds.length,
    hasImplausibleEv
  );
  const liquidityScore = scoreLiquidity(bookOdds, marketStats.coverage);
  const probabilityEdgeScore = scoreProbabilityEdge(bookOdds);
  const dataQualityScore = scoreDataQuality({
    bookOdds,
    pairedBooks: marketStats.pairedBooks,
    usedSingleSideFallback: marketStats.usedSingleSideFallback,
    medianHold: marketStats.medianHold,
    coverage: marketStats.coverage,
    leaveOneOutFallback: leaveOneOut.usedAllBooksFallback,
    implausibleEv: hasImplausibleEv,
  });
  const confidenceScore = scoreConfidence(
    evScore,
    liquidityScore,
    probabilityEdgeScore,
    dataQualityScore,
    null,
    weights
  );

  const scores: PropScores = {
    evScore,
    liquidityScore,
    probabilityEdgeScore,
    dataQualityScore,
    whaleScore: null,
    confidenceScore,
  };
  const consensusLine = marketStats.coverage.consensusLine;

  return {
    id: buildPropId(group),
    sportKey: group.sportKey as Prop["sportKey"],
    eventId: group.eventId,
    gameLabel: group.gameLabel,
    commenceTime: group.commenceTime,
    playerName: group.playerName,
    marketKey: group.marketKey,
    marketLabel: marketKeyToLabel(group.marketKey),
    side: group.side as Prop["side"],
    line,
    isAltLine: line !== consensusLine,
    bookOdds,
    marketConsensusLine: consensusLine,
    marketConsensusProbability: allBooksProbability,
    bestAvailableOdds: bestAmerican,
    bestAvailableBookKey: bestBookOdds.bookmakerKey,
    bestAvailableBookLabel: bestBookOdds.bookmakerLabel,
    scores,
    estimatedHitProbability: estimatedProbability,
    noVigProbability: allBooksProbability,
    edgePercent,
    evPercent,
    fairOddsAmerican: finiteNumber(calcFairOdds(allBooksProbability), -100),
    kellyFraction: calcKellyFraction(leaveOneOutProbability, bestDecimal),
    halfKellyFraction: calcKellyFraction(leaveOneOutProbability, bestDecimal) / 2,
    riskLevel:
      confidenceScore.value >= 70 ? "LOW" : confidenceScore.value >= 45 ? "MEDIUM" : "HIGH",
    explanation: buildExplanation(
      group,
      allBooksProbability,
      estimatedProbability,
      bestAmerican,
      bestBookOdds.bookmakerLabel,
      edgePercent,
      evPercent,
      marketStats.usedSingleSideFallback,
      hasImplausibleEv
    ),
    isMock: false,
    lastRefreshed: new Date().toISOString(),
  };
}

// ─── Two-sided market calculations ────────────────────────────────────────

function createScoringContext(groups: NormalizedPropGroup[]): ScoringContext {
  const groupsByLine = new Map<string, NormalizedPropGroup[]>();

  for (const group of groups) {
    const key = buildGroupLineKey(group);
    const matchingGroups = groupsByLine.get(key) ?? [];
    matchingGroups.push(group);
    groupsByLine.set(key, matchingGroups);
  }

  return { groups, groupsByLine };
}

function buildMarketStats(
  group: NormalizedPropGroup,
  bookOdds: BookOdds[],
  context: ScoringContext
): MarketStats {
  const oppositeGroup = findOppositeGroup(group, context);
  const oppositeOdds = oppositeGroup
    ? buildBookOdds(oppositeGroup.outcomes, safeLine(oppositeGroup.line))
    : [];
  const oppositeByBook = new Map(oppositeOdds.map((book) => [book.bookmakerKey, book]));
  const pairedBooks: PairedBook[] = [];

  for (const book of bookOdds) {
    if (book.bookmakerType !== "SPORTSBOOK") continue;

    const opposite = oppositeByBook.get(book.bookmakerKey);
    if (!opposite || opposite.bookmakerType !== "SPORTSBOOK") continue;

    const noVig = removeVig(book.impliedProbability, opposite.impliedProbability);
    if (Number.isFinite(noVig.probA) && Number.isFinite(noVig.hold)) {
      pairedBooks.push({
        bookmakerKey: book.bookmakerKey,
        probability: clampProbability(noVig.probA),
        hold: finiteNumber(noVig.hold, 0),
      });
    }
  }

  const pairedMedian = calcMedianOrNull(pairedBooks.map((book) => book.probability));
  const medianHold = calcMedianOrNull(pairedBooks.map((book) => book.hold));
  const sportsbookImplied = bookOdds
    .filter((book) => book.bookmakerType === "SPORTSBOOK")
    .map((book) => book.impliedProbability);
  const medianImplied = calcMedianOrNull(sportsbookImplied);

  let fairProbability: number;
  let usedSingleSideFallback = false;
  if (pairedMedian !== null) {
    fairProbability = pairedMedian;
  } else if (medianImplied !== null) {
    fairProbability = noVigProbSingleSide(impliedToAmerican(medianImplied));
    usedSingleSideFallback = true;
  } else {
    // DFS prices are never allowed to become a fair-value estimate on their
    // own. With no sportsbook anchor, keep the estimate neutral and flag it.
    fairProbability = 0.5;
    usedSingleSideFallback = true;
  }

  return {
    bookOdds,
    pairedBooks,
    fairProbability: clampProbability(fairProbability),
    usedSingleSideFallback,
    medianHold,
    coverage: buildSideCoverage(group, bookOdds, context),
  };
}

function calcLeaveOneOutFairProbability(
  pairedBooks: PairedBook[],
  bookmakerKey: string,
  allBooksProbability: number
): LeaveOneOutResult {
  const remainingBooks = pairedBooks.filter((book) => book.bookmakerKey !== bookmakerKey);
  if (remainingBooks.length < 2) {
    return {
      probability: clampProbability(allBooksProbability),
      usedAllBooksFallback: true,
      remainingBookCount: remainingBooks.length,
    };
  }

  return {
    probability: clampProbability(calcMedianOrNull(remainingBooks.map((book) => book.probability)) ?? allBooksProbability),
    usedAllBooksFallback: false,
    remainingBookCount: remainingBooks.length,
  };
}

function findOppositeGroup(
  group: NormalizedPropGroup,
  context: ScoringContext
): NormalizedPropGroup | undefined {
  const opposite = oppositeSide(group.side);
  if (!opposite) return undefined;

  return context.groupsByLine
    .get(buildGroupLineKey(group))
    ?.find((candidate) => normalizeSide(candidate.side) === opposite);
}

function oppositeSide(side: string): string | undefined {
  const normalizedSide = normalizeSide(side);
  if (normalizedSide === "over") return "under";
  if (normalizedSide === "under") return "over";
  if (normalizedSide === "yes") return "no";
  if (normalizedSide === "no") return "yes";
  return undefined;
}

function normalizeSide(side: string): string {
  return String(side).trim().toLowerCase();
}

// ─── Build BookOdds from normalized outcomes ───────────────────────────────

function buildBookOdds(outcomes: NormalizedOutcome[], fallbackLine: number): BookOdds[] {
  const bookMap = new Map<string, BookOdds>();

  for (const outcome of outcomes) {
    if (!Number.isFinite(outcome.price) || outcome.price <= 1) continue;

    const impliedProbability = decimalToImplied(outcome.price);
    if (!Number.isFinite(impliedProbability) || impliedProbability <= 0) continue;

    const line = typeof outcome.point === "number" && Number.isFinite(outcome.point)
      ? outcome.point
      : fallbackLine;
    const entry: BookOdds = {
      bookmakerKey: outcome.bookmakerKey,
      bookmakerLabel: outcome.bookmakerTitle,
      bookmakerType: isDFS(outcome.bookmakerKey) ? "DFS" : "SPORTSBOOK",
      line: finiteNumber(line, 0),
      oddsAmerican: finiteNumber(decimalToAmerican(outcome.price), 0),
      oddsDecimal: finiteNumber(outcome.price, 1),
      impliedProbability: finiteNumber(impliedProbability, 0),
      lastUpdated: outcome.lastUpdate,
    };

    const existing = bookMap.get(outcome.bookmakerKey);
    if (!existing || entry.oddsDecimal > existing.oddsDecimal) {
      bookMap.set(outcome.bookmakerKey, entry);
    }
  }

  return Array.from(bookMap.values());
}

// ─── Liquidity, edge, and quality scores ──────────────────────────────────

function scoreEV(
  estimatedProbability: number,
  bestOddsAmerican: number,
  edgePercent: number,
  evPercent: number,
  rawEvPercent: number,
  bookCount: number,
  hasImplausibleEv: boolean
): ScoreDetail {
  const scoreEvPercent = clampPercent(rawEvPercent);
  const uncappedValue = Math.max(0, Math.min(100, 50 + scoreEvPercent * 5));
  const value = Math.round(hasImplausibleEv ? Math.min(65, uncappedValue) : uncappedValue);
  const bestOddsString = formatAmericanOdds(bestOddsAmerican);

  let label: string;
  if (hasImplausibleEv) label = "Guarded +EV";
  else if (evPercent >= 6) label = "Elite +EV";
  else if (evPercent >= 3) label = "Strong +EV";
  else if (evPercent >= 1) label = "Slight +EV";
  else if (evPercent >= -1) label = "Near Fair Value";
  else label = "Negative EV";

  return {
    value,
    label,
    explanation: `Best odds ${bestOddsString}. Leave-one-out edge ${signedPercent(edgePercent)}, EV ${signedPercent(evPercent)}.${hasImplausibleEv ? ` ${IMPLAUSIBLE_EDGE_WARNING}` : ""}`,
    factors: [
      `Leave-one-out probability: ${(clampProbability(estimatedProbability) * 100).toFixed(1)}%`,
      `Best odds: ${bestOddsString}`,
      `Edge: ${signedPercent(edgePercent)}`,
      `EV: ${signedPercent(evPercent)}`,
      `${bookCount} book${bookCount !== 1 ? "s" : ""} tracked`,
      ...(hasImplausibleEv ? [IMPLAUSIBLE_EDGE_WARNING] : []),
    ],
  };
}

function scoreLiquidity(bookOdds: BookOdds[], coverage: SideCoverage): ScoreDetail {
  const bookCount = bookOdds.length;
  const sportsbookCount = bookOdds.filter((book) => book.bookmakerType === "SPORTSBOOK").length;
  const dfsCount = bookOdds.filter((book) => book.bookmakerType === "DFS").length;
  const decimals = bookOdds.map((book) => book.oddsDecimal);
  const oddsVariance = decimals.length > 1 ? stdDev(decimals) : 0;
  const oddsConsistent = oddsVariance < 0.15;
  const currentLineCount = coverage.currentBookCount;
  const allLineCount = coverage.allLineBookCount;

  let score = 0;
  score += Math.min(40, bookCount * 8);
  score += sportsbookCount >= 2 ? 20 : sportsbookCount * 10;
  score += Math.round(coverage.lineCoverageRatio * 20);
  score += oddsConsistent ? 15 : 5;
  score += dfsCount > 0 ? 5 : 0;

  const value = clampScore(score);
  let label: string;
  if (value >= 80) label = "Elite Liquidity";
  else if (value >= 65) label = "High Liquidity";
  else if (value >= 45) label = "Moderate Liquidity";
  else label = "Low Liquidity";

  return {
    value,
    label,
    explanation: `${bookCount} book${bookCount !== 1 ? "s" : ""} tracking this prop. ${currentLineCount}/${allLineCount || 0} qualifying books offer this line.`,
    factors: [
      `${bookCount} total books`,
      `${sportsbookCount} sportsbooks`,
      `${dfsCount} DFS platforms`,
      `${currentLineCount}/${allLineCount || 0} qualifying books at this line`,
      oddsConsistent ? "Odds consistent" : "Odds vary across books",
    ],
  };
}

function scoreProbabilityEdge(bookOdds: BookOdds[]): ScoreDetail {
  if (bookOdds.length === 0) {
    return { value: 0, label: "No Data", explanation: "No book prices available for line shopping.", factors: [] };
  }

  const impliedProbabilities = bookOdds.map((book) => book.impliedProbability);
  const medianImplied = calcMedianOrNull(impliedProbabilities) ?? 0.5;
  const bestImplied = Math.min(...impliedProbabilities);
  const lineShoppingPoints = finiteNumber((medianImplied - bestImplied) * 100, 0);
  const value = clampScore(50 + lineShoppingPoints * 10);

  let label: string;
  if (lineShoppingPoints >= 5) label = "Exceptional Line Shopping";
  else if (lineShoppingPoints >= 3) label = "Strong Line Shopping";
  else if (lineShoppingPoints >= 1) label = "Useful Line Shopping";
  else if (lineShoppingPoints >= 0.25) label = "Small Line Shopping";
  else label = "No Shopping Advantage";

  return {
    value,
    label,
    explanation: `Median book implied ${(medianImplied * 100).toFixed(1)}% vs best implied ${(bestImplied * 100).toFixed(1)}%. Line-shopping value: ${signedPoints(lineShoppingPoints)} points.`,
    factors: [
      `Median book implied: ${(medianImplied * 100).toFixed(1)}%`,
      `Best available implied: ${(bestImplied * 100).toFixed(1)}%`,
      `Line-shopping value: ${signedPoints(lineShoppingPoints)} points`,
    ],
  };
}

interface DataQualityInput {
  bookOdds: BookOdds[];
  pairedBooks: PairedBook[];
  usedSingleSideFallback: boolean;
  medianHold: number | null;
  coverage: SideCoverage;
  leaveOneOutFallback: boolean;
  implausibleEv: boolean;
}

function scoreDataQuality(input: DataQualityInput): ScoreDetail {
  const {
    bookOdds,
    pairedBooks,
    usedSingleSideFallback,
    medianHold,
    coverage,
    leaveOneOutFallback,
    implausibleEv,
  } = input;
  const bookCount = bookOdds.length;
  const qualifyingBookCount = pairedBooks.length;
  const lineVariance = coverage.lineOffers.length > 1 ? stdDev(coverage.lineOffers) : 0;
  const hasLargeLineDiscrepancy = lineVariance >= 1;
  const holdIsPlausible = medianHold !== null && medianHold >= 0.01 && medianHold <= 0.12;

  const finiteUpdateTimes = bookOdds
    .map((book) => new Date(book.lastUpdated).getTime())
    .filter((time) => Number.isFinite(time));
  const oldestUpdate = finiteUpdateTimes.length > 0 ? Math.min(...finiteUpdateTimes) : Date.now();
  const ageMinutes = Math.max(0, (Date.now() - oldestUpdate) / 60000);
  const isStale = ageMinutes > 30;

  let score = 0;
  score += Math.min(15, bookCount * 5);
  score += Math.min(15, qualifyingBookCount * 5);
  score += usedSingleSideFallback ? 0 : 25;
  score += !usedSingleSideFallback && holdIsPlausible ? 15 : 0;
  score += hasLargeLineDiscrepancy ? 5 : 15;
  score += isStale ? 0 : 15;
  if (leaveOneOutFallback) score -= 10;
  if (implausibleEv) score -= 15;

  const warnings: string[] = [];
  if (usedSingleSideFallback) {
    warnings.push("True two-sided de-vig unavailable; single-side fallback used");
  }
  if (qualifyingBookCount === 0) {
    warnings.push("No qualifying sportsbooks contributed to fair value");
  } else if (qualifyingBookCount < 2) {
    warnings.push("Fewer than 2 qualifying sportsbooks contributed to the consensus");
  }
  if (medianHold !== null && !holdIsPlausible) {
    const holdPercent = (medianHold * 100).toFixed(2);
    warnings.push(`Observed median hold ${holdPercent}% is implausible (expected 1%-12%)`);
  }
  if (isStale) warnings.push("Odds may be stale (>30 min old)");
  if (hasLargeLineDiscrepancy) {
    warnings.push(`Large line discrepancy across books (±${lineVariance.toFixed(1)})`);
  }
  if (bookCount < 2) warnings.push("Only one book — low confidence");
  if (leaveOneOutFallback) {
    warnings.push("Leave-one-out benchmark unavailable with fewer than 2 qualifying sportsbooks; all-books consensus used");
  }
  if (implausibleEv) warnings.push(IMPLAUSIBLE_EDGE_WARNING);

  const method = usedSingleSideFallback ? "single-side fallback" : "two-sided de-vig";
  const holdText = medianHold === null ? "no hold observed" : `median hold ${(medianHold * 100).toFixed(2)}%`;

  return {
    value: clampScore(score),
    label: dataQualityLabel(clampScore(score)),
    explanation: `${bookCount} book${bookCount !== 1 ? "s" : ""}; ${qualifyingBookCount} qualifying sportsbooks; ${method}; ${holdText}. ${warnings.join(" ")}`,
    factors: [
      `${bookCount} books with odds`,
      `${qualifyingBookCount} qualifying sportsbooks contributed`,
      usedSingleSideFallback ? "Single-side fallback" : "True two-sided de-vig",
      medianHold === null ? "No median hold" : `Median hold: ${(medianHold * 100).toFixed(2)}%`,
      hasLargeLineDiscrepancy ? `Line variance: ${lineVariance.toFixed(2)}` : "Lines agree",
      isStale ? `Odds age: ~${Math.round(ageMinutes)}m` : "Odds are fresh",
      ...(leaveOneOutFallback ? ["Leave-one-out fallback used"] : []),
    ],
    dataWarning: warnings.length > 0 ? warnings.join(". ") : undefined,
  };
}

function scoreConfidence(
  evScore: ScoreDetail,
  liquidityScore: ScoreDetail,
  probabilityEdgeScore: ScoreDetail,
  dataQualityScore: ScoreDetail,
  whaleScore: ScoreDetail | null,
  weights: ScoringWeights
): ScoreDetail {
  const evWeight = safeWeight(weights.evWeight);
  const liquidityWeight = safeWeight(weights.liquidityWeight);
  const probabilityEdgeWeight = safeWeight(weights.probabilityEdgeWeight);
  const dataQualityWeight = safeWeight(weights.dataQualityWeight);
  const whaleWeight = whaleScore ? safeWeight(weights.whaleWeight) : 0;
  const totalWeight = evWeight + liquidityWeight + probabilityEdgeWeight + dataQualityWeight + whaleWeight;

  const weighted =
    evScore.value * evWeight +
    liquidityScore.value * liquidityWeight +
    probabilityEdgeScore.value * probabilityEdgeWeight +
    dataQualityScore.value * dataQualityWeight +
    (whaleScore ? whaleScore.value * whaleWeight : 0);
  const value = totalWeight > 0 ? clampScore(weighted / totalWeight) : 0;

  let label: string;
  if (value >= 80) label = "Very High Confidence";
  else if (value >= 65) label = "High Confidence";
  else if (value >= 50) label = "Moderate Confidence";
  else if (value >= 35) label = "Low Confidence";
  else label = "Very Low Confidence";

  return {
    value,
    label,
    explanation: `Weighted composite: EV ${evScore.value}, Liquidity ${liquidityScore.value}, Shopping ${probabilityEdgeScore.value}, Data ${dataQualityScore.value}.`,
    factors: [
      `EV Score: ${evScore.value} (${Math.round(evWeight * 100)}%)`,
      `Liquidity: ${liquidityScore.value} (${Math.round(liquidityWeight * 100)}%)`,
      `Line Shopping: ${probabilityEdgeScore.value} (${Math.round(probabilityEdgeWeight * 100)}%)`,
      `Data Quality: ${dataQualityScore.value} (${Math.round(dataQualityWeight * 100)}%)`,
      whaleScore ? `Whale/Steam: ${whaleScore.value} (${Math.round(whaleWeight * 100)}%)` : "Whale/Steam: N/A",
    ],
  };
}

// ─── Line and output helpers ──────────────────────────────────────────────

function buildSideCoverage(
  group: NormalizedPropGroup,
  currentBookOdds: BookOdds[],
  context: ScoringContext
): SideCoverage {
  const matchingGroups = context.groups.filter((candidate) => sameSideMarket(candidate, group));
  const allBookKeys = new Set<string>();
  const lineOffers: number[] = [];

  for (const matchingGroup of matchingGroups) {
    const odds = matchingGroup === group
      ? currentBookOdds
      : buildBookOdds(matchingGroup.outcomes, safeLine(matchingGroup.line));
    for (const book of odds) {
      allBookKeys.add(book.bookmakerKey);
      lineOffers.push(finiteNumber(book.line ?? safeLine(matchingGroup.line), safeLine(matchingGroup.line)));
    }
  }

  const fallbackLine = safeLine(group.line);
  const normalizedLineOffers = lineOffers.length > 0 ? lineOffers : [fallbackLine];
  const currentBookKeys = new Set(currentBookOdds.map((book) => book.bookmakerKey));
  const allLineBookCount = allBookKeys.size;
  const currentBookCount = currentBookKeys.size;
  const lineCoverageRatio = allLineBookCount > 0 ? currentBookCount / allLineBookCount : 0;

  return {
    lineOffers: normalizedLineOffers,
    currentBookCount,
    allLineBookCount,
    lineCoverageRatio: finiteNumber(Math.max(0, Math.min(1, lineCoverageRatio)), 0),
    consensusLine: finiteNumber(calcMedianOrNull(normalizedLineOffers) ?? fallbackLine, fallbackLine),
  };
}

function sameSideMarket(a: NormalizedPropGroup, b: NormalizedPropGroup): boolean {
  return a.eventId === b.eventId &&
    normalizePlayerName(a.playerName) === normalizePlayerName(b.playerName) &&
    normalizeMarketKey(a.marketKey) === normalizeMarketKey(b.marketKey) &&
    normalizeSide(a.side) === normalizeSide(b.side);
}

function buildGroupLineKey(group: NormalizedPropGroup): string {
  return `${group.eventId}|${normalizePlayerName(group.playerName)}|${normalizeMarketKey(group.marketKey)}|${safeLine(group.line)}`;
}

function buildPropId(group: NormalizedPropGroup): string {
  const key = `${group.eventId}-${group.playerName}-${group.marketKey}-${group.side}-${safeLine(group.line)}`;
  return key.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
}

function buildEmptyProp(group: NormalizedPropGroup, context: ScoringContext): Prop {
  const coverage = buildSideCoverage(group, [], context);
  const emptyScore: ScoreDetail = {
    value: 0,
    label: "No Data",
    explanation: "No odds available.",
    factors: [],
    dataWarning: "No odds available.",
  };
  const line = safeLine(group.line);
  const consensusLine = coverage.consensusLine;

  return {
    id: buildPropId(group),
    sportKey: group.sportKey as Prop["sportKey"],
    eventId: group.eventId,
    gameLabel: group.gameLabel,
    commenceTime: group.commenceTime,
    playerName: group.playerName,
    marketKey: group.marketKey,
    marketLabel: marketKeyToLabel(group.marketKey),
    side: group.side as Prop["side"],
    line,
    isAltLine: line !== consensusLine,
    bookOdds: [],
    marketConsensusLine: consensusLine,
    marketConsensusProbability: 0.5,
    bestAvailableOdds: 0,
    bestAvailableBookKey: "",
    bestAvailableBookLabel: "",
    scores: {
      evScore: emptyScore,
      liquidityScore: emptyScore,
      probabilityEdgeScore: emptyScore,
      dataQualityScore: emptyScore,
      whaleScore: null,
      confidenceScore: emptyScore,
    },
    estimatedHitProbability: 0.5,
    noVigProbability: 0.5,
    edgePercent: 0,
    evPercent: 0,
    fairOddsAmerican: -100,
    kellyFraction: 0,
    halfKellyFraction: 0,
    riskLevel: "HIGH",
    explanation: "Insufficient data to score this prop.",
    isMock: false,
    lastRefreshed: new Date().toISOString(),
  };
}

function buildExplanation(
  group: NormalizedPropGroup,
  allBooksProbability: number,
  leaveOneOutProbability: number,
  bestOdds: number,
  bestBook: string,
  edgePercent: number,
  evPercent: number,
  usedSingleSideFallback: boolean,
  hasImplausibleEv: boolean
): string {
  const oddsString = formatAmericanOdds(bestOdds);
  const method = usedSingleSideFallback ? "single-side fallback" : "two-sided de-vig";
  const explanation = `${group.playerName} ${group.side} ${safeLine(group.line)} ${marketKeyToLabel(group.marketKey)}. Best available ${oddsString} at ${bestBook}. All-books fair probability ${(allBooksProbability * 100).toFixed(1)}%; leave-one-out probability ${(leaveOneOutProbability * 100).toFixed(1)}% using ${method}. Edge ${signedPercent(edgePercent)}, EV ${signedPercent(evPercent)}. Market-derived estimate — no external stats used.`;
  return hasImplausibleEv ? `${explanation} ${IMPLAUSIBLE_EDGE_WARNING}` : explanation;
}

function isDFS(bookmakerKey: string): boolean {
  return DFS_BOOKMAKER_KEYS.has(bookmakerKey.toLowerCase());
}

function safeWeight(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function safeLine(line: number): number {
  return finiteNumber(line, 0);
}

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number): number {
  return Math.max(-MAX_REPORTED_VALUE_PERCENT, Math.min(MAX_REPORTED_VALUE_PERCENT, finiteNumber(value, 0)));
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, finiteNumber(value, 0))));
}

function stdDev(values: number[]): number {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  if (finiteValues.length < 2) return 0;
  const mean = finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
  const variance = finiteValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / finiteValues.length;
  return Math.sqrt(Math.max(0, finiteNumber(variance, 0)));
}

function formatAmericanOdds(odds: number): string {
  const safeOdds = finiteNumber(odds, 0);
  return safeOdds > 0 ? `+${safeOdds}` : `${safeOdds}`;
}

function signedPercent(value: number): string {
  const safeValue = clampPercent(value);
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(1)}%`;
}

function signedPoints(value: number): string {
  const safeValue = finiteNumber(value, 0);
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(2)}`;
}

function dataQualityLabel(value: number): string {
  if (value >= 80) return "Excellent Data";
  if (value >= 60) return "Good Data";
  if (value >= 40) return "Fair Data";
  return "Low Data Quality";
}
