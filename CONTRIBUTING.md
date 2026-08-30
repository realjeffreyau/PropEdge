# Contributing to PropEdge

Thanks for helping improve PropEdge. Keep contributions focused on the read-only, invite-only analytics scope and do not add claims that the market-derived estimates predict outcomes.

## Local setup

Use Node.js 20 or newer and npm:

```bash
npm ci
cp .env.example .env
# Set DATABASE_URL and AUTH_SECRET, plus optional admin/provider values.
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Do not commit `.env`, `.env.local`, credentials, invite tokens, or provider keys. The application can use mock odds data when `THE_ODDS_API_KEY` is empty.

## Branches and commits

- Start from the default `main` branch and keep each branch focused on one change.
- Use descriptive branch names such as `feat/odds-matrix-filter`, `fix/invite-expiry`, `docs/release-guide`, or `chore/ci-checks`.
- Use short Conventional Commit-style subjects: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:`. Use the imperative mood and explain meaningful behavior in the body when needed.
- Do not commit generated Prisma client output, build output, or local environment files.

## Before opening a pull request

Run every check locally and make sure each command passes:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Tests live in `lib/**/__tests__/**/*.test.ts` and run with Vitest in a Node environment. Add or update focused tests for behavior changes. Any change to scoring math, odds conversion, consensus, EV, line-shopping, or confidence weighting must ship with tests that demonstrate the intended calculation and guard edge cases.

Pull requests should describe the user-visible behavior, validation performed, database or environment-variable changes, and any limitations. Never include secrets in code, logs, screenshots, issue comments, or pull-request descriptions.
