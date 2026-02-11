# Pick N Roll - NCAA Tournament Pool Website
## "From Bracket to Bankroll - Pick N Roll!"

---

## 📋 Project Overview

A web application for managing NCAA Tournament bracket pools with a unique multi-choice scoring system, automated scoring via ESPN API, payment integration, and AI-powered bracket image reading.

---

## 🏗️ Technical Architecture

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **UI Library** | shadcn/ui + Tailwind CSS |
| **Database** | PostgreSQL (via Supabase or Neon) |
| **ORM** | Prisma |
| **Authentication** | NextAuth.js |
| **Payments** | PayPal SDK + Venmo |
| **AI/OCR** | OpenAI Vision API (for bracket image reading) |
| **Sports Data** | ESPN API |
| **Deployment** | Vercel |
| **State Management** | Zustand or React Context |

### shadcn Studio Blocks to Use
- **Hero Section** - Landing page hero with tagline
- **Navbar Component** - Site navigation
- **Login/Register Pages** - Authentication UI
- **Dashboard Shell** - Main app layout
- **Dashboard Header** - User profile & settings
- **Dashboard Sidebar** - Navigation within app
- **Statistics Component** - Pool standings & stats
- **DataTable** - Leaderboard display
- **Multi-step Form** - Bracket submission wizard
- **Charts Component** - Score visualization
- **Footer Component** - Site footer

---

## 🎯 Scoring System (Core Feature)

### Round-by-Round Scoring Matrix

| Round | Name | Teams | Choices | Points Distribution |
|-------|------|-------|---------|---------------------|
| 1 | First Round | 64→32 | 1 | 2 pts per correct |
| 2 | Second Round | 32→16 | 1 | 5 pts per correct |
| 3 | Sweet 16 | 16→8 | 2 | 1st: 10 pts, 2nd: 5 pts |
| 4 | Elite Eight | 8→4 | 3 | 1st: 15, 2nd: 10, 3rd: 5 |
| 5 | Final Four | 4→2 | 4 | 1st: 25, 2nd: 15, 3rd: 10, 4th: 5 |
| 6 | Championship | 2→1 | 5 | 1st: 35, 2nd: 25, 3rd: 15, 4th: 10, 5th: 5 |

### How Multi-Choice Works
For rounds 3-6, users rank multiple teams in order of preference:
- **Sweet 16**: Pick your top 2 choices for each winner
- **Elite Eight**: Pick your top 3 choices for each winner
- **Final Four**: Pick your top 4 choices for each winner
- **Championship**: Pick your top 5 choices for the champion

If their 1st choice wins, they get maximum points. If not, but their 2nd choice wins, they get fewer points, etc.

### Maximum Possible Points
| Round | Games | Max Points per Game | Total Max |
|-------|-------|---------------------|-----------|
| 1 | 32 | 2 | 64 |
| 2 | 16 | 5 | 80 |
| 3 | 8 | 10 | 80 |
| 4 | 4 | 15 | 60 |
| 5 | 2 | 25 | 50 |
| 6 | 1 | 35 | 35 |
| **Total** | | | **369** |

---

## 📱 Page Structure & Features

### 1. Public Pages

#### Landing Page (`/`)
- Hero section with tagline "From Bracket to Bankroll - Pick N Roll!"
- Features overview (scoring system, AI upload, auto-scoring)
- How it works section
- CTA to join/create pool

#### Join Pool (`/join`)
- Invite code input field
- Pool preview (name, entry fee, participants count)
- Continue to registration/login

#### Login (`/login`)
- Email/password login
- OAuth options (Google, optional)

#### Register (`/register`)
- Name, email, password
- Accept terms

### 2. Authenticated Pages

#### Dashboard (`/dashboard`)
- Pool overview cards
- Current standings snapshot
- Upcoming games
- Quick actions (submit bracket, view picks)

#### My Brackets (`/brackets`)
- List of submitted brackets
- Status (draft, submitted, paid)
- View/edit options (before deadline)

#### Create/Edit Bracket (`/brackets/new` or `/brackets/[id]/edit`)
- **Multi-step wizard:**
  1. First Four (if applicable)
  2. Round 1 - East Region
  3. Round 1 - West Region
  4. Round 1 - South Region
  5. Round 1 - Midwest Region
  6. Round 2 picks
  7. Sweet 16 picks (with multi-choice)
  8. Elite Eight picks (with multi-choice)
  9. Final Four picks (with multi-choice)
  10. Championship pick (with multi-choice)
  11. Review & Submit

#### Upload Bracket (`/brackets/upload`)
- Drag & drop or file upload
- AI processes image
- Review extracted picks
- Confirm/edit before submitting

#### Leaderboard (`/leaderboard`)
- Real-time standings table
- Filter by round
- User's position highlighted
- Points breakdown on hover/click

