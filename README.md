# PropEdge

PropEdge is a private, invite-only NBA/WNBA player-prop analytics dashboard that puts cross-book prices and market-derived fair-value estimates in one read-only workspace.

It solves the practical problem of comparing the same player prop across multiple books without hiding how the estimate was produced: users can inspect the available price, line, market coverage, data-quality warnings, and the score components behind a ranked prop.

> **Important disclaimer:** PropEdge is an analytics tool, not financial, investment, or betting advice. Its probabilities are market-derived estimates, not guarantees. Sports betting is legal only in some jurisdictions; users are responsible for their own compliance, must be of legal age, and should gamble responsibly. For help with problem gambling, contact the National Problem Gambling Helpline at **1-800-522-4700**.

## What exists today

PropEdge is intentionally scoped as a read-only analytics product. The current application includes:

- **Dashboard** — ranked NBA and WNBA player props, filters, book selection, cache status, and manual refresh controls.
- **Props** — a broader props view with player-prop detail pages, odds, score components, explanations, and market-derived estimates.
- **Picks** — a ranked view of the strongest available props and their best available book price.
- **Cross-book odds matrix** — compare lines and prices across configured sportsbooks and DFS/pick'em platforms.
- **Books** — browse configured bookmakers and inspect the props available at a book.
- **Watchlist** — save and remove props for the signed-in user.
- **Alerts** — create and manage user-owned rules for supported prop conditions.
- **Admin and invites** — invite-only account activation, role assignment, user listing, and access revoke/restore for administrators.
- **Mock mode** — serve deterministic mock props when `THE_ODDS_API_KEY` is not configured.
- **Backtesting — not implemented** — the route documents the missing historical odds and settled-result inputs; it does not show simulated performance or benchmark claims.

Bet placement is not implemented. PropEdge does not place bets, submit bet slips, or automate sportsbook actions; see [`BetPlacementRoadmap.md`](BetPlacementRoadmap.md) for the explicitly separate future roadmap.

## Screenshots

The following paths are placeholders for real captures:

- `docs/screenshots/dashboard.png`
- `docs/screenshots/props.png`
- `docs/screenshots/odds-matrix.png`
- `docs/screenshots/admin-invites.png`

Add real, non-sensitive captures at those paths before publishing screenshots. Do not use real user data, invite tokens, API keys, or other secrets in screenshots.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS v4
- shadcn/ui and Radix UI primitives
- Prisma 7 with the PostgreSQL adapter against Supabase Postgres
- NextAuth v5 with credentials and invite-token flows
- The Odds API for optional live odds
- Recharts for charts
- Vitest for unit tests

## Prerequisites

- Node.js 20 or newer (Node.js 22 is used by CI)
- npm
- A PostgreSQL database, such as Supabase Postgres, for authentication, invites, user data, and persistent cache/log data
- A The Odds API key only if live odds are wanted; it is optional because mock mode is available

## Quickstart

The repository URL is intentionally a placeholder until the public GitHub home is chosen.

