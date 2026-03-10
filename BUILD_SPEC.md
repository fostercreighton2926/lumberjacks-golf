# Lumberjacks Fantasy Golf League — Build Spec

## Overview
Fantasy golf web app for a 4-person league. Users pick 7 PGA Tour golfers per tournament, best 4 scores (to par) count. League members ranked weekly: 1st=200pts, 2nd=100pts, 3rd=50pts, 4th=0pts. Season standings = cumulative.

## Tech Stack
- Next.js 14 (App Router) with TypeScript
- Prisma ORM + PostgreSQL (Supabase)
- Tailwind CSS
- Custom session-based auth (bcrypt password hashing, HTTP-only cookies)
- Deploy target: Vercel

## Database Schema (Prisma)

### Models needed:
- **User** — id, email, username, passwordHash, isAdmin, createdAt
- **Session** — id, userId, token, expiresAt
- **Season** — id, name, year, isActive
- **Tournament** — id, seasonId, name, course, location, startDate (Thursday), endDate (Sunday), pickDeadline (Thursday morning), isComplete, externalId
- **Golfer** — id, name, ranking, imageUrl, externalId
- **TournamentField** — id, tournamentId, golferId (which golfers are in this tournament's field)
- **TournamentResult** — id, tournamentId, golferId, position, scoreToPar, r1Score, r2Score, r3Score, r4Score, status (active/cut/wd/dq)
- **League** — id, name, inviteCode, seasonId, createdBy
- **LeagueMember** — id, leagueId, userId, joinedAt
- **Pick** — id, leagueId, userId, tournamentId, golferId, pickOrder (1-7), createdAt
- **WeeklyResult** — id, leagueId, userId, tournamentId, totalScore (best 4 to par), rank (1-4), points (200/100/50/0)

## Scoring Engine (pure functions, no DB imports)

File: `src/lib/scoring.ts`

```typescript
interface GolferScore {
  golferId: string;
  scoreToPar: number | null; // null = WD/DQ/incomplete
  status: 'active' | 'cut' | 'wd' | 'dq';
}

interface TeamPicks {
  userId: string;
  golfers: GolferScore[];
}

interface WeeklyTeamResult {
  userId: string;
  bestFour: GolferScore[]; // the 4 counting golfers
  dropped: GolferScore[]; // the 3 dropped golfers
  totalScore: number; // sum of best 4 to par
  rank: number; // 1-4
  points: number; // 200/100/50/0
}
```

Logic:
1. For each team, sort their 7 golfers by scoreToPar ascending (best first)
2. Golfers with null scores (WD/DQ before completing) sort to the bottom
3. Take the best 4, sum their scoreToPar = totalScore
4. Rank teams by totalScore ascending (lowest wins, like golf)
5. Assign points: rank 1=200, 2=100, 3=50, 4=0
6. Tiebreaker: if tied on totalScore, split the points (e.g., two tied for 1st split 200+100=150 each)

## API Routes

All under `src/app/api/`:

### Auth
- POST `/api/auth/register` — create account
- POST `/api/auth/login` — login, set session cookie
- POST `/api/auth/logout` — clear session
- GET `/api/auth/me` — current user

### Tournaments
- GET `/api/tournaments` — list tournaments for active season
- GET `/api/tournaments/[id]` — tournament detail with field and results
- GET `/api/tournaments/current` — next upcoming or in-progress tournament

### Picks
- GET `/api/picks/[tournamentId]` — get user's picks for a tournament
- POST `/api/picks/[tournamentId]` — submit 7 picks (validate: exactly 7, all in field, before deadline)
- GET `/api/picks/[tournamentId]/league/[leagueId]` — all league members' picks (hidden before deadline)

### Standings
- GET `/api/standings/[leagueId]` — season standings with weekly breakdown
- GET `/api/standings/[leagueId]/[tournamentId]` — single week detail

### Leagues
- POST `/api/leagues` — create league
- POST `/api/leagues/join` — join with invite code
- GET `/api/leagues` — user's leagues
- GET `/api/leagues/[id]` — league detail

### Admin
- POST `/api/admin/sync-results/[tournamentId]` — manually trigger results sync
- POST `/api/admin/tournaments` — create/edit tournament
- POST `/api/admin/seed-golfers` — seed golfer database

## Frontend Pages

### Layout & Navigation
- Augusta green (#006747) and white (#FFFFFF) with gold accent (#C8B568)
- Clean, premium feel — think Augusta.com meets modern SaaS
- Sidebar on desktop, bottom nav on mobile
- Logo: "LUMBERJACKS" in a clean serif/slab font with a small axe or pine tree icon

### Pages:
1. **/** — Landing/login page
2. **/dashboard** — Current tournament status, upcoming picks, quick standings
3. **/picks** — Golfer selection for current tournament. Search/filter golfers in the field. Show 7 slots, highlight best 4 vs dropped 3 in real-time during tournament
4. **/standings** — Season leaderboard with tournament-by-tournament breakdown. Toggle between leagues if multiple. Show points per week in a grid/table
5. **/tournament/[id]** — Live tournament view. Each league member's 7 golfers with live scores. Best 4 highlighted, worst 3 crossed out (like the screenshot). Running team totals
6. **/leagues** — Create/join leagues
7. **/rules** — Scoring rules, pick rules, FAQ
8. **/admin** — Tournament management, manual sync, user management (admin only)

### Picks Page UX:
- Show tournament field with search bar
- Click golfer to add to your team (max 7)
- Show your current 7 picks with remove buttons
- During a live tournament, show which 4 are counting and which 3 are dropped
- Lock picks after deadline (Thursday AM)
- Show other league members' picks after deadline

### Standings Page:
- Table: Player name | Total Points | then a column per tournament showing points earned (200/100/50/0)
- Click a tournament column to see the detailed breakdown (each player's 7 golfers, scores, which 4 counted)
- Highlight leader

### Tournament Live View:
- Similar to the screenshot Jacob sent
- Each player's team shown as a card/section
- Golfers listed with: POS, Name, TOT (to par), R1, R2, R3, R4
- Best 4 in normal text, dropped 3 in strikethrough/faded
- Team total prominently displayed
- Sorted by team total (leader first)
- Auto-refresh or polling for live scores

## Data Seeding

### 2025 PGA Tour Signature Events (for initial tournament list):
Create a seed script that populates the signature events. The app should work with manually created tournaments too.

### Golfer Data:
For the MVP, create an admin page to manually add golfers to the field. We can wire up an API later.
For now, seed the top 100 PGA Tour golfers by world ranking.

## Picks Deadline
- Default: Thursday 7:00 AM ET for each tournament
- Configurable per tournament in admin
- After deadline: picks locked, all league members' picks visible

## Authentication
- Simple email/password registration
- Session token in HTTP-only cookie
- Middleware to protect authenticated routes
- No third-party auth needed

## Mobile Responsive
- Sidebar collapses to bottom navigation
- Tables scroll horizontally on small screens
- Golfer selection works well on touch (tap to add/remove)
- Cards stack vertically on mobile

## Important Build Notes
1. Use Prisma with Supabase — use Session pooler connection string (port 5432)
2. TypeScript: add "downlevelIteration": true to tsconfig.json
3. Scoring engine is a separate pure-function module — no DB imports
4. All API routes as Next.js App Router route handlers
5. For MVP: manual tournament/golfer management via admin. Auto-sync is phase 2
6. Keep the code clean and well-organized — Jacob will want to iterate on this

## File Structure
```
src/
  app/
    api/
      auth/
      tournaments/
      picks/
      standings/
      leagues/
      admin/
    (pages)/
      dashboard/
      picks/
      standings/
      tournament/
      leagues/
      rules/
      admin/
    layout.tsx
    page.tsx (landing/login)
  components/
    layout/
      Sidebar.tsx
      BottomNav.tsx
      Header.tsx
    picks/
      GolferCard.tsx
      PickSlot.tsx
      GolferSearch.tsx
    standings/
      StandingsTable.tsx
      WeeklyBreakdown.tsx
    tournament/
      TeamCard.tsx
      GolferRow.tsx
      LiveScoreboard.tsx
    ui/
      Button.tsx
      Input.tsx
      Card.tsx
      Modal.tsx
  lib/
    scoring.ts (pure scoring engine)
    auth.ts (session management)
    prisma.ts (prisma client singleton)
    utils.ts
  types/
    index.ts
prisma/
  schema.prisma
  seed.ts
```

## Phase 1 (MVP — build this now):
- Auth (register/login/logout)
- Create/join leagues
- Admin: manage tournaments and golfer fields
- Pick golfers for a tournament
- Live tournament view with team scores
- Standings page
- Rules page
- Mobile responsive

## Phase 2 (later):
- Automated golf data API integration
- Post-tournament recap emails
- Pick reminder emails
- Season history/archives
- Draft order tracking
