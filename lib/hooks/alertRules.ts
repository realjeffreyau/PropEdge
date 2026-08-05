import type { Prop } from "@/types";

export const ALERT_CONDITION_TYPES = [
  "EV_ABOVE",
  "CONFIDENCE_ABOVE",
  "LINE_MOVE_ABOVE",
] as const;

export type AlertConditionType = (typeof ALERT_CONDITION_TYPES)[number];

export interface AlertRuleLike {
  sportKey?: string | null;
  marketKey?: string | null;
  conditionType: AlertConditionType;
  threshold: number;
  active?: boolean;
}

/** Return the feed value available for an alert condition, if one exists. */
export function getAlertRuleMetric(
  rule: Pick<AlertRuleLike, "conditionType">,
  prop: Prop
): number | null {
  if (rule.conditionType === "EV_ABOVE") {
    return Number.isFinite(prop.evPercent) ? prop.evPercent : null;
  }

  if (rule.conditionType === "CONFIDENCE_ABOVE") {
    const confidence = prop.scores?.confidenceScore?.value;
    return Number.isFinite(confidence) ? confidence : null;
  }

  const rawProp = prop as unknown as Record<string, unknown>;
  const lineMove =
    rawProp.lineMovePercent ?? rawProp.lineMovementPercent ?? rawProp.lineMovement;
  return typeof lineMove === "number" && Number.isFinite(lineMove) ? lineMove : null;
}

/** Match one active rule against a single currently loaded prop. */
export function matchesAlertRule(rule: AlertRuleLike, prop: Prop): boolean {
  if (rule.active === false) return false;
  if (rule.sportKey && rule.sportKey !== prop.sportKey) return false;
  if (rule.marketKey && rule.marketKey !== prop.marketKey) return false;
  if (!Number.isFinite(rule.threshold)) return false;

  const metric = getAlertRuleMetric(rule, prop);
  return metric !== null && metric > rule.threshold;
}