```bash
git clone https://github.com/REPLACE_WITH_OWNER/propedge.git
cd propedge
npm install
cp .env.example .env
# Edit .env with a real DATABASE_URL and a locally generated AUTH_SECRET.
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The seed script creates the configured admin user only when `ADMIN_EMAIL` is set; set `ADMIN_PASSWORD` as well if that user should receive a password hash. Without `THE_ODDS_API_KEY`, the feed stays in mock mode and does not call The Odds API.

## Environment variables

Keep all values server-side. Never use `NEXT_PUBLIC_` for a database URL, auth secret, invite setting, or The Odds API key.

| Variable | Required | Purpose and behavior |
| --- | --- | --- |
| `DATABASE_URL` | Yes for the database-backed app and Prisma commands | PostgreSQL connection string used by Prisma, credentials, invites, user-owned data, refresh logs, and the persistent prop snapshot cache. |
| `AUTH_SECRET` | Yes in production; required by NextAuth/Auth.js v5 | Secret used by NextAuth v5 to sign/encrypt sessions. Generate a long random value, for example with `openssl rand -base64 32`. |
| `AUTH_URL` | Optional | Auth.js v5 canonical application URL when the request host should be overridden. It is usually omitted for local development and can be set to the deployed URL when needed. This is the v5 `AUTH_*` name; `NEXTAUTH_URL` is not required by this configuration. |
| `AUTH_TRUST_HOST` | Optional | Set to `true` when a self-hosted reverse proxy requires Auth.js to trust the forwarded host. Vercel normally supplies a trusted platform signal. |
| `APP_BASE_URL` | Optional locally; recommended in deployment | Base URL used when an admin creates an invite link. It defaults to `http://localhost:3000`; set it to the public application URL in deployment. |
| `THE_ODDS_API_KEY` | Optional | Server-side The Odds API credential. When it is empty or absent, the app serves mock data. When present, a manual refresh can make paid provider requests. |
| `ODDS_API_REGION` | Optional | The Odds API region parameter; defaults to `us`. |
| `ODDS_API_BOOKMAKERS` | Optional | Comma-separated sportsbook keys requested from The Odds API. Defaults to `draftkings,fanduel,betmgm,williamhill_us,espnbet,fanatics`. |
| `ODDS_API_DFS_BOOKMAKERS` | Optional | Comma-separated DFS/pick'em keys requested from The Odds API. Defaults to `underdog,prizepicks,pick6,betr_us_dfs`. |
| `ADMIN_EMAIL` | Optional for the seed; recommended for first setup | Email upserted as an active `ADMIN` user by `npm run db:seed`. Leave empty to skip admin creation. |
| `ADMIN_PASSWORD` | Optional; used only with `ADMIN_EMAIL` | Password hashed for the seeded admin user. Never store the plaintext password in source control. |
| `NODE_ENV` | Managed by Next.js/Node | The application checks this to decide development Prisma client reuse. Do not normally set it in `.env`; Next.js assigns `development`, `production`, or `test` for the relevant command. |

NextAuth v5 also recognizes legacy `NEXTAUTH_SECRET`/`NEXTAUTH_URL` aliases internally, but this project documents and uses the current `AUTH_SECRET`/`AUTH_URL` names. `DIRECT_URL` is not read by this repository and should not be added as if it were supported configuration.

### Mock mode

