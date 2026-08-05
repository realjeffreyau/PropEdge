"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PencilIcon, RefreshCwIcon, Trash2Icon, XIcon, ZapIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SportTabs } from "@/components/dashboard/SportTabs";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import {
  ALERT_CONDITION_TYPES,
  matchesAlertRule,
  type AlertConditionType,
  type AlertRuleLike,
} from "@/lib/hooks/alertRules";
import { usePropsFeed } from "@/lib/hooks/usePropsFeed";
import { ACTIVE_SPORTS, SPORT_LABELS } from "@/constants/sports";
import type { Prop } from "@/types";

interface AlertRule extends AlertRuleLike {
  id: string;
  name: string;
  sportKey: string;
  marketKey: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AlertResponse {
  items?: unknown;
  item?: unknown;
  error?: string;
}

interface RuleForm {
  name: string;
  sportKey: string;
  marketKey: string;
  conditionType: AlertConditionType;
  threshold: string;
}

const EMPTY_FORM: RuleForm = {
  name: "",
  sportKey: "basketball_nba",
  marketKey: "",
  conditionType: "EV_ABOVE",
  threshold: "5",
};

const CONDITION_LABELS: Record<AlertConditionType, string> = {
  EV_ABOVE: "EV above (%)",
  CONFIDENCE_ABOVE: "Confidence above (0–100)",
  LINE_MOVE_ABOVE: "Line movement above (%)",
};

function normalizeRule(value: unknown): AlertRule | null {
  if (!value || typeof value !== "object") return null;
  const rule = value as Record<string, unknown>;
  const conditionType = rule.conditionType;
  if (
    typeof rule.id !== "string" ||
    typeof rule.name !== "string" ||
    typeof rule.sportKey !== "string" ||
    typeof rule.threshold !== "number" ||
    typeof rule.active !== "boolean" ||
    typeof conditionType !== "string" ||
    !(ALERT_CONDITION_TYPES as readonly string[]).includes(conditionType)
  ) {
    return null;
  }

  return {
    id: rule.id,
    name: rule.name,
    sportKey: rule.sportKey,
    marketKey: typeof rule.marketKey === "string" ? rule.marketKey : null,
    conditionType: conditionType as AlertConditionType,
    threshold: rule.threshold,
    active: rule.active,
    createdAt: typeof rule.createdAt === "string" ? rule.createdAt : "",
    updatedAt: typeof rule.updatedAt === "string" ? rule.updatedAt : "",
  };
}

function metricDescription(conditionType: AlertConditionType): string {
  if (conditionType === "EV_ABOVE") return "EV uses the feed's current EV percentage.";
  if (conditionType === "CONFIDENCE_ABOVE") return "Confidence uses the feed's 0–100 confidence score.";
  return "Line movement requires line-history fields; the current feed does not include them yet.";
}

export default function AlertsPage() {
  usePageTitle("Alerts · PropEdge");

  const {
    props,
    status,
    isRefreshing,
    refresh,
    error: feedError,
    dismissError,
    sportKey,
    setSportKey,
  } = usePropsFeed();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadRules() {
    setRulesLoading(true);
    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as AlertResponse;
      if (!response.ok) throw new Error(data.error ?? "Alert storage is unavailable right now.");
      const nextRules = Array.isArray(data.items)
        ? data.items.map(normalizeRule).filter((rule): rule is AlertRule => rule !== null)
        : [];
      setRules(nextRules);
      setStorageError(null);
    } catch (error) {
      setRules([]);
      setStorageError(error instanceof Error ? error.message : "Alert storage is unavailable right now.");
    } finally {
      setRulesLoading(false);
    }
  }

  useEffect(() => {
    // Alert CRUD is an explicit client/API boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRules();
  }, []);