#### Pool Settings (`/pool/settings`) - Admin Only
- Pool name & description
- Entry fee
- Payment settings (PayPal/Venmo info)
- Deadline management
- Generate/regenerate invite codes
- Manage participants
- Manual score override (if needed)

#### Payment (`/payment`)
- Entry fee display
- PayPal checkout button
- Venmo QR code/link
- Payment confirmation

#### Profile (`/profile`)
- User settings
- Payment history
- Past pools

### 3. Admin Pages

#### Admin Dashboard (`/admin`)
- Pool statistics
- Payment tracking
- Participant management
- Score verification
- Manual adjustments

---

## 🔌 API Integrations

### ESPN API Integration
- **Endpoint**: ESPN has limited public APIs; we'll use:
  - Site API: `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard`
  - Tournament bracket data endpoints
- **Auto-scoring workflow**:
  1. Cron job polls ESPN every 5-15 minutes during games
  2. Compare game results with user picks
  3. Calculate points based on choice ranking
  4. Update leaderboard in real-time

### PayPal Integration
- PayPal JavaScript SDK for checkout
- Server-side verification via PayPal REST API
- Webhook for payment confirmation

### Venmo Integration
- Display pool admin's Venmo handle
- Generate QR code for Venmo payment
- Manual confirmation by admin (Venmo has limited API access)

### OpenAI Vision API (AI Bracket Reading)
- User uploads bracket image (PDF, PNG, JPG)
- Send to OpenAI Vision API with structured prompt
- Extract team selections and rankings
- Return structured JSON for bracket form auto-fill
- User reviews and confirms before submission

---

## 🗄️ Database Schema

```prisma
// Core Models

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String?
  image         String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  brackets      Bracket[]
  payments      Payment[]
  poolMemberships PoolMember[]
}

model Pool {
  id            String    @id @default(cuid())
  name          String
  description   String?
  entryFee      Decimal   @default(0)
  inviteCode    String    @unique
  deadline      DateTime
  status        PoolStatus @default(OPEN)
  paypalEmail   String?
  venmoHandle   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  members       PoolMember[]
  brackets      Bracket[]
  tournament    Tournament @relation(fields: [tournamentId], references: [id])
  tournamentId  String
}

model PoolMember {
  id            String    @id @default(cuid())
  role          PoolRole  @default(MEMBER)
  paid          Boolean   @default(false)
  joinedAt      DateTime  @default(now())
  
  user          User      @relation(fields: [userId], references: [id])
  userId        String
  pool          Pool      @relation(fields: [poolId], references: [id])
  poolId        String
  
  @@unique([userId, poolId])
}

model Tournament {
  id            String    @id @default(cuid())
  name          String
  year          Int
  startDate     DateTime
  endDate       DateTime
  
  pools         Pool[]
  games         Game[]
  teams         TournamentTeam[]
}

model TournamentTeam {
  id            String    @id @default(cuid())
  seed          Int
  region        Region
  
  team          Team      @relation(fields: [teamId], references: [id])
  teamId        String
  tournament    Tournament @relation(fields: [tournamentId], references: [id])
  tournamentId  String
  
  picks         Pick[]
}

model Team {
  id            String    @id @default(cuid())
  name          String
  shortName     String
  espnId        String?   @unique
  logo          String?
  
  tournamentEntries TournamentTeam[]
}

model Game {
  id            String    @id @default(cuid())
  round         Int       // 1-6
  gameNumber    Int       // Position in bracket
  region        Region?
  status        GameStatus @default(SCHEDULED)
  
  team1Id       String?
  team2Id       String?
  winnerId      String?
  
  team1Score    Int?
  team2Score    Int?
  
  startTime     DateTime?
  
  tournament    Tournament @relation(fields: [tournamentId], references: [id])
  tournamentId  String
  
  picks         Pick[]
}

model Bracket {
  id            String    @id @default(cuid())
  name          String
  status        BracketStatus @default(DRAFT)
  totalScore    Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  submittedAt   DateTime?
  
  user          User      @relation(fields: [userId], references: [id])
  userId        String
  pool          Pool      @relation(fields: [poolId], references: [id])
  poolId        String
  
  picks         Pick[]
}

model Pick {
  id            String    @id @default(cuid())
  choiceRank    Int       @default(1) // 1 = first choice, 2 = second choice, etc.
  pointsEarned  Int       @default(0)
  correct       Boolean?
  
  bracket       Bracket   @relation(fields: [bracketId], references: [id])
  bracketId     String
  game          Game      @relation(fields: [gameId], references: [id])
  gameId        String
  team          TournamentTeam @relation(fields: [teamId], references: [id])
  teamId        String
  
  @@unique([bracketId, gameId, choiceRank])
}

model Payment {
  id            String    @id @default(cuid())
  amount        Decimal
  method        PaymentMethod
  status        PaymentStatus @default(PENDING)
  transactionId String?
  createdAt     DateTime  @default(now())
  
  user          User      @relation(fields: [userId], references: [id])
  userId        String
}

// Enums

enum Role {
  USER
  ADMIN
}

enum PoolRole {
  ADMIN
  MEMBER
}

enum PoolStatus {
  OPEN
  LOCKED
  COMPLETED
}

enum Region {
  EAST
  WEST
  SOUTH
  MIDWEST
}

enum GameStatus {
  SCHEDULED
  IN_PROGRESS
  FINAL
}

enum BracketStatus {
  DRAFT
  SUBMITTED
  PAID
}

enum PaymentMethod {
  PAYPAL
  VENMO
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}
```

