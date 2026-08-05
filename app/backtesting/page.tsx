import { AppShell } from "@/components/layout/AppShell";

export default function BacktestingPage() {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-amber-400">Roadmap</p>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Backtesting</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Backtesting is not implemented yet. The current API plan does not provide the historical odds needed to reproduce a past decision honestly, so this route is documentation rather than a simulated result.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="glass-card p-5">
            <h2 className="text-sm font-display font-semibold text-foreground">What it would require</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Historical odds endpoints with the same market and book coverage as the live feed.</li>
              <li>• Stored line-movement snapshots so each historical price can be reconstructed.</li>
              <li>• Settled player-prop results, including pushes, voids, and missing events.</li>
            </ul>
          </section>

          <section className="glass-card p-5">
            <h2 className="text-sm font-display font-semibold text-foreground">Schema groundwork</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The schema already contains <code className="font-data text-amber-300">Backtest</code> for run metadata and <code className="font-data text-amber-300">PropOddsSnapshot</code> for odds history.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              What is missing is the historical provider access, a complete snapshot-ingestion policy, settled-result storage, and the evaluation workflow that would connect them.
            </p>
          </section>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground/60">
          No charts, performance claims, or placeholder numbers are shown until those inputs exist.
        </p>
      </div>
    </AppShell>
  );
}
