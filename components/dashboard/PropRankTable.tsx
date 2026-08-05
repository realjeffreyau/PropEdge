"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreBadge, LabelBadge } from "./ScoreBadge";
import { SavePropButton } from "./SavePropButton";
import type { Prop, ScoreDetail, SortField } from "@/types";
import { getBookLabel, ALL_BOOKS_KEY } from "@/constants/bookmakers";
import { cn } from "@/lib/utils";
import { useSavedProps } from "@/lib/hooks/useSavedProps";

interface PropRankTableProps {
  props: Prop[];
  selectedBookKey: string;
  isLoading?: boolean;
  emptyState?: "selection" | "filtered";
  showStake?: boolean;
}

type TableSortField = SortField | "line" | "selectedOdds" | "bestAvailableOdds";
type SortDirection = "asc" | "desc";

export function formatOdds(odds: number | null | undefined): string {
  if (odds === null || odds === undefined || !Number.isFinite(odds) || odds === 0) {
    return "—";
  }

  return odds > 0 ? `+${odds}` : `${odds}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatEdge(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatFraction(value: number | undefined): string {
  return value !== undefined && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

function getMetricBand(value: number) {
  if (value >= 3) return { label: "Strong", color: "text-emerald-400" };
  if (value >= 0) return { label: "Neutral", color: "text-amber-400" };
  return { label: "Negative", color: "text-red-400" };
}

function MetricValue({ name, value }: { name: string; value: number }) {
  const band = getMetricBand(value);
  const formattedValue = formatEdge(value);
  const accessibleLabel = `${name}: ${formattedValue}, ${band.label}`;

  return (
    <span
      title={accessibleLabel}
      aria-label={accessibleLabel}
      className={cn("font-data text-sm font-medium", band.color)}
    >
      {formattedValue}
      <span className="ml-1 text-[9px] font-sans opacity-80">{band.label}</span>
    </span>
  );
}

function getSelectedOdds(prop: Prop, selectedBookKey: string) {
  return selectedBookKey === ALL_BOOKS_KEY
    ? prop.bookOdds.find((book) => book.bookmakerKey === prop.bestAvailableBookKey)
    : prop.bookOdds.find((book) => book.bookmakerKey === selectedBookKey);
}

function getSortValue(
  prop: Prop,
  field: TableSortField,
  selectedBookKey: string,
  originalIndex: number
): number {
  switch (field) {
    case "rank":
      return originalIndex;
    case "confidenceScore":
      return prop.scores.confidenceScore.value;
    case "evScore":
      return prop.scores.evScore.value;
    case "liquidityScore":
      return prop.scores.liquidityScore.value;
    case "estimatedHitProbability":
      return prop.estimatedHitProbability;
    case "edgePercent":
      return prop.edgePercent;
    case "evPercent":
      return prop.evPercent;
    case "commenceTime":
      return Date.parse(prop.commenceTime);
    case "line":
      return prop.line;
    case "selectedOdds":
      return getSelectedOdds(prop, selectedBookKey)?.oddsAmerican ?? prop.bestAvailableOdds;
    case "bestAvailableOdds":
      return prop.bestAvailableOdds;
  }
}

function SortableTableHead({
  label,
  field,
  activeField,
  direction,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  field: TableSortField;
  activeField: TableSortField;
  direction: SortDirection;
  onSort: (field: TableSortField) => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const isActive = activeField === field;
  const alignment = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
  const directionLabel = isActive ? (direction === "asc" ? "ascending" : "descending") : "unsorted";

  return (
    <TableHead
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn(
        "sticky top-0 z-20 bg-[#12121A] text-xs text-muted-foreground",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        aria-label={`Sort ${label}, currently ${directionLabel}`}
        className={cn(
          "inline-flex min-h-8 w-full items-center gap-1 rounded px-1 transition-colors hover:text-foreground",
          alignment
        )}
      >
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ChevronUpIcon className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDownIcon className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
        )}
      </button>
    </TableHead>
  );
}

function ScoreTooltip({ score, name }: { score: ScoreDetail; name: string }) {
  const accessibleLabel = `${name}: ${score.value.toFixed(0)} out of 100, ${score.label}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            role="img"
            aria-label={accessibleLabel}
            className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
          />
        }
      >
        <ScoreBadge value={score.value} />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        <p className="mb-1 font-medium">{score.label}</p>
        <p className="text-muted-foreground">{score.explanation}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function InfoTooltip() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            role="img"
            aria-label="Best elsewhere odds explanation"
            className="ml-1 inline-flex rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
          />
        }
      >
        <InfoIcon className="h-3 w-3 cursor-help opacity-50" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs">
        Best available odds across all tracked books/platforms
      </TooltipContent>
    </Tooltip>
  );
}

