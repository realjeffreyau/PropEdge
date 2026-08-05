import { describe, expect, it } from "vitest";
import type { Prop } from "@/types";
import { getAlertRuleMetric, matchesAlertRule } from "@/lib/hooks/alertRules";

const prop = {
  id: "prop-1",
  sportKey: "basketball_nba",
  marketKey: "player_points",
  evPercent: 6.5,
  scores: { confidenceScore: { value: 82 } },
} as unknown as Prop;

describe("alert rule matching", () => {
  it("matches EV and confidence rules with sport and market scoping", () => {
    expect(matchesAlertRule({ sportKey: "basketball_nba", marketKey: "player_points", conditionType: "EV_ABOVE", threshold: 5 }, prop)).toBe(true);
    expect(matchesAlertRule({ sportKey: "basketball_nba", marketKey: "player_points", conditionType: "EV_ABOVE", threshold: 6.5 }, prop)).toBe(false);
    expect(matchesAlertRule({ sportKey: "basketball_nba", conditionType: "CONFIDENCE_ABOVE", threshold: 80 }, prop)).toBe(true);
    expect(matchesAlertRule({ sportKey: "basketball_wnba", conditionType: "EV_ABOVE", threshold: 1 }, prop)).toBe(false);
    expect(matchesAlertRule({ sportKey: "basketball_nba", marketKey: "player_rebounds", conditionType: "EV_ABOVE", threshold: 1 }, prop)).toBe(false);
  });

  it("does not invent line movement when the feed has no history, but supports it when present", () => {
    const rule = { sportKey: "basketball_nba", conditionType: "LINE_MOVE_ABOVE" as const, threshold: 1 };
    expect(getAlertRuleMetric(rule, prop)).toBeNull();
    expect(matchesAlertRule(rule, prop)).toBe(false);

    const propWithMovement = { ...prop, lineMovePercent: 1.5 } as unknown as Prop;
    expect(getAlertRuleMetric(rule, propWithMovement)).toBe(1.5);
    expect(matchesAlertRule(rule, propWithMovement)).toBe(true);
  });
});
