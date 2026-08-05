import type { Prop } from "@/types";

export interface PickGameGroup {
  key: string;
  gameLabel: string;
  commenceTime: string;
  props: Prop[];
}

/** Select positive-EV props at or above the user's confidence threshold. */
export function selectHighestConvictionPicks(
  props: Prop[],
  minConfidence = 70
): Prop[] {
  const threshold = Number.isFinite(minConfidence) ? minConfidence : 70;

  return props
    .filter((prop) => {
      const ev = Number(prop.evPercent);
      const confidence = Number(prop.scores?.confidenceScore?.value);
      return Number.isFinite(ev) && ev > 0 && Number.isFinite(confidence) && confidence >= threshold;
    })
    .sort((left, right) => {
      const confidenceDifference =
        right.scores.confidenceScore.value - left.scores.confidenceScore.value;
      if (confidenceDifference !== 0) return confidenceDifference;

      const evDifference = right.evPercent - left.evPercent;
      if (evDifference !== 0) return evDifference;

      return left.playerName.localeCompare(right.playerName) || left.id.localeCompare(right.id);
    });
}

/** Group an already-ranked pick list without changing the rank within a game. */
export function groupPicksByGame(props: Prop[]): PickGameGroup[] {
  const groups = new Map<string, PickGameGroup>();

  for (const prop of props) {
    const key = prop.eventId || prop.gameLabel || prop.id;
    const existing = groups.get(key);

    if (existing) {
      existing.props.push(prop);
      continue;
    }

    groups.set(key, {
      key,
      gameLabel: prop.gameLabel || "Game",
      commenceTime: prop.commenceTime,
      props: [prop],
    });
  }

  return Array.from(groups.values());
}

export function selectAndGroupPicks(props: Prop[], minConfidence = 70): PickGameGroup[] {
  return groupPicksByGame(selectHighestConvictionPicks(props, minConfidence));
}
