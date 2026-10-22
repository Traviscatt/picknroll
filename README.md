# 🏀 Pick N Roll

**From Bracket to Bankroll - Pick N Roll!**

NCAA Tournament bracket pool application with a unique multi-choice scoring system.

## Features

- **Multi-Choice Scoring System** - Hedge your bets in later rounds
- **Online Bracket Entry** - Easy-to-use bracket wizard
- **AI Bracket Upload** - Upload a photo and let AI extract your picks
- **Auto-Scoring** - Connected to ESPN for live game results
- **Invite Codes** - Simple pool management
- **PayPal/Venmo Payments** - Easy entry fee collection
- **Live Leaderboard** - Real-time standings

## Scoring System

| Round | Name | Choices | Points |
|-------|------|---------|--------|
| 1 | First Round | 1 | 2 pts |
| 2 | Second Round | 1 | 5 pts |
| 3 | Sweet 16 | 2 | 10/5 pts |
| 4 | Elite Eight | 3 | 15/10/5 pts |
| 5 | Final Four | 4 | 25/15/10/5 pts |
| 6 | Championship | 5 | 35/25/15/10/5 pts |

**Maximum Possible: 369 points** (+10 Final Four bonus)

## Getting Started (local)

### Prerequisites

- Node.js 22+
- Docker Desktop
- npm

### 1. Start the Database

```bash
docker-compose up -d
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

Copy `.env.example` to `.env` and fill in the values.

### 4. Initialize Database

```bash
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (AWS via SST)

Infrastructure is defined in `sst.config.ts`:

- **Web**: Next.js on Lambda + CloudFront via SST/OpenNext
- **Database**: Aurora Serverless v2 PostgreSQL (scales to zero when idle)
- **ESPN sync**: EventBridge Scheduler → Lambda (`src/jobs/espn-sync.ts`), every 2 minutes in March–April
- **Email**: Amazon SES (`src/lib/email.ts`)
- **DNS**: Route 53 (`picknroll.net`; domain registered at GoDaddy)

Stages: `staging` → https://staging.picknroll.net, `production` → https://picknroll.net

```bash
# one-time per stage
npx sst secret set NextAuthSecret "$(openssl rand -base64 32)" --stage staging
npx sst secret set GoogleApiKey "<key>" --stage staging   # optional

# deploy
AWS_PROFILE=picknroll npx sst deploy --stage staging
```

Pushes to `main` deploy to production via GitHub Actions (`.github/workflows/deploy.yml`)
once the `AWS_DEPLOY_ROLE_ARN` repository variable is set.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL (Aurora Serverless v2 on AWS, Docker locally)
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **Infra**: SST on AWS
- **Sports Data**: ESPN API

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Join
│   ├── (dashboard)/     # Dashboard, Brackets, Leaderboard
│   └── api/             # API routes
├── components/
│   ├── ui/              # shadcn components
│   └── shared/          # Shared components
├── jobs/                # Scheduled Lambda handlers
└── lib/                 # Utilities, scoring, ESPN sync, email
```

## Configuration

Entry Fee: **$5.00**
Deadline: **Thursday at Noon (Before Tipoff)**

---

Built with ❤️ for March Madness
