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

**Maximum Possible: 369 points**

## Getting Started

### Prerequisites

- Node.js 18+
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

Copy `.env` and update with your settings:
- `NEXT_PUBLIC_PAYPAL_LINK` - Your PayPal.me link
- `NEXT_PUBLIC_VENMO_USERNAME` - Your Venmo username
- `OPENAI_API_KEY` - (Optional) For AI bracket reading

### 4. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PostgreSQL (Docker)
- **ORM**: Prisma
- **Auth**: NextAuth.js
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
└── lib/                 # Utilities, scoring, API clients
```

## Configuration

Entry Fee: **$5.00**
Deadline: **Thursday at Noon (Before Tipoff)**

---

Built with ❤️ for March Madness
