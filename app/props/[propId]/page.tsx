"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ScoreBadge, LabelBadge } from "@/components/dashboard/ScoreBadge";
import { SavePropButton } from "@/components/dashboard/SavePropButton";
import { useSavedProps } from "@/lib/hooks/useSavedProps";
import type { Prop } from "@/types";
import { format } from "date-fns";

function formatOdds(odds: number) {
  if (!Number.isFinite(odds) || odds === 0) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

interface PropDetailPageProps {
  params: Promise<{ propId: string }>;
}

export default function PropDetailPage({ params }: PropDetailPageProps) {
  const { propId } = use(params);
  const [prop, setProp] = useState<Prop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { savedPropIds, savingPropId, error: watchlistError, toggle: toggleSaved } = useSavedProps();

  useEffect(() => {
    let cancelled = false;

    async function loadProp() {
      setIsLoading(true);
      setProp(null);
      setNotFound(false);
      setError(null);

      try {
        const res = await fetch(`/api/props/${encodeURIComponent(propId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (res.status === 404) {
          setNotFound(true);
          return;
        }

        if (!res.ok) {
          setError(typeof data?.error === "string" ? data.error : "Failed to load prop.");
          return;
        }

        if (!data?.prop) {
          setError("Failed to load prop.");
          return;
        }

        setProp(data.prop as Prop);
      } catch {
        if (!cancelled) setError("Failed to load prop. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProp();
    return () => { cancelled = true; };
  }, [propId]);

  if (isLoading) {
    return (
      <AppShell isMockMode={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <p className="text-sm">Loading prop…</p>
        </div>
      </AppShell>
    );
  }

  if (notFound) {
    return (
      <AppShell isMockMode={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <p className="text-sm">Prop not found.</p>
          <Link href="/props" className="text-xs text-amber-400 hover:underline">
            ← Back to Props
          </Link>
        </div>
      </AppShell>
    );
  }

  if (error || !prop) {
    return (
      <AppShell isMockMode={false}>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <p className="text-sm text-red-400">{error ?? "Failed to load prop."}</p>
          <Link href="/props" className="text-xs text-amber-400 hover:underline">
            ← Back to Props
          </Link>
        </div>
      </AppShell>
    );
  }

  const scores = [
    { key: "EV Score",        score: prop.scores.evScore },
    { key: "Liquidity",       score: prop.scores.liquidityScore },
    { key: "Prob Edge",       score: prop.scores.probabilityEdgeScore },
    { key: "Data Quality",    score: prop.scores.dataQualityScore },
    { key: "Confidence",      score: prop.scores.confidenceScore },
  ];

  return (
    <AppShell isMockMode={prop.isMock}>
      {/* Back */}
      <Link
        href="/props"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
      >
        <ArrowLeftIcon className="w-3 h-3" />
        Back to Props
      </Link>

      {/* Header */}
      <div className="glass-card p-5 mb-4">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-display font-semibold text-foreground">
                {prop.playerName}
              </h1>
              {prop.teamAbbr && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {prop.teamAbbr}
                </span>
              )}
              {prop.isMock && <LabelBadge variant="mockMode" />}
            </div>
            <p className="text-sm text-muted-foreground">
              {prop.marketLabel} · {prop.side} {prop.line} · {prop.gameLabel}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {format(new Date(prop.commenceTime), "EEEE, MMMM d · h:mm a")}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <SavePropButton
              isSaved={savedPropIds.has(prop.id)}
              isSaving={savingPropId === prop.id}
              onClick={() => void toggleSaved(prop)}
              playerName={prop.playerName}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <ScoreBadge value={prop.scores.confidenceScore.value} size="md" />
            </div>
            <p className="text-xs text-muted-foreground">
              Est. Hit Prob:{" "}
              <span className="font-data text-foreground">
                {(prop.estimatedHitProbability * 100).toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      {watchlistError && (
        <p className="mb-4 text-xs text-orange-300" role="status">
          Watchlist unavailable: {watchlistError}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Odds by book */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-semibold mb-3">Odds by Book / Platform</h2>
          <table className="w-full text-xs" aria-label="Odds by book or platform">
            <caption className="sr-only">
              Odds for {prop.playerName} {prop.side} {prop.line} {prop.marketLabel}, by book or platform
            </caption>
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left pb-2">Book</th>
                <th className="text-right pb-2">Line</th>
                <th className="text-right pb-2">Odds</th>
                <th className="text-right pb-2">Implied</th>
              </tr>
            </thead>
            <tbody>
              {prop.bookOdds.map((b) => (
                <tr key={b.bookmakerKey} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">
                    <span className="text-foreground">{b.bookmakerLabel}</span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                      {b.bookmakerType === "DFS" ? "DFS" : "SB"}
                    </span>
                  </td>
                  <td className="text-right font-data">{b.line ?? "—"}</td>
                  <td className={`text-right font-data font-medium ${b.oddsAmerican > 0 ? "text-emerald-400" : "text-foreground"}`}>
                    {formatOdds(b.oddsAmerican)}
                  </td>
                  <td className="text-right font-data text-muted-foreground">
                    {(b.impliedProbability * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Market consensus (no-vig)</span>
              <span className="font-data text-foreground">
                {(prop.marketConsensusProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Best available</span>
              <span className="font-data text-amber-400">
                {formatOdds(prop.bestAvailableOdds)} @ {prop.bestAvailableBookLabel}
              </span>
            </div>
          </div>
        </div>

        {/* EV breakdown */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-display font-semibold mb-3">EV Breakdown</h2>
          <div className="space-y-2 text-xs">
            {[
              ["Est. Hit Probability",     `${(prop.estimatedHitProbability * 100).toFixed(1)}%`],
              ["No-Vig Probability",       `${(prop.noVigProbability * 100).toFixed(1)}%`],
              ["Fair Odds (American)",     `${formatOdds(prop.fairOddsAmerican)}`],
              ["Best Available Odds",      `${formatOdds(prop.bestAvailableOdds)}`],
              ["Edge %",                   `${prop.edgePercent >= 0 ? "+" : ""}${prop.edgePercent.toFixed(1)}%`],
              ["EV %",                     `${prop.evPercent >= 0 ? "+" : ""}${prop.evPercent.toFixed(1)}%`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-muted-foreground">
                <span>{label}</span>
                <span className="font-data text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">{prop.explanation}</p>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-display font-semibold mb-4">Score Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {scores.map(({ key, score }) => (
            <div key={key} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{key}</span>
                <ScoreBadge value={score.value} />
              </div>
              <p className="text-xs font-medium text-foreground">{score.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{score.explanation}</p>
              {score.dataWarning && (
                <p className="text-[10px] text-orange-400">{score.dataWarning}</p>
              )}
              <ul className="mt-1 space-y-0.5">
                {score.factors.map((f, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground/70 flex items-start gap-1">
                    <span className="text-amber-500 mt-0.5">·</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/40 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Whale/Steam</span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">N/A</span>
            </div>
            <p className="text-xs font-medium text-zinc-500">Placeholder</p>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              Insufficient movement data. Whale/steam detection requires odds snapshot history.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
