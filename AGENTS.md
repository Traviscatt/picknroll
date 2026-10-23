# AGENTS.md

## Commands
- Install: `npm install` (runs `prisma generate` via postinstall)
- Dev server: `npm run dev` (uses `.env`; local Postgres via `docker-compose up -d`)
- Build: `npm run build` (`prisma generate && next build`)
- Tests: `npm test` (Vitest; `src/**/*.test.ts`, covers the scoring engine and pick validation)
- Typecheck: `npx tsc --noEmit --incremental false`
- Lint: `npx eslint src`
  - Known: the react-hooks rules in eslint-config-next 16.4 flag ~13 pre-existing errors (setState in effects, refs during render). `next build` does not lint, so these don't block builds.
- Typecheck SST config: `npx tsc --noEmit --skipLibCheck --target es2022 --module esnext --moduleResolution bundler --strict --types node sst.config.ts` (after `npx sst install`)

## Infrastructure (AWS, SST v4)
- Everything is in `sst.config.ts`. The AWS account is a standalone personal account; use `AWS_PROFILE=picknroll`.
- Stages: `staging` (staging.picknroll.net), `production` (picknroll.net).
- Deploy: `npx sst deploy --stage <stage>`. Secrets: `npx sst secret set NextAuthSecret <value> --stage <stage>`.
- Database access (Aurora is in a private VPC): `sudo npx sst tunnel install` once, then `npx sst tunnel --stage <stage>`,
  then e.g. `npx sst shell --target Prisma --stage <stage> -- npx prisma db push`.
- ESPN sync runs as a Lambda (`src/jobs/espn-sync.ts`) on an EventBridge schedule (March–April only). Shared logic is in `src/lib/espn-sync.ts`, also used by `POST /api/admin/espn-sync`.
- Prisma needs the `rhel-openssl-3.0.x` binary target for Lambda; `next.config.ts` traces the engine into the server bundle.
- Email goes through SES (`src/lib/email.ts`); sending is skipped when `FROM_EMAIL` is unset.

## Scoring
- All scoring goes through `src/lib/scoring-engine.ts` (pure, bracket ID space) and `src/lib/scoring-service.ts` (DB layer). Don't re-implement scoring in routes.
- Rankings: total + bonus, ties broken by closest tiebreaker to the championship total (`Tournament.actualTiebreaker` override, else the final championship score).
- Bracket input is validated by `src/lib/bracket-validation.ts`; deadline checks always use the bracket's own pool.
- Schema changes: `prisma db push` via `npx sst shell --target Prisma --stage <stage>` with `npx sst tunnel` running. Push to staging, then production, before deploying code that needs the change.

## Tournament data
- Teams come only from the DB. An admin imports the field from ESPN after Selection Sunday (Admin → Tournament: `src/lib/espn-field.ts` parses, `src/lib/tournament-import.ts` publishes).
- Never hardcode teams, regions, years, fees, or deadlines. Read the field with `loadField` (server, `src/lib/tournament-service.ts`) or `useTournamentField` (client hook).
- `Tournament.regions` is bracket order: the Final Four pairs regions[0] vs [1] and [2] vs [3]. Validation takes regions from the bracket's pool (`regionsForPool`).
- A tournament locks once any bracket is submitted. Re-import then only updates names, logos, colors, records, and First Four results.
- Entry fee, deadline, and PayPal/Venmo live on the Pool. Use `paymentDetails` (`src/lib/payment.ts`).
- One-off TS scripts with the `@/` alias: `node scripts/run-ts.mjs <file.ts>`. Wrap in `npx sst shell --target Prisma --stage <stage> --` for DB access.

## Game Center (live data)
- `/game-center` reads `GET /api/live?poolId=&date=YYYYMMDD` (members only).
  - `src/lib/live-service.ts` builds one shared payload per pool and day: ESPN scores mapped to bracket games (`bracketGameForSlots`), official + live standings, pool splits, and every bracket's total under each result of undecided games.
  - It's memoized ~10 s per Lambda instance; ESPN days are cached in `src/lib/espn-live.ts`.
- Personal numbers (verdicts, your rank, rooting, today's range) are computed in the browser with the pure helpers in `src/lib/live.ts`.
- Clients poll every 15 s only while a game is live (`useLiveData`), and pause when the tab is hidden.
- `/api/live/status` is public and CDN-cached (navbar dot).
- Official standings still come from the 2-minute ESPN cron; Live = official + ESPN finals not yet recorded + current leaders.
- The Official ⇄ Live choice is stored per device (`useStandingsMode`, localStorage `pnr.standingsMode`).
- Status colors are fixed (never team-themed): LIVE red, halftime yellow, final gray. Result chips use neutral ink.

## Conventions
- Pin new dependencies to versions published at least 7 days ago (`--save-exact`).
- Picks are stored as JSON in `Bracket.picksData` (team IDs like `east-1`, game IDs like `East-r1-g1`).
