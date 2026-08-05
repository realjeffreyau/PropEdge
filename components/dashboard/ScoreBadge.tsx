import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  value: number;
  label?: string;
  size?: "sm" | "md";
}

function getScoreColor(value: number) {
  if (value >= 75) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (value >= 55) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-red-400 bg-red-500/10 border-red-500/20";
}

function getScoreBand(value: number) {
  if (value >= 75) return "High";
  if (value >= 55) return "Moderate";
  return "Low";
}

export function ScoreBadge({ value, label, size = "sm" }: ScoreBadgeProps) {
  const colorClass = getScoreColor(value);
  const scoreBand = getScoreBand(value);
  const displayLabel = label ?? scoreBand;
  const accessibleLabel = `${scoreBand} score: ${value.toFixed(0)} out of 100${
    label ? `, ${label}` : ""
  }`;

  return (
    <span
      role="img"
      title={accessibleLabel}
      aria-label={accessibleLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-data font-medium",
        size === "sm" ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm",
        colorClass
      )}
    >
      {value.toFixed(0)}
      <span className="text-[10px] font-sans opacity-80">{displayLabel}</span>
    </span>
  );
}

// Simple +EV / Off-Market / etc. label badges
type BadgeVariant =
  | "ev"
  | "highLiquidity"
  | "offMarket"
  | "bestLine"
  | "consensusEdge"
  | "lowDataQuality"
  | "staleOdds"
  | "mockMode";

const BADGE_STYLES: Record<BadgeVariant, string> = {
  ev:              "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  highLiquidity:   "bg-blue-500/10   border-blue-500/25   text-blue-400",
  offMarket:       "bg-orange-500/10 border-orange-500/25 text-orange-400",
  bestLine:        "bg-amber-500/10  border-amber-500/25  text-amber-400",
  consensusEdge:   "bg-violet-500/10 border-violet-500/25 text-violet-400",
  lowDataQuality:  "bg-red-500/10    border-red-500/25    text-red-400",
  staleOdds:       "bg-zinc-500/10   border-zinc-500/25   text-zinc-400",
  mockMode:        "bg-zinc-700/40   border-zinc-600/30   text-zinc-400",
};

const BADGE_LABELS: Record<BadgeVariant, string> = {
  ev:             "+EV",
  highLiquidity:  "High Liq",
  offMarket:      "Off Market",
  bestLine:       "Best Line",
  consensusEdge:  "Edge",
  lowDataQuality: "Low Data",
  staleOdds:      "Stale",
  mockMode:       "Mock",
};

interface LabelBadgeProps {
  variant: BadgeVariant;
}

export function LabelBadge({ variant }: LabelBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
        BADGE_STYLES[variant]
      )}
    >
      {BADGE_LABELS[variant]}
    </span>
  );
}