If `THE_ODDS_API_KEY` is missing or empty, the odds provider reports itself as unconfigured and the app returns its local mock prop feed. Mock mode makes the dashboard usable without a paid provider account; it does not represent live odds and it does not make a provider request. Authentication, invites, and user-owned features still use the configured database.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production Next.js build. |
| `npm run start` | Start the production server after a build. |
| `npm run lint` | Run ESLint. |
| `npm run test` | Run the Vitest suite once. |
| `npm run test:watch` | Run Vitest in watch mode. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run db:generate` | Generate the Prisma client under the ignored `lib/generated/prisma/` directory. |
| `npm run db:push` | Apply the Prisma schema to the configured database without creating migrations. |
| `npm run db:seed` | Seed sports, books, model/provider settings, and the optional admin user. |
| `npm run db:studio` | Open Prisma Studio against the configured database. |

## Architecture

### Directory layout

```text
app/             App Router pages and route handlers
components/      Shared layout, dashboard, and UI components
constants/       Sports, markets, and bookmaker configuration
lib/             Odds provider, normalization, scoring, cache, mock data, and hooks
prisma/          Prisma schema and database seed script
types/            Shared application and NextAuth types
public/           Static assets
docs/             Documentation assets and screenshot placeholders
```

### Request, refresh, and cache flow

1. An authenticated dashboard or props page asks `GET /api/props` for the selected sport. This is a read path and does not trigger The Odds API.
2. `fetchScoredProps` first checks whether the provider is configured. Without `THE_ODDS_API_KEY`, it returns mock data. With a key, a normal page request reads the process-local cache and then the persisted `PropFeedSnapshot` cache when available.
3. The user-controlled Refresh action sends `POST /api/odds/refresh`. The route permits only `ADMIN` and `MEMBER_FULL` roles because it spends provider credits.
4. A live refresh obtains upcoming events and player-prop markets from The Odds API, normalizes the responses into prop groups, scores the groups, writes the snapshot to memory and best-effort Prisma storage, and records a refresh log.
5. Dashboard tables, picks, the odds matrix, and book views consume the scored feed. Watchlist and alert mutations are session-scoped Prisma operations; admin and invite mutations require the corresponding role checks.

The cache is deliberately read-first: a page load or tab switch should reuse the last snapshot, while a refresh is an explicit external-data action.

## Scoring model

PropEdge estimates fair value from sportsbook prices. The estimate is not a player-performance model and does not claim to predict an outcome.

- **Fair probability:** for the same line, paired sportsbook prices on both sides (Over/Under or Yes/No) are de-vigged and combined. DFS and pick'em platforms are excluded from the consensus. If the opposite side is unavailable, the scorer uses a clearly flagged single-side fallback; without a sportsbook anchor it keeps the estimate neutral and lowers data quality.
- **EV:** the best available price is compared with the market-derived probability. For the evaluated book, the benchmark is leave-one-out: that book is excluded from its own fair-value benchmark when enough qualifying sportsbooks remain. With too few books, the scorer reports an all-books fallback warning instead of pretending the benchmark is independent.
- **Liquidity:** the score reflects the number of books with prices, sportsbook coverage, line coverage across books, price consistency, and whether DFS data is available as additional market coverage.
- **Line-shopping value:** the scorer compares the median implied probability with the best implied probability available across books. A larger gap means more observable price-shopping value, not a more certain outcome.
- **Data quality:** the score rewards true two-sided markets, plausible market hold, multiple qualifying sportsbooks, agreeing lines, and fresh timestamps. It penalizes stale data, large line discrepancies, single-side or leave-one-out fallbacks, and implausibly large EV signals.

The current runtime confidence composite uses these default weights:

| Component | Weight |
| --- | ---: |
| EV | 40% |
| Liquidity | 20% |
| Line shopping | 15% |
| Data quality | 25% |

The scorer normalizes the weights before producing a 0–100 confidence value. Whale/steam scoring is currently unavailable and contributes 0%. The displayed probability, edge, EV, and confidence are therefore market-derived estimates with quality flags, not guarantees or advice.

## API-credit warning

> **Manual refreshes are metered and may spend paid The Odds API credits.** The app does not refresh odds automatically, but pressing **Refresh Odds** can make multiple provider requests for events and prop markets. Only `ADMIN` and `MEMBER_FULL` users can trigger a refresh. Check your provider plan and remaining credits before refreshing; mock mode is the no-key option.

## Deployment notes

### Vercel

1. Import the repository into Vercel and keep the standard Next.js build (`npm run build`).
2. Set the server-side environment variables in the Vercel project settings. At minimum, production needs `DATABASE_URL`, `AUTH_SECRET`, and a correct `APP_BASE_URL`; add `AUTH_URL` if the deployment needs a canonical Auth.js URL and add `THE_ODDS_API_KEY` only for live odds.
3. Run `npm run db:push` and `npm run db:seed` from a trusted environment against the intended database before inviting users. Do not put database setup or seed commands in the Vercel build.
4. Keep provider keys, database credentials, auth secrets, admin credentials, and invite data out of client bundles and screenshots.

### Supabase connection-string caveat

Supabase exposes different Postgres connection options for pooled application traffic and direct/session administration. Vercel's serverless runtime generally needs a connection string chosen for pooled, serverless-friendly access, while schema operations may require the connection mode recommended by your Supabase project. This repository reads only `DATABASE_URL` for both Prisma runtime/config and `db:push`; it does not read a separate `DIRECT_URL`. Verify the selected Supabase URL, SSL settings, pooler behavior, and Prisma 7 adapter compatibility before applying the schema, and use the connection string appropriate for the operation rather than adding an undocumented variable.

## License

PropEdge is released under the [MIT License](LICENSE). The repository metadata uses a placeholder GitHub URL until the public repository owner is selected.

## Disclaimer

PropEdge is an analytics tool, not financial, investment, or betting advice. All probabilities are market-derived estimates, not guarantees. Sports betting is legal only in some jurisdictions, and users are responsible for their own compliance with applicable laws and regulations. Users must be of legal age. Do not treat a score, edge, EV, line, or confidence label as a recommendation or promise of profit. If gambling is causing harm, contact the National Problem Gambling Helpline at **1-800-522-4700**.

---

*Documentation footer: PropEdge provides market-derived analytics only and does not provide financial, investment, or betting advice. See the [full disclaimer](#disclaimer) before using the application.*
