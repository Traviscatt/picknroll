# AGENTS.md

## Commands
- Install: `npm install` (runs `prisma generate` via postinstall)
- Dev server: `npm run dev` (uses `.env`; local Postgres via `docker-compose up -d`)
- Build: `npm run build` (`prisma generate && next build`)
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

## Conventions
- Pin new dependencies to versions published at least 7 days ago (`--save-exact`).
- Picks are stored as JSON in `Bracket.picksData` (team IDs like `east-1`, game IDs like `East-r1-g1`).