function PropTableSkeleton() {
  return (
    <div role="status" aria-label="Loading props" aria-busy="true">
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <div className="h-10 animate-pulse border-b border-border bg-muted/30" />
        <div className="max-h-[min(70vh,48rem)] overflow-hidden">
          {Array.from({ length: 7 }, (_, index) => (
            <div
              key={index}
              className="flex min-w-[1120px] items-center gap-5 border-b border-border/70 px-3 py-3 last:border-0"
            >
              <span className="h-3 w-4 animate-pulse rounded bg-muted/60" />
              <span className="h-8 w-44 animate-pulse rounded bg-muted/60" />
              <span className="h-4 w-24 animate-pulse rounded bg-muted/50" />
              <span className="h-4 w-24 animate-pulse rounded bg-muted/50" />
              <span className="ml-auto h-4 w-12 animate-pulse rounded bg-muted/50" />
              <span className="h-4 w-16 animate-pulse rounded bg-muted/50" />
              <span className="h-4 w-20 animate-pulse rounded bg-muted/50" />
              <span className="h-5 w-16 animate-pulse rounded bg-muted/60" />
              <span className="h-5 w-16 animate-pulse rounded bg-muted/60" />
              <span className="h-5 w-16 animate-pulse rounded bg-muted/60" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="glass-card animate-pulse p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="h-5 w-36 rounded bg-muted/60" />
              <span className="h-8 w-20 rounded bg-muted/60" />
            </div>
            <div className="mb-4 h-4 w-48 rounded bg-muted/50" />
            <div className="grid grid-cols-2 gap-3">
              <span className="h-4 w-24 rounded bg-muted/50" />
              <span className="h-4 w-24 justify-self-end rounded bg-muted/50" />
              <span className="h-4 w-28 rounded bg-muted/50" />
              <span className="h-6 w-20 justify-self-end rounded bg-muted/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <p className="text-sm">
        {filtered ? "No props match the active filters." : "No props available for this selection."}
      </p>
      <p className="text-xs">
        {filtered
          ? "Try broadening your search or clearing a filter."
          : "Try switching sport or book/platform."}
      </p>
    </div>
  );
}

export function PropRankTable({
  props,
  selectedBookKey,
  isLoading,
  emptyState = "selection",
  showStake = false,
}: PropRankTableProps) {
  const [sortField, setSortField] = useState<TableSortField>("confidenceScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const { savedPropIds, savingPropId, error: watchlistError, toggle: toggleSaved } = useSavedProps();

  const sortedProps = useMemo(() => {
    return props
      .map((prop, originalIndex) => ({ prop, originalIndex }))
      .sort((left, right) => {
        const leftValue = getSortValue(left.prop, sortField, selectedBookKey, left.originalIndex);
        const rightValue = getSortValue(right.prop, sortField, selectedBookKey, right.originalIndex);

        if (leftValue === rightValue) return left.originalIndex - right.originalIndex;
        const comparison = leftValue < rightValue ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      })
      .map(({ prop }) => prop);
  }, [props, selectedBookKey, sortDirection, sortField]);

  function handleSort(field: TableSortField) {
    if (field === sortField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("desc");
  }

  const watchlistNotice = watchlistError ? (
    <p className="mb-3 text-xs text-orange-300" role="status">
      Watchlist unavailable: {watchlistError}
    </p>
  ) : null;

  if (isLoading) return <PropTableSkeleton />;
  if (props.length === 0) {
    return (
      <>
        {watchlistNotice}
        <EmptyState filtered={emptyState === "filtered"} />
      </>
    );
  }

  return (
    <div>
      {watchlistNotice}
      <div className="hidden overflow-hidden rounded-xl border border-border md:block">
        <div className="max-h-[min(70vh,48rem)] overflow-auto">
          <Table
            aria-label="Ranked player props"
            containerClassName="overflow-visible"
            className="min-w-[1120px]"
          >
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <SortableTableHead
                  label="#"
                  field="rank"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="center"
                  className="left-0 z-30 w-10 min-w-10 bg-[#12121A]"
                />
                <TableHead className="sticky left-10 top-0 z-30 min-w-[180px] bg-[#12121A] text-xs text-muted-foreground shadow-[4px_0_8px_-8px_rgba(0,0,0,0.9)]">
                  Player / Prop
                </TableHead>
                <TableHead className="sticky top-0 z-20 bg-[#12121A] text-xs text-muted-foreground">Game</TableHead>
                <TableHead className="sticky top-0 z-20 bg-[#12121A] text-xs text-muted-foreground">Market</TableHead>
                <SortableTableHead
                  label="Line"
                  field="line"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <SortableTableHead
                  label={selectedBookKey === ALL_BOOKS_KEY ? "Best Odds" : getBookLabel(selectedBookKey)}
                  field="selectedOdds"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <SortableTableHead
                  label="Best Elsewhere"
                  field="bestAvailableOdds"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                  className="min-w-[126px]"
                />
                <SortableTableHead
                  label="Hit Prob"
                  field="estimatedHitProbability"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <SortableTableHead
                  label="Edge"
                  field="edgePercent"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <SortableTableHead
                  label="EV%"
                  field="evPercent"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
                <SortableTableHead
                  label="EV"
                  field="evScore"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
                <SortableTableHead
                  label="Liq"
                  field="liquidityScore"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
                <SortableTableHead
                  label="Conf"
                  field="confidenceScore"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
                <SortableTableHead
                  label="Game Time"
                  field="commenceTime"
                  activeField={sortField}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                {showStake && (
                  <>
                    <TableHead className="sticky top-0 z-20 bg-[#12121A] text-right text-xs text-muted-foreground">
                      Kelly
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-[#12121A] text-right text-xs text-muted-foreground">
                      1/2 Kelly
                    </TableHead>
                  </>
                )}
                <TableHead className="sticky top-0 z-20 bg-[#12121A] text-center text-xs text-muted-foreground">
                  Watch
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedProps.map((prop, index) => {
                const selectedOdds = getSelectedOdds(prop, selectedBookKey);
                const displayOdds = selectedOdds?.oddsAmerican ?? prop.bestAvailableOdds;
                const isPositiveEv = prop.evPercent > 0;
                const isHighConf = prop.scores.confidenceScore.value >= 75;
                const commenceDate = new Date(prop.commenceTime);
                const hasValidDate = !Number.isNaN(commenceDate.getTime());
                const isToday = hasValidDate && commenceDate.toDateString() === new Date().toDateString();
                const bestBook = formatOdds(prop.bestAvailableOdds) === "—" ? "—" : prop.bestAvailableBookLabel;

                return (
                  <TableRow
                    key={prop.id}
                    className="border-border transition-colors hover:bg-white/[0.02]"
                  >
                    <TableCell className="sticky left-0 z-10 bg-[#12121A] text-center shadow-[4px_0_8px_-8px_rgba(0,0,0,0.9)]">
                      <span className="font-data text-xs text-muted-foreground">{index + 1}</span>
                    </TableCell>

                    <TableCell className="sticky left-10 z-10 min-w-[180px] bg-[#12121A] shadow-[4px_0_8px_-8px_rgba(0,0,0,0.9)]">
                      <Link href={`/props/${prop.id}`} className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70">
                        <p className="text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-amber-400">
                          {prop.playerName}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1">
                          {prop.teamAbbr && (
                            <span className="text-[10px] text-muted-foreground">{prop.teamAbbr}</span>
                          )}
                          {prop.isMock && <LabelBadge variant="mockMode" />}
                          {isPositiveEv && <LabelBadge variant="ev" />}
                          {isHighConf && <LabelBadge variant="bestLine" />}
                        </div>
                      </Link>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted-foreground">{prop.gameLabel}</span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-foreground">{prop.marketLabel}</span>
                        <span className="text-[10px] text-muted-foreground">{prop.side}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="font-data text-sm text-foreground">{prop.line}</span>
                    </TableCell>

                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-data text-sm font-medium",
                          displayOdds > 0 ? "text-emerald-400" : "text-foreground"
                        )}
                      >
                        {formatOdds(displayOdds)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-data text-xs text-amber-400">
                          {formatOdds(prop.bestAvailableOdds)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{bestBook}</span>
                      </div>
                      <InfoTooltip />
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="font-data text-sm text-foreground">
                        {formatPct(prop.estimatedHitProbability)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <MetricValue name="Edge" value={prop.edgePercent} />
                    </TableCell>

                    <TableCell className="text-right">
                      <MetricValue name="EV" value={prop.evPercent} />
                    </TableCell>

                    <TableCell className="text-center">
                      <ScoreTooltip score={prop.scores.evScore} name="EV score" />
                    </TableCell>

                    <TableCell className="text-center">
                      <ScoreTooltip score={prop.scores.liquidityScore} name="Liquidity score" />
                    </TableCell>

                    <TableCell className="text-center">
                      <ScoreTooltip score={prop.scores.confidenceScore} name="Confidence score" />
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-data text-xs text-foreground">
                          {hasValidDate ? (isToday ? "Today" : format(commenceDate, "MMM d")) : "—"}
                        </span>
                        <span className="font-data text-[10px] text-muted-foreground">
                          {hasValidDate ? format(commenceDate, "h:mm a") : "—"}
                        </span>
                      </div>
                    </TableCell>
                    {showStake && (
                      <>
                        <TableCell className="text-right">
                          <span className="font-data text-xs text-foreground">{formatFraction(prop.kellyFraction)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-data text-xs text-foreground">{formatFraction(prop.halfKellyFraction)}</span>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-center">
                      <SavePropButton
                        isSaved={savedPropIds.has(prop.id)}
                        isSaving={savingPropId === prop.id}
                        onClick={() => void toggleSaved(prop)}
                        playerName={prop.playerName}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {sortedProps.map((prop) => {
          const bestBook = formatOdds(prop.bestAvailableOdds) === "—" ? "—" : prop.bestAvailableBookLabel;

          return (
            <article
              key={prop.id}
              className="glass-card rounded-xl p-4 transition-colors hover:border-amber-500/30"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/props/${prop.id}`}
                  className="group min-w-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
                >
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-amber-400">{prop.playerName}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {prop.teamAbbr && <span className="text-[10px] text-muted-foreground">{prop.teamAbbr}</span>}
                    {prop.isMock && <LabelBadge variant="mockMode" />}
                  </div>
                </Link>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Best odds</p>
                  <p className="font-data text-sm font-medium text-amber-400">{formatOdds(prop.bestAvailableOdds)}</p>
                  <p className="max-w-[7rem] truncate text-[10px] text-muted-foreground">{bestBook}</p>
                </div>
                <SavePropButton
                  isSaved={savedPropIds.has(prop.id)}
                  isSaving={savingPropId === prop.id}
                  onClick={() => void toggleSaved(prop)}
                  playerName={prop.playerName}
                />
              </div>

              <Link
                href={`/props/${prop.id}`}
                className="mt-3 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{prop.marketLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{prop.side}</span>
                <span aria-hidden="true">·</span>
                <span className="font-data text-foreground">{prop.line}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">EV%</p>
                  <MetricValue name="EV" value={prop.evPercent} />
                </div>
                <div className="text-right">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</p>
                  <ScoreBadge value={prop.scores.confidenceScore.value} />
                </div>
                </div>
                {showStake && (
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/70 pt-3 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Kelly</p>
                      <span className="font-data text-foreground">{formatFraction(prop.kellyFraction)}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">1/2 Kelly</p>
                      <span className="font-data text-foreground">{formatFraction(prop.halfKellyFraction)}</span>
                    </div>
                  </div>
                )}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