  const marketOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const prop of props) byKey.set(prop.marketKey, prop.marketLabel);
    return Array.from(byKey, ([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [props]);

  const matchesByRule = useMemo(() => {
    const result = new Map<string, Prop[]>();
    for (const rule of rules) {
      result.set(rule.id, rule.active ? props.filter((prop) => matchesAlertRule(rule, prop)) : []);
    }
    return result;
  }, [props, rules]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
  }

  function handleSportChange(nextSport: string) {
    setSportKey(nextSport as typeof sportKey);
  }

  async function submitRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const threshold = Number(form.threshold);
    if (!form.name.trim()) {
      setFormError("Give this rule a name.");
      return;
    }
    if (!Number.isFinite(threshold)) {
      setFormError("Enter a finite numeric threshold.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/alerts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name.trim(),
          sportKey: form.sportKey,
          marketKey: form.marketKey || null,
          conditionType: form.conditionType,
          threshold,
          active: true,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as AlertResponse;
      if (!response.ok) throw new Error(data.error ?? "Unable to save this alert rule.");
      await loadRules();
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save this alert rule.");
    } finally {
      setSaving(false);
    }
  }

  function editRule(rule: AlertRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      sportKey: rule.sportKey,
      marketKey: rule.marketKey ?? "",
      conditionType: rule.conditionType,
      threshold: String(rule.threshold),
    });
    setFormError(null);
  }

  async function toggleRule(rule: AlertRule) {
    setFormError(null);
    try {
      const response = await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, active: !rule.active }),
      });
      const data = (await response.json().catch(() => ({}))) as AlertResponse;
      if (!response.ok) throw new Error(data.error ?? "Unable to update this alert rule.");
      setRules((current) => current.map((item) => item.id === rule.id ? { ...item, active: !item.active } : item));
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Unable to update this alert rule.");
    }
  }

  async function deleteRule(rule: AlertRule) {
    setFormError(null);
    try {
      const response = await fetch(`/api/alerts?id=${encodeURIComponent(rule.id)}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as AlertResponse;
      if (!response.ok) throw new Error(data.error ?? "Unable to delete this alert rule.");
      setRules((current) => current.filter((item) => item.id !== rule.id));
      if (editingId === rule.id) resetForm();
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : "Unable to delete this alert rule.");
    }
  }

  return (
    <AppShell isMockMode={status.isMockMode} lastRefreshed={status.lastRefreshed}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Alerts</h1>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            Define personal rules and inspect which props match them in the currently loaded feed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          aria-label="Refresh odds"
          className="btn-amber-glow flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCwIcon className={isRefreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden="true" />
          {isRefreshing ? "Fetching…" : "Refresh Odds"}
        </button>
      </div>

      {feedError && (
        <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <span>{feedError}</span>
          <button type="button" aria-label="Dismiss refresh error" onClick={dismissError} className="shrink-0">
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3">
        <SportTabs value={sportKey} onChange={handleSportChange} />
        <div className="glass-card border-amber-500/20 p-4 text-xs leading-relaxed text-muted-foreground">
          Evaluation runs against the loaded {SPORT_LABELS[sportKey] ?? sportKey} feed while this page is open. There is no background job and no email, push, or sportsbook notification delivery.
        </div>
      </div>

      {storageError && (
        <div className="mb-5 glass-card border-orange-500/20 p-4" role="status">
          <p className="text-sm font-medium text-orange-300">Alert storage is unavailable</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{storageError}</p>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={submitRule} className="glass-card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-display font-semibold">{editingId ? "Edit rule" : "New rule"}</h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel edit
              </button>
            )}
          </div>

          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Rule name
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Strong NBA points edge"
              disabled={Boolean(storageError)}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-amber-500/70 disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Sport
            <select
              value={form.sportKey}
              onChange={(event) => setForm((current) => ({ ...current, sportKey: event.target.value }))}
              disabled={Boolean(storageError)}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 disabled:opacity-50"
            >
              {ACTIVE_SPORTS.map((sport) => <option key={sport.key} value={sport.key}>{sport.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Market (optional)
            <select
              value={form.marketKey}
              onChange={(event) => setForm((current) => ({ ...current, marketKey: event.target.value }))}
              disabled={Boolean(storageError)}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 disabled:opacity-50"
            >
              <option value="">All markets</option>
              {marketOptions.map((market) => <option key={market.key} value={market.key}>{market.label}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Condition
            <select
              value={form.conditionType}
              onChange={(event) => setForm((current) => ({ ...current, conditionType: event.target.value as AlertConditionType }))}
              disabled={Boolean(storageError)}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 disabled:opacity-50"
            >
              {ALERT_CONDITION_TYPES.map((condition) => <option key={condition} value={condition}>{CONDITION_LABELS[condition]}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Threshold
            <input
              type="number"
              step="0.1"
              value={form.threshold}
              onChange={(event) => setForm((current) => ({ ...current, threshold: event.target.value }))}
              disabled={Boolean(storageError)}
              className="h-9 rounded-lg border border-border bg-muted/30 px-3 font-data text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 disabled:opacity-50"
            />
          </label>
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">{metricDescription(form.conditionType)}</p>

          {formError && <p className="text-xs text-red-300" role="alert">{formError}</p>}
          <button
            type="submit"
            disabled={saving || Boolean(storageError)}
            className="btn-amber-glow w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : editingId ? "Save changes" : "Create alert rule"}
          </button>
        </form>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-display font-semibold">Your rules</h2>
              <p className="text-xs text-muted-foreground">Active rules are evaluated against the feed above.</p>
            </div>
            {rulesLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
          </div>

          {!rulesLoading && !storageError && rules.length === 0 && (
            <div className="glass-card flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
              <ZapIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">No alert rules yet</p>
              <p className="max-w-sm text-xs text-muted-foreground">Create a rule to see matching props from the loaded feed.</p>
            </div>
          )}

          {!rulesLoading && !storageError && rules.length > 0 && (
            <div className="space-y-3">
              {rules.map((rule) => {
                const matches = matchesByRule.get(rule.id) ?? [];
                return (
                  <article key={rule.id} className="glass-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] ${rule.active ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-border bg-muted/40 text-muted-foreground"}`}>
                            {rule.active ? "Active" : "Paused"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {SPORT_LABELS[rule.sportKey] ?? rule.sportKey} · {rule.marketKey ? (marketOptions.find((market) => market.key === rule.marketKey)?.label ?? rule.marketKey) : "All markets"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => void toggleRule(rule)} aria-pressed={rule.active} aria-label={`${rule.active ? "Pause" : "Activate"} ${rule.name}`} className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-amber-500/30 hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70">
                          {rule.active ? "Pause" : "Activate"}
                        </button>
                        <button type="button" onClick={() => editRule(rule)} aria-label={`Edit ${rule.name}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70">
                          <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => void deleteRule(rule)} aria-label={`Delete ${rule.name}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70">
                          <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-border/70 pt-3">
                      <p className="text-xs text-muted-foreground">
                        {CONDITION_LABELS[rule.conditionType]} <span className="font-data text-foreground">{rule.threshold}</span> · <span className="font-data text-foreground">{matches.length}</span> matching prop{matches.length === 1 ? "" : "s"} now
                      </p>
                      {matches.length > 0 ? (
                        <p className="mt-2 text-xs text-emerald-300">{matches.slice(0, 5).map((prop) => prop.playerName).join(", ")}{matches.length > 5 ? ` +${matches.length - 5} more` : ""}</p>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground/70">No current matches. {rule.conditionType === "LINE_MOVE_ABOVE" ? "Line movement history is not present in this feed." : ""}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
