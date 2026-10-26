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

## Local testing
- The local `.env` / `.env.local` still point at the old Neon database (pre-AWS).
- When testing against a throwaway Postgres, override BOTH `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Prisma's `db push` uses `directUrl` (= `DATABASE_URL_UNPOOLED`), so overriding only `DATABASE_URL` pushes to Neon.
- Also override `NEXTAUTH_URL` and `NEXTAUTH_SECRET` for `next dev`.

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

## Picker and theme
- Picking rules live in `src/lib/picker.ts` (pure):
  - eligibility per round, tap/rank/reorder, `pruneImpossible` (clears later picks an edit made impossible), phone flow steps (Round 1 pods).
  - `validatePicks` uses it to reject submitted brackets whose later picks don't come from earlier ones. Drafts may be inconsistent mid-edit.
- `/brackets/new` (`?editId=` to edit): desktop = full bracket tree with tap-to-rank popovers; phones = one card at a time with hybrid auto-advance (only after first filling a card, within a round).
  - Drafts auto-save about 1.5 s after a change.
  - Submitted brackets are never auto-saved (that would demote them to drafts); they save via "Save changes".
- Favorite-team theme (`generatePalette`) sets only frame variables, contrast-checked (tests cover every curated team).
  - Never theme text, gray text, borders, pick-rank colors, or status colors.
  - Team choices come from `/api/teams` (the current field, curated colors first).
- Dark mode:
  - `next-themes` with the class strategy (`ThemeProvider` in `layout.tsx`, default "system", stored in localStorage `pnr.theme`). The picker is in Settings → Appearance and the More sheet (`ThemeChoice`).
  - Dark colors live in `.dark` in `globals.css`. That block also remaps Tailwind's light tints (`-50/-100/-200`) and dark text shades (`-700/-800/-900`) for the fixed status/pick color families, so those classes work in both modes without `dark:` variants.
  - `generatePalette(primary, secondary, "dark")` lightens team colors until they read on the dark background (tests cover every curated team).
  - Large team-colored cards (summary, Your Night, season recap) use `bg-frame text-frame-foreground`: the primary in light mode, a deep shade in dark mode.
  - Prefer tokens (`bg-card`, `bg-foreground`, …) over `bg-white` or `slate-900`.
- Phones get a bottom tab bar (`src/components/shared/mobile-tab-bar.tsx`), hidden on picker routes.

## Season features
- Current pool: always use `currentMembership` / `NEWEST_POOL_FIRST` (`src/lib/pools.ts`), never an arbitrary first pool. Members belong to one pool per season.
- Payments:
  - Members report payments per entry (`POST /api/payments`, status PENDING); admins confirm/reject in Admin → Payments.
  - Confirming marks the bracket paid. Marking paid by hand also settles pending reports.
- Hall of Fame (`src/lib/hall-of-fame.ts`): podiums are computed for app seasons with a final championship. `HallOfFameEntry` rows (Admin → New Season) add earlier years and override a computed year.
- New season (Admin → New Season): new pool for the newly imported tournament, settings and members copied, old pool optionally closed, members notified/emailed.
- Reminders (`src/lib/reminders.ts`):
  - `ReminderSetting` holds on/off + timing per type, all off by default. The `Reminders` cron runs every 10 min in March–April.
  - Each send is claimed in `ReminderSend` first (at most once).
  - Emails respect `User.reminderEmails` / `tipoffEmails` and carry a signed unsubscribe link (`src/lib/unsubscribe.ts`).
- Share images: `src/app/opengraph-image.tsx` and `src/app/share/leaderboard/[code]/opengraph-image.tsx` (`next/og`).

## Home, brackets, and shared UI
- Season phase (`src/lib/season.ts`, pure + tested): `no-pool` → `preseason` (no field yet) → `entry` (before the deadline) → `tournament` → `complete` (championship final).
  - `GET /api/season` returns the phase, the current pool, and the member's entries in it (picked count, payment pending). Home and My Brackets use it.
  - `bracketActions` mirrors the server's lock rules (edit only while the pool is open and before the deadline; delete drafts any time). `nextStep` picks the one action to show.
- Data for an older bracket must come from its own pool: `/api/brackets?poolId=`, `/api/pool/pick-stats?poolId=`, `/api/eliminated-teams?poolId=` (members of that pool, or site admins).
- Game Center's per-bracket math is `personalSummary` (`src/lib/live.ts`), shared with Home. `/game-center?view=rooting` opens the rooting guide.
- Bracket standing (`src/lib/bracket-summary.ts`, pure + tested):
  - `summarizeBracket` gives points by round (earned / still possible / gone), max, still in play, and champion and Final Four status.
  - `compareBrackets` lists the undecided games where two brackets can score differently, biggest swing first, with who to root for or against.
  - `boldPicks` finds 1st choices that 20% or less of the pool shares.
  - Server side, use `eliminatedTeams` and `rankPool` from `scoring-service`.
- Bracket APIs:
  - `/api/brackets/[id]` returns `summary` and `eliminated`.
  - `/api/brackets/[id]/compare` compares with the leader (with the runner-up when this bracket leads), after the deadline only.
  - `/api/season` entries include `rank` and `summary` once picks lock; the pool includes `leaderScore`.
  - `/api/brackets` includes `rank` and `totalInPool` for locked pools.
- Bracket detail:
  - Summary card (`BracketSummaryCard`), then a My picks / vs. Leader / vs. Pool toggle (`?view=leader|pool`).
  - Desktop: `DesktopBracketView` with `results`: result-filled cells, tap a team to trace its path, fit/zoom.
  - Phones: `BracketSections` puts the big picks first, then the current round; other rounds collapse.
- Phone helpers:
  - `StickyBar` (`src/components/shared/sticky-bar.tsx`) slides a slim summary under the top bar once its target scrolls away. Used on bracket detail and Game Center.
  - `GameSheet` (`src/components/bracket/game-sheet.tsx`): tap a game on bracket detail or in the compare views. It finds the ESPN game in today's `/api/live` payload, then in that round's days, and reuses Game Center's `GameCard` with the pool split expanded.
  - `EntrySwitcher` / `useSwipe` move between your entries in the same pool.
  - Standings on phones open centered on you (top 3 plus 3 above and below each of your entries), with "Show all" and "Jump to me".
- My Brackets: `EntryCard` once picks lock (before that, the checklist rows). Past seasons are a table on desktop and collapsed by year on phones.
- Result colors are fixed tokens, never themed: `hit` / `hit-soft` for a right pick, `miss` / `miss-soft` for a wrong one. They're separate from LIVE red.
- Shared components: `PageHeader` (every page title), `BracketStatusBadge` (Draft / Submitted / Payment pending / Paid), `BracketMenu` (⋯ actions), `ScoringRules` / `scoringGroups` (rules generated from `SCORING_RULES`).
- Use design tokens (`text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`), not slate/white classes. Fixed brand colors for marketing pages are `brand-gold` / `brand-forest`.
- The standings page is called "Standings" in the UI; its URL stays `/leaderboard`.

## Conventions
- Pin new dependencies to versions published at least 7 days ago (`--save-exact`).
- Picks are stored as JSON in `Bracket.picksData` (team IDs like `east-1`, game IDs like `East-r1-g1`).