---

## 🎨 UI/UX Design Guidelines

### Color Palette
- **Primary**: Orange (#F97316) - Basketball/energy
- **Secondary**: Deep Blue (#1E3A5F) - Trust/sports
- **Accent**: Gold (#FBBF24) - Championship/winning
- **Background**: Slate grays for dark mode support

### Typography
- **Headings**: Bold, sporty sans-serif (Inter or similar)
- **Body**: Clean, readable (Inter)

### Mobile-First Design
- Bracket view optimized for touch
- Swipeable region navigation
- Bottom navigation on mobile
- Collapsible sidebar on tablet/desktop

### Key UX Principles
1. **Progressive disclosure** - Don't overwhelm with all 63 games at once
2. **Visual feedback** - Show scores updating in real-time
3. **Error prevention** - Validate picks before submission
4. **Accessibility** - WCAG 2.1 AA compliance

---

## 📅 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup with Next.js + shadcn/ui
- [ ] Database schema with Prisma
- [ ] Authentication (NextAuth.js)
- [ ] Basic layout with shadcn blocks

### Phase 2: Core Features (Week 2)
- [ ] Pool creation with invite codes
- [ ] Bracket entry form (multi-step)
- [ ] Multi-choice pick system for rounds 3-6
- [ ] Basic scoring logic

### Phase 3: Integrations (Week 3)
- [ ] ESPN API integration for game data
- [ ] Auto-scoring system
- [ ] PayPal payment flow
- [ ] Venmo payment display

### Phase 4: AI & Polish (Week 4)
- [ ] AI bracket image reading (OpenAI Vision)
- [ ] Leaderboard real-time updates
- [ ] Admin dashboard
- [ ] Mobile optimization
- [ ] Testing & bug fixes

### Phase 5: Launch Prep
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Deployment to production

---

## 🔐 Security Considerations

1. **Authentication**: Secure password hashing (bcrypt), session management
2. **Authorization**: Role-based access control (pool admin vs member)
3. **API Security**: Rate limiting, input validation
4. **Payment Security**: Never store card details, use PayPal's hosted fields
5. **Invite Codes**: Cryptographically random, rate-limited attempts
6. **Data Privacy**: GDPR-compliant data handling

---

## 📊 Key Metrics to Track

- Total pools created
- Brackets submitted
- Payment completion rate
- AI bracket upload success rate
- API response times
- User engagement (daily active users)

---

## 🚀 Future Enhancements

1. **Social Features**: Comments, trash talk, pool chat
2. **Multiple Tournaments**: Support for NIT, women's tournament
3. **Historical Data**: Past performance tracking
4. **Mobile App**: React Native version
5. **Custom Scoring**: Let pool admins define scoring rules
6. **Live Game Updates**: WebSocket for real-time scores

---

## 📁 Project Structure

```
picknroll/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── brackets/
│   │   │   ├── new/
│   │   │   ├── upload/
│   │   │   └── [id]/
│   │   ├── leaderboard/
│   │   ├── pool/
│   │   │   └── settings/
│   │   ├── payment/
│   │   └── profile/
│   ├── (marketing)/
│   │   ├── page.tsx (landing)
│   │   └── join/
│   ├── admin/
│   ├── api/
│   │   ├── auth/
│   │   ├── brackets/
│   │   ├── espn/
│   │   ├── payments/
│   │   ├── pools/
│   │   └── ai/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── bracket/
│   │   ├── BracketView.tsx
│   │   ├── GameCard.tsx
│   │   ├── MultiChoicePicker.tsx
│   │   └── RegionBracket.tsx
│   ├── dashboard/
│   ├── forms/
│   └── shared/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── scoring.ts
│   ├── espn-api.ts
│   ├── ai-bracket-reader.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── public/
├── styles/
├── types/
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.ts
└── README.md
```

---

## ✅ Ready to Build?

This plan covers all your requirements:
- ✅ Multi-choice scoring system (rounds 3-6)
- ✅ Invite code system
- ✅ ESPN API auto-scoring
- ✅ PayPal/Venmo payments
- ✅ AI bracket image reading
- ✅ Online bracket entry
- ✅ Mobile-friendly design
- ✅ shadcn/ui components

**Next step**: Set up the Next.js project and begin Phase 1 implementation.
